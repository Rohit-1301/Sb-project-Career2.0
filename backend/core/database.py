import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

# We use the Service Key to bypass RLS when inserting webhooks from the backend
def get_supabase() -> Client:
    if not SUPABASE_URL or not SUPABASE_SERVICE_KEY:
        raise Exception("Supabase credentials missing in .env")
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
