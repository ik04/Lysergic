from fastapi import APIRouter, HTTPException


router = APIRouter()
@router.get("/erowid/experiences/{substance_name}")
async def fetch_experiences():
    print("Fetching experiences from Erowid...")
