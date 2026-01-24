#!/usr/bin/env python3
"""
Match local foods to FoodData Central and populate fdc_id.

Usage:
  python scripts/match_fdc_ids.py \
    --csv-dir USDA/csv/FoodData_Central_csv_2025-12-18 \
    --limit 500 --dry-run
"""

import argparse
import csv
import os
import re
import json
import subprocess
import time
import math
from difflib import SequenceMatcher
from typing import Dict, Any, List, Tuple

try:
    from tqdm import tqdm
except ImportError:
    subprocess.check_call(['pip', 'install', 'tqdm', '-q'])
    from tqdm import tqdm

from supabase import create_client

ALLOWED_TYPES = {"foundation_food", "sr_legacy_food", "survey_fndds_food", "branded_food"}

def load_env():
    env_path = os.path.join(os.path.dirname(__file__), '..', 'web', '.env.local')
    if os.path.exists(env_path):
        with open(env_path, 'r') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#') and '=' in line:
                    key, value = line.split('=', 1)
                    os.environ.setdefault(key, value)

load_env()

SUPABASE_URL = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_KEY") or os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")
UPDATE_BATCH_SIZE = int(os.environ.get("FDC_MATCH_BATCH_SIZE", "100"))
MAX_RETRIES = int(os.environ.get("FDC_MATCH_MAX_RETRIES", "5"))
BACKOFF_BASE = float(os.environ.get("FDC_MATCH_BACKOFF", "1.5"))
MAX_CANDIDATES = int(os.environ.get("FDC_MATCH_MAX_CANDIDATES", "200"))
MAX_TOKEN_MATCHES = int(os.environ.get("FDC_MATCH_MAX_TOKEN_MATCHES", "5000"))


def create_supabase():
    return create_client(SUPABASE_URL, SUPABASE_KEY)


def normalize_name(value: str) -> str:
    val = (value or "").lower()
    val = re.sub(r"\(.*?\)", " ", val)
    val = re.sub(r"[^a-z0-9\\s]", " ", val)
    return " ".join(val.split())


def load_fdc_names(csv_dir: str) -> List[Dict[str, Any]]:
    foods_path = os.path.join(csv_dir, "food.csv")
    fdc_records: List[Dict[str, Any]] = []
    
    # Simple line count for progress bar
    try:
        total = sum(1 for _ in open(foods_path, 'rb'))
    except:
        total = None

    with open(foods_path, newline="", encoding="utf-8", errors="ignore") as f:
        reader = csv.DictReader(f)
        for row in tqdm(reader, total=total, desc="📂 Loading FDC names", unit="rows"):
            if row.get("data_type") not in ALLOWED_TYPES:
                continue
            desc = row.get("description") or ""
            norm = normalize_name(desc)
            if not norm:
                continue
            fdc_records.append({
                "fdc_id": row["fdc_id"],
                "description": desc,
                "normalized": norm,
                "data_type": row.get("data_type")
            })
    return fdc_records


def build_token_index(records: List[Dict[str, Any]]) -> Dict[str, List[int]]:
    index: Dict[str, List[int]] = {}
    for idx, rec in enumerate(records):
        tokens = rec["normalized"].split()
        if not tokens:
            continue
        # Index all significant tokens (longer than 2 chars)
        unique_tokens = set(t for t in tokens if len(t) > 2)
        for token in unique_tokens:
            index.setdefault(token, []).append(idx)
    return index


def score_match(a: str, b: str) -> float:
    return SequenceMatcher(None, a, b).ratio()


def choose_best(local_norm: str, candidates: List[Dict[str, Any]]) -> Tuple[float, Dict[str, Any]]:
    best_score = 0.0
    best = None
    # Limit candidates to avoid slow checks
    for rec in candidates[:MAX_CANDIDATES]:
        score = score_match(local_norm, rec["normalized"])
        if rec["data_type"] == "foundation_food":
            score += 0.02
        elif rec["data_type"] == "sr_legacy_food":
            score += 0.01
        if score > best_score:
            best_score = score
            best = rec
    return best_score, best


