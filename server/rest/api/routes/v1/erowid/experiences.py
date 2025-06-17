import httpx
from fastapi import APIRouter, HTTPException
from bs4 import BeautifulSoup
from api.models.fetch_experience_request import FetchExperienceRequest
from api.models.fetch_experience_details_request import FetchExperienceDetailsRequest
from api.models.fetch_category_experiences_request import FetchCategoryExperiencesRequest
from api.models.fetch_random_experiences_request import FetchRandomExperiencesRequest
from api.utils.utils import check_experience_exists, fetch_experience_categories, fetch_paginated_experiences, logger
import random
import asyncio
from typing import List






router = APIRouter()

@router.post("/erowid/experiences/categories")
async def fetch_substance_categories(request: FetchExperienceRequest):
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

@router.post("/erowid/category/experiences")
async def fetch_category_experiences(request: FetchCategoryExperiencesRequest, start: int = 0, max: int = 100):
    """
    Fetch experiences from a category page and handle pagination.
    Args:
        request: Contains the base URL for the category
        start: Starting index for pagination (default: 0)
        max: Maximum number of results per page (default: 100)
    """
    result = await fetch_paginated_experiences(request.url, start, max)
    return {
        "status": "success",
        **result
    }
    
@router.post("/erowid/experience")
async def fetch_experience_details(request: FetchExperienceDetailsRequest):
    """
    Fetch details of a specific experience from Erowid.
    Returns the experience title, content, author, date, substances and other metadata.
    """
    async with httpx.AsyncClient(verify=False, timeout=30.0) as client:
        response = await client.get(request.url)
        if response.status_code != 200:
            raise HTTPException(status_code=404, detail="Experience not found")
        
        soup = BeautifulSoup(response.text, 'html.parser')
        
        title = soup.find('div', class_='title').text.strip() if soup.find('div', class_='title') else None
        author = soup.find('div', class_='author').find('a').text.strip() if soup.find('div', class_='author') else None
        substances = soup.find('div', class_='substance').text.strip() if soup.find('div', class_='substance') else None

        doses = []
        dosechart = soup.find('table', class_='dosechart')
        if dosechart:
            for row in dosechart.find_all('tr'):
                amount = row.find('td', class_='dosechart-amount').text.strip() if row.find('td', class_='dosechart-amount') else None
                method = row.find('td', class_='dosechart-method').text.strip() if row.find('td', class_='dosechart-method') else None
                substance = row.find('td', class_='dosechart-substance').text.strip() if row.find('td', class_='dosechart-substance') else None
                form = row.find('td', class_='dosechart-form').text.strip() if row.find('td', class_='dosechart-form') else None
                
                if any([amount, method, substance, form]):
                    doses.append({
                        "amount": amount,
                        "method": method,
                        "substance": substance,
                        "form": form
                    })

        footdata = soup.find('table', class_='footdata')
        metadata = {}
        if footdata:
            for row in footdata.find_all('tr'):
                for cell in row.find_all('td'):
                    if 'Gender' in cell.text:
                        metadata['gender'] = cell.text.replace('Gender:', '').strip()
                    elif 'Age' in cell.text:
                        metadata['age'] = cell.text.replace('Age at time of experience:', '').strip()
                    elif 'Published' in cell.text:
                        metadata['published'] = cell.text.replace('Published:', '').strip()
                    elif 'Views' in cell.text:
                        metadata['views'] = cell.text.replace('Views:', '').strip()
                    elif 'ExpID' in cell.text:
                        metadata['exp_id'] = cell.text.replace('ExpID:', '').strip()
                    elif 'topic-list' in cell.get('class', []):
                        metadata['topics'] = cell.text.strip()

        content = soup.find('div', class_='report-text-surround')
        if content:
            for element in content.find_all(['table', 'br']):
                element.decompose()
            content = content.get_text(strip=True)

        return {
            "status": "success",
            "data": {
                "title": title,
                "author": author,
                "substances": substances,
                "doses": doses,
                "content": content,
                "metadata": metadata
            }
        }
@router.post("/erowid/random/experiences")
async def fetch_random_experiences(request: FetchRandomExperiencesRequest, size_per_substance: int = 1):
    """
    Fetch random experiences from multiple substances.
    Takes 4 random substance URLs and returns random experiences from random categories.
    """
    logger.info(f"Starting random experiences fetch with {len(request.urls)} substances")
    logger.info(f"Requested size per substance: {size_per_substance}")
    
    # Take 4 random substances
    substance_urls = request.urls if isinstance(request.urls, list) else [request.urls]
    if len(substance_urls) > 4:
        substance_urls = random.sample(substance_urls, 4)
    logger.info(f"Selected random substances: {substance_urls}")
    
    async def process_substance(url: str) -> List[dict]:
        logger.info(f"Processing substance URL: {url}")
        try:
            # First get the experiences URL
            has_experiences, experiences_url = await check_experience_exists(url)
            if not has_experiences or not experiences_url:
                logger.warning(f"No experiences found for substance: {url}")
                return []
                
            # Get categories directly from experiences URL
            categories = await fetch_experience_categories(experiences_url)
            if not categories:
                logger.warning(f"No categories found for substance: {url}")
                return []
            
            # Select random category - categories is already the dictionary of categories
            category_list = list(categories.values())
            selected_category = random.choice(category_list)
            logger.info(f"Selected category for {url}: {selected_category['name']} "
                       f"(total experiences: {selected_category['experience_count']})")
            # Calculate random start position
            total_experiences = selected_category["experience_count"]
            if total_experiences <= size_per_substance:
                start = 0
            else:
                max_start = total_experiences - size_per_substance
                start = random.randint(0, max_start)
            
            logger.info(f"Fetching experiences from position {start} "
                       f"(max: {size_per_substance}) for category: {selected_category['name']}")
            
            # Directly use fetch_paginated_experiences with the category URL
            print(selected_category["url"])
            experiences = await fetch_paginated_experiences(
                selected_category["url"],  # Use the URL directly from the category
                start=start,
                max=size_per_substance
            )
            
            result = experiences.get("experiences", [])
            logger.info(f"Retrieved {len(result)} experiences for {url}")
            return result
            
        except Exception as e:
            logger.error(f"Error processing substance {url}: {str(e)}", exc_info=True)
            return []

    # Process all substances concurrently
    logger.info("Starting concurrent processing of substances")
    tasks = [process_substance(url) for url in substance_urls]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    
    # Flatten and filter results
    experiences_feed = []
    for idx, result in enumerate(results):
        if isinstance(result, Exception):
            logger.error(f"Failed to process substance {substance_urls[idx]}: {str(result)}")
        elif isinstance(result, list):
            experiences_feed.extend(result)
            
    # Shuffle final feed
    random.shuffle(experiences_feed)
    
    logger.info(f"Final feed contains {len(experiences_feed)} experiences")
    
    return {
        "success": True,
        "total": len(experiences_feed),
        "feed": experiences_feed
    }