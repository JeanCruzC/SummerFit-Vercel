#!/bin/bash
set -e

# Ensure we are in the root
cd "$(dirname "$0")/.."

echo "🚀 Starting Full Data Completion..."

# 0) Ensure venv
if [ ! -d ".venv" ]; then
    echo "Creating venv..."
    python3 -m venv .venv
    .venv/bin/pip install tqdm supabase requests pandas
fi

# 1) Build Index
echo "📦 Building Official Index..."
.venv/bin/python scripts/build_official_fooddata_index.py \
  --csv-dir USDA/csv/FoodData_Central_csv_2025-12-18 \
  --out USDA/official_fooddata_index.json

# 2) Match IDs
echo "🔗 Matching FDC IDs..."
.venv/bin/python scripts/match_fdc_ids.py \
  --csv-dir USDA/csv/FoodData_Central_csv_2025-12-18 \
  --limit 10000

# 3) Completion
echo "🤖 Completing Data (AI Fallback)..."
export OFFICIAL_DATA_PATH=USDA/official_fooddata_index.json
export OPENAI_TIMEOUT=180
export OPENAI_MAX_RETRIES=7
export FOOD_COMPLETION_SCAN_ALL=1
export FOOD_COMPLETION_BATCH_SIZE=250

.venv/bin/python scripts/complete_food_data.py --limit 10000

# 4) Verification
echo "✅ Verifying Integrity..."
.venv/bin/python scripts/verify_integrity.py

echo "🎉 Done! All foods processed."
