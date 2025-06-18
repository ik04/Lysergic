from fastapi import APIRouter, HTTPException
import httpx
from bs4 import BeautifulSoup
from typing import Dict, List

router = APIRouter()

links = {
    "psychoactive": "https://www.erowid.org/psychoactives/psychoactives.shtml",
}

def parse_dropdown_options(select: BeautifulSoup, category: str) -> List[Dict]:
    substances = []
    for option in select.find_all('option'):
        url = option.get('value', '')
        name = option.text.strip()
        
        # Skip dividers, headers and "other" items
        if (url == '#' or 
            name.startswith('-') or 
            'other' in name.lower() or 
            name in ['Common Psychoactives', 'Main Index', 'Big Chart', 'Chemicals', 'Chemicals Index', 'Plants', 'Plants Index', 'Smart Drugs', 'Nootropics Index', 'Pharmaceuticals', 'Pharmaceuticals Index','Herbs','Herb Index']):
            continue
            
        substances.append({
            "name": name,
            "category": category,
            "info_url": f"https://www.erowid.org{url}" if url.startswith('/') else url,
        })
    
    return substances

@router.get("/erowid/substances")
async def get_substances():
    """
    Fetches and categorizes substances from Erowid.
    """
    url = links['psychoactive']
    
    try:
        timeout = httpx.Timeout(30.0, connect=60.0)
        async with httpx.AsyncClient(verify=False, timeout=timeout) as client:
            response = await client.get(url)
            response.raise_for_status()
            
        soup = BeautifulSoup(response.text, 'html.parser')
        
        categories = {}
        
        # Find all substance dropdowns
        dropdown_tables = soup.find_all('table', {'class': 'substance-menus'})
        for table in dropdown_tables:
            selects = table.find_all('select')
            
            for select in selects:
                first_option = select.find('option')
                if first_option:
                    category_name = first_option.text.lower()
                    # Clean up category name and use as key
                    clean_category = category_name.replace(' ', '_').strip()
                    if clean_category not in ['common_psychoactives']:
                        categories[clean_category] = parse_dropdown_options(select, category_name)
        
        return {
            "status": "success",
            "data": categories,
            "total_substances": sum(len(substances) for substances in categories.values())
        }

    except httpx.TimeoutException:
        raise HTTPException(
            status_code=504,
            detail="Request to Erowid timed out. Please try again later."
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
