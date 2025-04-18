# backend/app/services/supabase_client.py
import os
from supabase import create_client, Client
from dotenv import load_dotenv

# Load .env from the root of the 'backend' directory
# Assumes structure: backend/app/services/supabase_client.py and backend/.env
dotenv_path = os.path.join(os.path.dirname(__file__), '..', '..', '.env')
load_dotenv(dotenv_path=dotenv_path)

supabase_url: str = os.environ.get("SUPABASE_URL")
supabase_key: str = os.environ.get("SUPABASE_KEY") # SERVICE_ROLE key

supabase: Client = None
if supabase_url and supabase_key:
    try:
        supabase = create_client(supabase_url, supabase_key)
        print("Successfully initialized Supabase client.")
    except Exception as e:
        print(f"CRITICAL ERROR: Error initializing Supabase client: {e}")
else:
    print("CRITICAL ERROR: Supabase URL or Key missing in environment variables.")

# Function to get the initialized client
def get_supabase_client():
    # Could add a check here to re-attempt init if supabase is None
    if not supabase:
        print("WARNING: Supabase client requested but not initialized!")
    return supabase