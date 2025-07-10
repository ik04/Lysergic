from fastapi import APIRouter, HTTPException, Body
import httpx
from api.utils.utils import scrape_erowid_substance, clean_data

router = APIRouter()

@router.post("/erowid/information")
async def get_information(data: dict = Body(...)):
    url = data.get("url")
    if not url:
        raise HTTPException(status_code=400, detail="Missing 'url' in request body")
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