
import os
import json
from supabase import create_client

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

url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
key = os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY")

supabase = create_client(url, key)

# Check Avocado and maybe one other
ids = [31638, 29934] # Avocado, Peanuts

data = supabase.table("foods").select("*").in_("id", ids).execute()

for item in data.data:
    print(f"ID: {item['id']} Name: {item['name']}")
    print(f"Columns: {list(item.keys())}")
