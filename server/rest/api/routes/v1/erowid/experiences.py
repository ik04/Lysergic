import httpx
from fastapi import APIRouter, HTTPException
from bs4 import BeautifulSoup, NavigableString, Tag
from api.models.fetch_experience_request import FetchExperienceRequest
from api.models.fetch_experience_details_request import FetchExperienceDetailsRequest
from api.models.fetch_category_experiences_request import FetchCategoryExperiencesRequest
from api.models.fetch_random_experiences_request import FetchRandomExperiencesRequest
from api.utils.utils import check_experience_exists, fetch_experience_categories, fetch_paginated_experiences, logger
import random
import asyncio
from typing import List
import re
import base64

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
    Fetch details of a specific Erowid experience.
    Normalises content by converting <br>, <p>, and other tags to clean new‑line text.
    """
    async with httpx.AsyncClient(verify=False, timeout=30.0) as client:
        response = await client.get(request.url)
        response.encoding = 'utf-8'
        if response.status_code != 200:
            raise HTTPException(status_code=404, detail="Experience not found")

        soup = BeautifulSoup(response.text, "html.parser")

        title = (soup.find("div", class_="title") or Tag()).get_text(strip=True) or None
        author = (
            soup.find("div", class_="author").find("a").get_text(strip=True)
            if soup.find("div", class_="author") and soup.find("div", class_="author").find("a")
            else None
        )
        substances = (
            soup.find("div", class_="substance").get_text(strip=True)
            if soup.find("div", class_="substance")
            else None
        )

        doses = []
        dosechart = soup.find("table", class_="dosechart")
        if dosechart:
            for row in dosechart.find_all("tr"):
                amount_cell = row.find("td", class_="dosechart-amount")
                method_cell = row.find("td", class_="dosechart-method")
                substance_cell = row.find("td", class_="dosechart-substance")
                form_cell = row.find("td", class_="dosechart-form")

                dose = {
                    "amount": amount_cell.get_text(strip=True) if amount_cell else None,
                    "method": method_cell.get_text(strip=True) if method_cell else None,
                    "substance": substance_cell.get_text(strip=True) if substance_cell else None,
                    "form": form_cell.get_text(strip=True) if form_cell else None,
                }

                if any(dose.values()):
                    doses.append(dose)
        metadata = {}
        footdata = soup.find("table", class_="footdata")
        if footdata:
            for cell in footdata.find_all("td"):
                txt = cell.get_text(strip=True)
                if txt.startswith("Gender:"):
                    metadata["gender"] = txt.replace("Gender:", "").strip()
                elif txt.startswith("Age"):
                    metadata["age"] = txt.replace("Age at time of experience:", "").strip()
                elif txt.startswith("Published:"):
                    metadata["published"] = txt.replace("Published:", "").strip()
                elif txt.startswith("Views:"):
                    metadata["views"] = txt.replace("Views:", "").strip()
                elif txt.startswith("ExpID:"):
                    metadata["exp_id"] = txt.replace("ExpID:", "").strip()
                elif "topic-list" in cell.get("class", []):
                    metadata["topics"] = txt

        content_div = soup.find("div", class_="report-text-surround")
        cleaned_text = None

        if content_div:
            for tbl in content_div.find_all("table"):
                tbl.decompose()

            for br in content_div.find_all("br"):
                br.replace_with("\n")

            raw_text = content_div.get_text(separator="\n", strip=True)

            cleaned_text = re.sub(r"\n{2,}", "\n\n", raw_text)

        return {
            "status": "success",
            "data": {
                "url": request.url,
                "title": title,
                "author": author,
                "substance": substances,
                "doses": doses,
                "content": cleaned_text,
                "metadata": metadata,
            },
        }
@router.post("/erowid/random/experiences")
async def fetch_random_experiences(request: FetchRandomExperiencesRequest, size_per_substance: int = 1):
    """
    Fetch random experiences from multiple substances.
    Takes 4 random substance URLs and returns random experiences from random categories.
    """
    logger.info(f"Starting random experiences fetch with {len(request.urls)} substances")
    logger.info(f"Requested size per substance: {size_per_substance}")
    
    substance_urls = request.urls if isinstance(request.urls, list) else [request.urls]
    if len(substance_urls) > 4:
        substance_urls = random.sample(substance_urls, 4)
    logger.info(f"Selected random substances: {substance_urls}")
    
    async def process_substance(url: str) -> List[dict]:
        logger.info(f"Processing substance URL: {url}")
        try:
            has_experiences, experiences_url = await check_experience_exists(url)
            if not has_experiences or not experiences_url:
                logger.warning(f"No experiences found for substance: {url}")
                return []
                
            categories = await fetch_experience_categories(experiences_url)
            if not categories:
                logger.warning(f"No categories found for substance: {url}")
                return []
            
            category_list = list(categories.values())
            selected_category = random.choice(category_list)
            logger.info(f"Selected category for {url}: {selected_category['name']} "
                       f"(total experiences: {selected_category['experience_count']})")
            total_experiences = selected_category["experience_count"]
            if total_experiences <= size_per_substance:
                start = 0
            else:
                max_start = total_experiences - size_per_substance
                start = random.randint(0, max_start)
            
            logger.info(f"Fetching experiences from position {start} "
                       f"(max: {size_per_substance}) for category: {selected_category['name']}")
            
            print(selected_category["url"])
            experiences = await fetch_paginated_experiences(
                selected_category["url"],  
                start=start,
                max=size_per_substance
            )
            
            result = experiences.get("experiences", [])
            logger.info(f"Retrieved {len(result)} experiences for {url}")
            return result
            
        except Exception as e:
            logger.error(f"Error processing substance {url}: {str(e)}", exc_info=True)
            return []

    logger.info("Starting concurrent processing of substances")
    tasks = [process_substance(url) for url in substance_urls]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    
    experiences_feed = []
    for idx, result in enumerate(results):
        if isinstance(result, Exception):
            logger.error(f"Failed to process substance {substance_urls[idx]}: {str(result)}")
        elif isinstance(result, list):
            experiences_feed.extend(result)
            
    random.shuffle(experiences_feed)
    
    logger.info(f"Final feed contains {len(experiences_feed)} experiences")
    
    return {
        "success": True,
        "total": len(experiences_feed),
        "feed": experiences_feed
    }

@router.get("/erowid/user/{username}")
async def fetch_user_experiences(username: str):
    """
    Fetch all experiences for a given Erowid username.
    """
    url = f"https://www.erowid.org/experiences/exp.cgi?A=Search&AuthorSearch={username}&Exact=1"
    logger.info(f"Fetching user experiences for username: {username} from {url}")

    try:
        async with httpx.AsyncClient(verify=False, timeout=30.0) as client:
            response = await client.get(url)
            response.raise_for_status()
            soup = BeautifulSoup(response.text, 'html.parser')

            exp_table = soup.find('table', class_='exp-list-table')
            if not exp_table:
                logger.warning(f"No experience table found for user: {username}")
                return {"success": True, "experiences": []}

            experiences = []
            exp_rows = exp_table.find_all('tr', class_='exp-list-row')
            for row in exp_rows:
                try:
                    title_cell = row.find('td', class_='exp-title')
                    if not title_cell or not title_cell.find('a'):
                        continue
                    title = title_cell.find('a').text
                    exp_url = f"https://erowid.org{title_cell.find('a')['href']}"

                    author_cell = row.find('td', class_='exp-author')
                    author = author_cell.text.strip() if author_cell else None

                    substance_cell = row.find('td', class_='exp-substance')
                    substance = substance_cell.text.strip() if substance_cell else None

                    date_cell = row.find('td', class_='exp-pubdate')
                    date = date_cell.text.strip() if date_cell else None

                    experiences.append({
                        "title": title,
                        "url": exp_url,
                        "author": author,
                        "substance": substance,
                        "date": date
                    })
                except Exception as e:
                    logger.error(f"Error parsing row for user {username}: {str(e)}")
                    continue

            logger.info(f"Found {len(experiences)} experiences for user: {username}")
            return {
                "success": True,
                "experiences": experiences
            }
    except Exception as e:
        logger.error(f"Error fetching experiences for user {username}: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to fetch user experiences: {str(e)}")

@router.post("/erowid/random/experience")
async def fetch_random_experience(request: FetchRandomExperiencesRequest, size_per_substance: int = 1):
    """
    Fetch a random experience from multiple substances.
    Takes 4 random substance URLs and returns random experiences from random categories.
    """
    logger.info(f"Starting random experiences fetch with {len(request.urls)} substances")
    logger.info(f"Requested size per substance: {size_per_substance}")
    
    substance_urls = request.urls if isinstance(request.urls, list) else [request.urls]
    if len(substance_urls) > 4:
        substance_urls = random.sample(substance_urls, 1)
    logger.info(f"Selected random substances: {substance_urls}")
    
    async def process_substance(url: str) -> List[dict]:
        logger.info(f"Processing substance URL: {url}")
        try:
            has_experiences, experiences_url = await check_experience_exists(url)
            if not has_experiences or not experiences_url:
                logger.warning(f"No experiences found for substance: {url}")
                return []
                
            categories = await fetch_experience_categories(experiences_url)
            if not categories:
                logger.warning(f"No categories found for substance: {url}")
                return []
            
            category_list = list(categories.values())
            selected_category = random.choice(category_list)
            logger.info(f"Selected category for {url}: {selected_category['name']} "
                       f"(total experiences: {selected_category['experience_count']})")
            total_experiences = selected_category["experience_count"]
            if total_experiences <= size_per_substance:
                start = 0
            else:
                max_start = total_experiences - size_per_substance
                start = random.randint(0, max_start)
            
            logger.info(f"Fetching experiences from position {start} "
                       f"(max: {size_per_substance}) for category: {selected_category['name']}")
            
            print(selected_category["url"])
            experiences = await fetch_paginated_experiences(
                selected_category["url"],  
                start=start,
                max=size_per_substance
            )
            
            result = experiences.get("experiences", [])
            logger.info(f"Retrieved {len(result)} experiences for {url}")
            return result
            
        except Exception as e:
            logger.error(f"Error processing substance {url}: {str(e)}", exc_info=True)
            return []

    logger.info("Starting concurrent processing of substances")
    tasks = [process_substance(url) for url in substance_urls]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    
    experiences_feed = []
    for idx, result in enumerate(results):
        if isinstance(result, Exception):
            logger.error(f"Failed to process substance {substance_urls[idx]}: {str(result)}")
        elif isinstance(result, list):
            experiences_feed.extend(result)

    logger.info(f"Total collected experiences: {len(experiences_feed)}")
    selected_experience = random.choice(experiences_feed) if experiences_feed else None

    return {
        "success": bool(selected_experience),
        "experience": selected_experience
    }