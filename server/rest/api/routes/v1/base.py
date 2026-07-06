from fastapi import APIRouter, HTTPException
from api.utils.cookie_manager import refresh as refresh_cookie

router = APIRouter()

@router.get("/")
async def root():
    return {"message": "Welcome to Lysergic API V1"}

@router.post("/erowid/refresh-cookie")
async def refresh_cf_clearance():
    try:
        await refresh_cookie()
        return {"success": True, "message": "cf_clearance refreshed"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))