from fastapi import FastAPI, HTTPException, Request, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import uvicorn
import os
from svix.webhooks import Webhook, WebhookVerificationError
from dotenv import load_dotenv

from core.database import get_supabase
from api.analytics import router as analytics_router
load_dotenv()

app = FastAPI(title="CareerSathi API", description="AI Career Intelligence API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

CLERK_WEBHOOK_SECRET = os.getenv("CLERK_WEBHOOK_SECRET")

# --- Models ---
class ChatMessage(BaseModel):
    message: str

class UserSync(BaseModel):
    id: str
    email: str
    first_name: str = ""
    last_name: str = ""
    image_url: str = ""

class ProfileUpdate(BaseModel):
    title: Optional[str] = ""
    bio: Optional[str] = ""
    experience: Optional[str] = "0-1 years"
    skills: Optional[List[str]] = []
    resume_url: Optional[str] = ""


@app.get("/")
def read_root():
    return {"status": "ok", "message": "CareerSathi API is running"}


@app.post("/api/users/sync")
async def sync_user_direct(user: UserSync):
    """Sync Clerk user data into Supabase on every sign-in."""
    supabase = get_supabase()
    try:
        # Upsert the basic user row
        supabase.table("users").upsert({
            "id": user.id,
            "email": user.email,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "image_url": user.image_url
        }).execute()

        # Also create a blank profile row if one doesn't exist yet
        existing = supabase.table("profiles").select("id").eq("id", user.id).execute()
        if not existing.data:
            supabase.table("profiles").insert({"id": user.id}).execute()

        return {"status": "success", "message": "User synced!"}
    except Exception as e:
        print(f"Sync error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/profile/{user_id}")
async def get_profile(user_id: str):
    """Fetch a user's full profile (user + career data)."""
    supabase = get_supabase()
    try:
        user_res = supabase.table("users").select("*").eq("id", user_id).single().execute()
        profile_res = supabase.table("profiles").select("*").eq("id", user_id).single().execute()

        if not user_res.data:
            raise HTTPException(status_code=404, detail="User not found")

        # Merge user + profile into one response
        merged = {**user_res.data, **(profile_res.data or {})}
        return {"status": "success", "profile": merged}
    except HTTPException:
        raise
    except Exception as e:
        print(f"Get profile error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/profile/{user_id}")
async def update_profile(user_id: str, profile: ProfileUpdate):
    """Update a user's career profile in Supabase."""
    supabase = get_supabase()
    try:
        from datetime import datetime, timezone
        supabase.table("profiles").upsert({
            "id": user_id,
            "title": profile.title,
            "bio": profile.bio,
            "experience": profile.experience,
            "skills": profile.skills,
            "resume_url": profile.resume_url,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }).execute()
        return {"status": "success", "message": "Profile updated!"}
    except Exception as e:
        print(f"Update profile error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/profile/{user_id}/resume")
async def upload_resume(user_id: str, file: UploadFile = File(...)):
    """Upload a resume PDF/DOCX to Supabase Storage and save the URL to profiles."""
    ALLOWED = {"application/pdf", "application/msword",
               "application/vnd.openxmlformats-officedocument.wordprocessingml.document"}
    if file.content_type not in ALLOWED:
        raise HTTPException(status_code=400, detail="Only PDF and Word documents are allowed")

    MAX_SIZE = 5 * 1024 * 1024  # 5 MB
    contents = await file.read()
    if len(contents) > MAX_SIZE:
        raise HTTPException(status_code=400, detail="File too large (max 5 MB)")

    supabase = get_supabase()
    storage_path = f"{user_id}/{file.filename}"

    try:
        # Upload to Supabase Storage bucket "resumes"
        supabase.storage.from_("resumes").upload(
            path=storage_path,
            file=contents,
            file_options={"content-type": file.content_type, "upsert": "true"}
        )

        # Get public URL
        public_url = supabase.storage.from_("resumes").get_public_url(storage_path)

        # Save URL and filename into profiles
        from datetime import datetime, timezone
        supabase.table("profiles").upsert({
            "id": user_id,
            "resume_url": public_url,
            "resume_name": file.filename,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }).execute()

        return {"status": "success", "resume_url": public_url, "resume_name": file.filename}
    except Exception as e:
        print(f"Resume upload error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/profile/{user_id}/resume")
async def delete_resume(user_id: str):
    """Delete resume from Supabase Storage and clear URL from profile."""
    supabase = get_supabase()
    try:
        # Get current resume filename
        res = supabase.table("profiles").select("resume_name").eq("id", user_id).single().execute()
        if res.data and res.data.get("resume_name"):
            storage_path = f"{user_id}/{res.data['resume_name']}"
            supabase.storage.from_("resumes").remove([storage_path])

        # Clear resume fields in profile
        from datetime import datetime, timezone
        supabase.table("profiles").update({
            "resume_url": "",
            "resume_name": "",
            "updated_at": datetime.now(timezone.utc).isoformat()
        }).eq("id", user_id).execute()

        return {"status": "success", "message": "Resume deleted"}
    except Exception as e:
        print(f"Delete resume error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/webhooks/clerk")
async def clerk_webhook(request: Request):
    """Receives webhooks from Clerk (requires ngrok for local dev)."""
    if not CLERK_WEBHOOK_SECRET:
        raise HTTPException(status_code=500, detail="Clerk webhook secret not configured")

    headers = request.headers
    svix_id = headers.get("svix-id")
    svix_timestamp = headers.get("svix-timestamp")
    svix_signature = headers.get("svix-signature")

    if not svix_id or not svix_timestamp or not svix_signature:
        raise HTTPException(status_code=400, detail="Missing Svix headers")

    payload = await request.body()
    wh = Webhook(CLERK_WEBHOOK_SECRET)
    try:
        event = wh.verify(payload, headers)
    except WebhookVerificationError:
        raise HTTPException(status_code=400, detail="Invalid signature")

    event_type = event.get("type")
    data = event.get("data", {})
    supabase = get_supabase()

    if event_type in ("user.created", "user.updated"):
        user_id = data.get("id")
        emails = data.get("email_addresses", [])
        email = emails[0].get("email_address", "") if emails else ""
        try:
            supabase.table("users").upsert({
                "id": user_id, "email": email,
                "first_name": data.get("first_name", ""),
                "last_name": data.get("last_name", ""),
                "image_url": data.get("image_url", "")
            }).execute()
            existing = supabase.table("profiles").select("id").eq("id", user_id).execute()
            if not existing.data:
                supabase.table("profiles").insert({"id": user_id}).execute()
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
        return {"status": "success"}

    elif event_type == "user.deleted":
        user_id = data.get("id")
        supabase.table("users").delete().eq("id", user_id).execute()
        return {"status": "success"}

    return {"status": "ignored"}


@app.post("/api/chat")
async def chat_with_ai(chat: ChatMessage):
    msg = chat.message.lower()
    if 'job' in msg:
        return {"response": "Based on your profile, Machine Learning Engineer at NeuralTech AI is a great match!"}
    return {"response": "I am an AI assistant. Ask me about jobs or career advice!"}


@app.get("/api/jobs")
async def get_recommended_jobs():
    return {"jobs": [
        {"id": 1, "title": "Machine Learning Engineer", "match": 95},
        {"id": 2, "title": "Data Scientist", "match": 88}
    ]}


app.include_router(analytics_router, prefix="/api/analytics", tags=["Analytics"])

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
