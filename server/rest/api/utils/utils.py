import httpx
from fastapi import APIRouter, HTTPException
from bs4 import BeautifulSoup

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
    Returns: Dictionary with category names, URLs and experience counts
    """
    try:
        async with httpx.AsyncClient(verify=False, timeout=30.0) as client:
            response = await client.get(url)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.text, 'html.parser')
            categories = {}
            
            category_headers = soup.find_all('td', bgcolor='#002C00')
            
            for header in category_headers:
                row = header.find_parent('tr')
                if not row:
                    continue
                
                # Get category link and name
                category_link = row.find('a', {'href': True})
                if not category_link:
                    continue
                
                category_name = category_link.find('u').text.strip()
                category_url = f"https://www.erowid.org/experiences/subs/{category_link['href']}"
                
                # Get experience count from third b tag within []
                count_cells = row.find_all('b')
                exp_count = 0
                if len(count_cells) >= 3:  # Check if we have at least 3 b tags
                    count_text = count_cells[2].text.strip('[]')  # Get third b tag
                    try:
                        exp_count = int(count_text)
                    except ValueError:
                        exp_count = 0
                
                categories[category_name] = {
                    "name": category_name,
                    "url": category_url,
                    "experience_count": exp_count
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


async def fetch_paginated_experiences(url: str, start: int = 0, max: int = 100) -> dict:
    """
    Fetch and parse paginated experiences from Erowid
    Args:
        url: Base URL for the experience list
        start: Starting index for pagination
        max: Maximum results per page
    Returns:
        dict containing experiences list and pagination info
    """
    try:
        async with httpx.AsyncClient(verify=False, timeout=30.0) as client:
            response = await client.get(url)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.text, 'html.parser')
            
            pages_table = soup.find('table', class_='results-table')
            if not pages_table:
                raise ValueError("Could not find results table")
                
            next_button = pages_table.find_all('td')[-1].find('a', href=True)
            if next_button:
                next_url = next_button['href']
                base_url = next_url.split('?')[0]
                params = {p.split('=')[0]: p.split('=')[1] 
                         for p in next_url.split('?')[1].split('&')}
                
                category_id = params.get('S')
            else:
                raise ValueError("Could not find pagination links")

            if not category_id:
                raise ValueError("Invalid category URL - missing category ID") 

            paginated_url = f"https://erowid.org{base_url}?S={category_id}&C=1&ShowViews=0&Cellar=0&Start={start}&Max={max}"
            
            response = await client.get(paginated_url)
            response.raise_for_status()
            
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

            next_start = start + max if start + max < total_count else None
            
            pagination = {
                "current_page": (start // max) + 1,
                "total_pages": (total_count + max - 1) // max,
                "has_next": next_start is not None,
                "next_url": f"/erowid/category/experiences?start={next_start}&max={max}" if next_start else None,
                "experiences_per_page": max,
                "total_experiences": total_count,
                "current_start": start,
                "base_url": f"{url}",
                "category_id": category_id
            }

            return {
                "experiences": experiences,
                "pagination": pagination
            }

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Request timed out")
    except httpx.HTTPError as e:
        raise HTTPException(status_code=502, detail=f"Error fetching from Erowid: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing experiences: {str(e)}")