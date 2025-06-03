from fastapi import APIRouter
import requests
from bs4 import BeautifulSoup
from typing import Dict, List
from functools import lru_cache

router = APIRouter()

links = {
    "psychoactive": "https://www.erowid.org/psychoactives/psychoactives.shtml",
}

def parse_dropdown_options(select: BeautifulSoup, category: str) -> List[Dict]:
    substances = []
    for option in select.find_all('option'):
        url = option.get('value', '')
        name = option.text.strip()
        
        # Skip dividers and headers
        if url == '#' or name.startswith('-') or name in ['Common Psychoactives', 'Main Index', 'Big Chart']:
            continue
            
        substances.append({
            "name": name,
            "url": f"https://www.erowid.org{url}" if url.startswith('/') else url,
            "category": category
        })
    
    return substances

@router.get("/erowid/substances")
@lru_cache(maxsize=1)
async def get_substances():
    """
    Fetches and categorizes substances from Erowid.
    Cached indefinitely using lru_cache.
    """
    url = links['psychoactive']
    response = requests.get(url, verify=False)
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
        "total_substances": sum(len(substances) for substances in categories.values()),
        "cached": True
    }

# TODO protect endpoint with middleware
# @router.post("/erowid/clear-cache")
# async def clear_substances_cache():
#     get_substances.cache_clear()
#     return {"status": "success", "message": "Cache cleared"}