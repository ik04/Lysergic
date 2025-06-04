import httpx
from fastapi import APIRouter, HTTPException
from bs4 import BeautifulSoup
from api.models.fetch_experience_request import FetchExperienceRequest
from api.utils.utils import check_experience_exists, fetch_experience_categories


router = APIRouter()



@router.post("/erowid/experiences/categories")
async def fetch_experiences(request: FetchExperienceRequest):
    """
    Fetch experiences for a given substance URL.
    Returns success status, whether experiences exist, and their categories.
    """
    has_experiences, more_url = await check_experience_exists(request.url)
    
    if has_experiences and more_url:
        categories = await fetch_experience_categories(more_url)
        return {
            "status": "success",
            "has_experiences": True,
            "experiences_url": more_url,
            "categories": categories
        }
    
    return {
        "status": "success",
        "has_experiences": has_experiences,
        "experiences_url": more_url if more_url else None,
        "categories": None
    }
# todo: with the experience links make two more functions, one fetches random experiences and other fetches the experience and its details