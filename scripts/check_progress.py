
import os
from supabase import create_client, Client

# Load env manually
env_path = os.path.join(os.getcwd(), 'web', '.env.local')
if os.path.exists(env_path):
    with open(env_path, 'r') as f:
        for line in f:
            if '=' in line and not line.startswith('#'):
                key, val = line.strip().split('=', 1)
                os.environ[key] = val.strip('"\'')

url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
key = os.environ.get("SUPABASE_SERVICE_KEY")

if not url or not key:
    print("Error: Credentials not found in web/.env.local")
    exit(1)

supabase = create_client(url, key)

# Get count of total vs classified
try:
    total = supabase.table("foods").select("id", count="exact").execute().count
    classified = supabase.table("foods").select("id", count="exact").not_.is_("ai_confidence", "null").execute().count
    
    print(f"Total Foods: {total}")
    print(f"Classified: {classified}")
except Exception as e:
    print(f"Error querying DB: {e}")
