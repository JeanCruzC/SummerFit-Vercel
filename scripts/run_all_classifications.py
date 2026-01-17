#!/usr/bin/env python3
"""
Run All Classifications - Wrapper Script
Executes classify_food_tiers.py in a loop until all foods are classified.

Handles Supabase's 1000 row limit by querying repeatedly.
"""

import subprocess
import sys
import os
from pathlib import Path
from datetime import datetime
from supabase import create_client
from dotenv import load_dotenv

# Setup
script_dir = Path(__file__).parent.parent
env_file = script_dir / "web" / ".env.local"
load_dotenv(env_file)

SUPABASE_URL = os.getenv("NEXT_PUBLIC_SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)


def count_unclassified() -> int:
    """Count foods with food_tier=null."""
    result = supabase.table("foods").select("id", count="exact").is_("food_tier", "null").execute()
    return result.count or 0


def run_classification():
    """Run the classification script."""
    # Clear checkpoint for fresh start each round
    checkpoint_file = script_dir / "logs" / "tier_checkpoint.json"
    if checkpoint_file.exists():
        checkpoint_file.unlink()
    
    # Run the classifier
    result = subprocess.run(
        [sys.executable, str(script_dir / "scripts" / "classify_food_tiers.py")],
        cwd=str(script_dir),
        capture_output=False
    )
    return result.returncode == 0


def main():
    print("=" * 60)
    print("🍎 FULL CLASSIFICATION RUNNER")
    print("=" * 60)
    
    start_time = datetime.now()
    round_num = 0
    total_classified = 0
    
    while True:
        round_num += 1
        unclassified = count_unclassified()
        
        print(f"\n🔄 Round {round_num}: {unclassified} foods remaining")
        
        if unclassified == 0:
            print("✅ All foods classified!")
            break
        
        # Record before count
        before_count = unclassified
        
        # Run classification
        print(f"   Starting classification of up to 1000 foods...")
        success = run_classification()
        
        if not success:
            print("❌ Classification failed. Check logs.")
            break
        
        # Calculate how many were classified
        after_count = count_unclassified()
        classified_this_round = before_count - after_count
        total_classified += classified_this_round
        
        print(f"   ✅ Classified {classified_this_round} foods this round")
        print(f"   📊 Total classified so far: {total_classified}")
    
    # Final summary
    elapsed = datetime.now() - start_time
    print("\n" + "=" * 60)
    print("📊 FINAL SUMMARY")
    print("=" * 60)
    print(f"   Rounds: {round_num}")
    print(f"   Total Classified: {total_classified}")
    print(f"   Time: {elapsed}")
    print("=" * 60)


if __name__ == "__main__":
    main()
