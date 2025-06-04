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
    
async def fetch_experience_categories(url: str) -> dict:
    """
    Fetch and parse experience categories from the 'more' page
    Returns: Dictionary with category names and their details
    """
    try:
        async with httpx.AsyncClient(verify=False, timeout=30.0) as client:
            response = await client.get(url)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.text, 'html.parser')
            categories = {}
            
            # Find all category headers (td with bgcolor="#002C00")
            category_headers = soup.find_all('td', bgcolor='#002C00')
            
            for header in category_headers:
                # Get category row
                row = header.find_parent('tr')
                if not row:
                    continue
                
                # Find category name and link
                category_link = row.find('a', {'href': True})
                if not category_link:
                    continue
                
                category_name = category_link.find('u').text.strip()
                category_url = f"https://www.erowid.org/experiences/subs/{category_link['href']}"
                
                categories[category_name] = {
                    "name": category_name,
                    "url": category_url,
                }
            
            return categories

    except httpx.TimeoutException:
        raise HTTPException(
            status_code=504,
            detail="Request to Erowid timed out"
        )
    except httpx.HTTPError as e:
        raise HTTPException(
            status_code=502,
            detail=f"Error fetching categories: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error parsing categories: {str(e)}"
        )

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
