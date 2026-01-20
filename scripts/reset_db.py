#!/usr/bin/env python3
"""Reset food_tier column to NULL for fresh classification."""

import os
import sys
from dotenv import load_dotenv
import asyncio

# Load env
load_dotenv()

# Import Supabase
from supabase import create_client, Client

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ SUPABASE_URL or SUPABASE_KEY not set")
    sys.exit(1)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

async def reset_db():
    """Reset all food_tier values to NULL."""
    print("🔄 Resetting all food_tier values to NULL...")
    
    try:
        # Use rpc if available, or raw SQL
        result = supabase.table('foods').update(
            {"food_tier": None}
        ).eq("id", ">", 0).execute()
        
        print(f"✅ Reset successful!")
        print(f"   Updated rows: {len(result.data) if result.data else 'check logs'}")
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    asyncio.run(reset_db())