def match_food(local: Dict[str, Any], records: List[Dict[str, Any]], index: Dict[str, List[int]]) -> Tuple[float, Dict[str, Any]]:
    names = [local.get("name") or "", local.get("name_es") or ""]
    best_score = 0.0
    best_rec = None

    for name in names:
        local_norm = normalize_name(name)
        if not local_norm or len(local_norm) < 3:
            continue
        tokens = [t for t in local_norm.split() if len(t) > 2]

        # Gather candidates with simple token-frequency ranking
        token_matches = []
        for token in tokens:
            matches = index.get(token)
            if matches:
                token_matches.append((token, matches))

        if not token_matches:
            continue

        candidate_scores: Dict[int, float] = {}
        for _, matches in token_matches:
            if len(matches) > MAX_TOKEN_MATCHES:
                continue
            weight = 1.0 / math.log(2 + len(matches))
            for idx in matches:
                candidate_scores[idx] = candidate_scores.get(idx, 0.0) + weight

        if not candidate_scores:
            # Fallback: use the most specific token available
            token, matches = min(token_matches, key=lambda item: len(item[1]))
            weight = 1.0 / math.log(2 + len(matches))
            for idx in matches:
                candidate_scores[idx] = candidate_scores.get(idx, 0.0) + weight

        local_len = len(local_norm)
        ranked_ids = sorted(
            candidate_scores.items(),
            key=lambda kv: (-kv[1], abs(len(records[kv[0]]["normalized"]) - local_len))
        )
        candidates = [records[i] for i, _ in ranked_ids[:MAX_CANDIDATES]]
        score, rec = choose_best(local_norm, candidates)
        if score > best_score:
            best_score, best_rec = score, rec

    return best_score, best_rec


def safe_json_load(value: Any) -> Dict[str, Any]:
    if not value:
        return {}
    if isinstance(value, dict):
        return value
    if isinstance(value, str):
        try:
            return json.loads(value)
        except json.JSONDecodeError:
            return {}
    return {}


def safe_fetch_batch(supabase, last_id: int):
    for attempt in range(MAX_RETRIES):
        try:
            return (
                supabase.table("foods")
                .select("id, name, name_es, category, fdc_id, data_quality_flags")
                .gt("id", last_id)
                .is_("fdc_id", "null")
                .order("id")
                .limit(200)
                .execute()
            ), supabase
        except Exception as exc:
            if attempt == MAX_RETRIES - 1:
                raise
            time.sleep(BACKOFF_BASE ** attempt)
            supabase = create_supabase()
    return None, supabase


def safe_update_rows(supabase, rows: List[Dict[str, Any]]):
    ok = 0
    errors = 0
    for row in rows:
        payload = {k: v for k, v in row.items() if k != "id"}
        for attempt in range(MAX_RETRIES):
            try:
                result = (
                    supabase.table("foods")
                    .update(payload)
                    .eq("id", row["id"])
                    .execute()
                )
                if getattr(result, "error", None):
                    raise RuntimeError(result.error)
                ok += 1
                break
            except Exception as exc:
                if attempt == MAX_RETRIES - 1:
                    errors += 1
                    tqdm.write(f"⚠️ Update failed (id={row.get('id')}): {exc}")
                else:
                    time.sleep(BACKOFF_BASE ** attempt)
                    supabase = create_supabase()
    return ok, errors, supabase


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--csv-dir", required=True)
    parser.add_argument("--limit", type=int, default=500)
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument("--min-score", type=float, default=0.88)
    args = parser.parse_args()

    if not SUPABASE_URL or not SUPABASE_KEY:
        print(f"❌ Missing Supabase credentials. Tried loading from: {os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'web', '.env.local'))}")
        # Also print current env vars keys to see if anything loaded
        # print(f"Env keys: {list(os.environ.keys())}")
        sys.exit(1)
    supabase = create_supabase()

    records = load_fdc_names(args.csv_dir)
    index = build_token_index(records)
    print(f"Loaded {len(records)} FDC records for matching.")

    # Fetch local foods without fdc_id
    results = []
    last_id = 0
    while len(results) < args.limit:
        batch, supabase = safe_fetch_batch(supabase, last_id)
        if not batch.data:
            break
        results.extend(batch.data)
        last_id = batch.data[-1]["id"]

    updates = 0
    errors = 0
    foods_to_match = results[: args.limit]
    
    pending_updates: List[Dict[str, Any]] = []
    for food in tqdm(foods_to_match, desc="🔗 Matching foods", unit="food"):
        score, rec = match_food(food, records, index)
        if not rec or score < args.min_score:
            continue
        if not args.dry_run:
            flags = safe_json_load(food.get("data_quality_flags"))
            flags.update({
                "fdc_match_confidence": round(score, 3),
                "fdc_match_method": "name_fuzzy",
                "fdc_match_description": rec["description"],
                "fdc_match_data_type": rec["data_type"]
            })
            pending_updates.append({
                "id": food["id"],
                "fdc_id": rec["fdc_id"],
                "data_quality_flags": json.dumps(flags)
            })
            if len(pending_updates) >= UPDATE_BATCH_SIZE:
                ok_count, err_count, supabase = safe_update_rows(supabase, pending_updates)
                updates += ok_count
                errors += err_count
                pending_updates = []
        if args.dry_run:
            updates += 1

    if pending_updates and not args.dry_run:
        ok_count, err_count, supabase = safe_update_rows(supabase, pending_updates)
        updates += ok_count
        errors += err_count

    if args.dry_run:
        print(f"\n✅ Matched {updates} foods (dry_run=True).")
        return

    print(f"\n✅ Matched {updates} foods, {errors} errors (dry_run={args.dry_run}).")


if __name__ == "__main__":
    main()
