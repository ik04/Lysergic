from fastapi import APIRouter, Query, HTTPException
import httpx
from api.utils.utils import scrape_erowid_substance, clean_data

router = APIRouter()

@router.get("/erowid/information")
async def get_information(url: str):
    try:
        async with httpx.AsyncClient(verify=False, timeout=15) as client:
            resp = await client.get(url)
            resp.raise_for_status()
        info = scrape_erowid_substance(resp.text)
        info = clean_data(info, base_url=url)
        return {
            "success": True,
            "domain": "erowid.org",
            **info
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))