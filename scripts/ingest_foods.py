"""One-time ingestion script: 1 request to external API, then persist to Supabase."""
from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Sequence

from app.food_repository import fetch_foods_from_api, normalize_food_rows, read_foods, upsert_foods


def ingest_from_api() -> int:
    raw_rows = fetch_foods_from_api()
    normalized = normalize_food_rows(raw_rows)
    upsert_foods(normalized)
    return len(normalized)


def ingest_from_file(path: Path) -> int:
    raw_data = json.loads(path.read_text())
    normalized = normalize_food_rows(raw_data)
    upsert_foods(normalized)
    return len(normalized)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Ingest foods into Supabase")
    parser.add_argument(
        "--from-file",
        type=Path,
        help="Optional local JSON file to ingest instead of calling the external API",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    if args.from_file:
        count = ingest_from_file(args.from_file)
    else:
        count = ingest_from_api()

    persisted = read_foods(limit=count)
    print(f"Ingested {count} rows. Supabase now holds {len(persisted)} rows (queried).")


if __name__ == "__main__":
    main()
