import httpx
from fastapi import APIRouter, HTTPException
from bs4 import BeautifulSoup
from api.models.fetch_experience_request import FetchExperienceRequest
from api.models.fetch_experience_details_request import FetchExperienceDetailsRequest
from api.models.fetch_category_experiences_request import FetchCategoryExperiencesRequest
from api.utils.utils import check_experience_exists, fetch_experience_categories


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
    try:
        base_url = request.url.split('?')[0]
        category_id = request.url.split('S=')[1].split('&')[0] if 'S=' in request.url else None
        
        if not category_id:
            raise HTTPException(status_code=400, detail="Invalid category URL")
            
        paginated_url = f"{base_url}?S={category_id}&C=1&ShowViews=0&Cellar=0&Start={start}&Max={max}"
        
        async with httpx.AsyncClient(verify=False, timeout=30.0) as client:
            response = await client.get(paginated_url)
            if response.status_code != 200:
                raise HTTPException(status_code=404, detail="Experience category not found")
            
            soup = BeautifulSoup(response.text, 'html.parser')
            
            total_text = soup.find('div', class_='exp-list-page-title-sub')
            total_count = int(total_text.text.strip('()').split()[0]) if total_text else 0
            
            experiences = []
            exp_rows = soup.find_all('tr', class_='exp-list-row')
            
            for row in exp_rows:
                rating_img = row.find('img', alt=True)
                rating = rating_img['alt'] if rating_img else "Unrated"
                
                title_cell = row.find('td', class_='exp-title')
                if title_cell and title_cell.find('a'):
                    title = title_cell.find('a').text
                    exp_url = f"https://erowid.org{title_cell.find('a')['href']}"
                else:
                    continue
                    
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
                    "rating": rating,
                    "date": date
                })

            current_page = (start // max) + 1
            total_pages = (total_count + max - 1) // max
            
            next_start = start + max if start + max < total_count else None
            
            pagination = {
                "current_page": current_page,
                "total_pages": total_pages,
                "has_next": next_start is not None,
                # Update next_url to point to our API endpoint
                "next_url": f"/erowid/category/experiences?start={next_start}&max={max}" if next_start else None,
                "experiences_per_page": max,
                "total_experiences": total_count,
                "current_start": start
            }

            return {
                "status": "success",
                "experiences": experiences,
                "pagination": pagination
            }
            
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Request timed out")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    
    
# todo: with the experience links make two more functions, one fetches random experiences and other fetches the experience and its details

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

        # Extract footer metadata
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