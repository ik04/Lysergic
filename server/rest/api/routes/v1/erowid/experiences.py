import httpx
from fastapi import APIRouter, HTTPException
from bs4 import BeautifulSoup
from api.models.fetch_experience_request import FetchExperienceRequest
from api.models.fetch_experience_details_request import FetchExperienceDetailsRequest
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