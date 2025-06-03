import httpx
from fastapi import APIRouter, HTTPException
from bs4 import BeautifulSoup
from api.models.fetch_experience_request import FetchExperienceRequest


router = APIRouter()

async def check_experience_exists(url: str) -> tuple[bool, str]:
    """
    Check if a substance has experience reports and return the "MORE" link
    Returns: (has_experiences: bool, more_url: str)
    """
    try:
        if not url or not url.startswith('https://www.erowid.org'):
            raise ValueError("Invalid Erowid URL")

        async with httpx.AsyncClient(verify=False, timeout=30.0) as client:
            response = await client.get(url)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.text, 'html.parser')
            links_lists = soup.find_all('div', class_='links-list')
            
            for links_list in links_lists:
                ish_div = links_list.find('div', class_='ish')
                if ish_div and 'EXPERIENCES' in ish_div.text:
                    experience_links = links_list.find_all('div', class_='link-int')
                    
                    if len(experience_links) == 1 and 'Submit' in experience_links[0].text:
                        return False, ""
                        
                    more_div = links_list.find('div', class_='more')
                    if more_div and more_div.find('a'):
                        more_url = more_div.find('a').get('href')
                        if more_url:
                            return True, f"https://www.erowid.org{more_url}"
                    return True, ""
            
            return False, ""

    except ValueError as e:
        raise HTTPException(
            status_code=400,
            detail=str(e)
        )
    except httpx.TimeoutException:
        raise HTTPException(
            status_code=504,
            detail="Request to Erowid timed out"
        )
    except httpx.HTTPError as e:
        raise HTTPException(
            status_code=502,
            detail=f"Error fetching data from Erowid: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )

@router.post("/erowid/experiences/")
async def fetch_experiences(request: FetchExperienceRequest):
    """
    Fetch experiences for a given substance URL.
    Returns success status, whether experiences exist, and the URL for more experiences if available.
    """
    has_experiences, more_url = await check_experience_exists(request.url)
    # TODO - use the more link to get access to all category of experiences
    # TODO - use the categorical experiences to get the links of the experiences and also the experience details
    
    return {
        "status": "success",
        "has_experiences": has_experiences,
        "experiences_url": more_url if more_url else None
    }
