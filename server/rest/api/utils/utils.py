import httpx
from fastapi import APIRouter, HTTPException
from bs4 import BeautifulSoup
import logging


# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

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
    Handles both paginated and non-paginated pages
    """
    pagination_logger = logging.getLogger("erowid.pagination")
    try:
        async with httpx.AsyncClient(verify=False, timeout=30.0) as client:
            pagination_logger.info(f"Initial request to: {url}")
            response = await client.get(url)
            response.raise_for_status()

            soup = BeautifulSoup(response.text, 'html.parser')
            pagination_logger.debug("Parsing initial page")

            total_text = soup.find('div', class_='exp-list-page-title-sub')
            if not total_text:
                pagination_logger.error("Could not find experience count div")
                raise ValueError("Could not find experience count")

            total_count = int(total_text.text.strip('()').split()[0])
            pagination_logger.info(f"Total experiences found: {total_count}")

            exp_table = soup.find('table', class_='exp-list-table')
            if not exp_table:
                pagination_logger.error("Could not find experience table")
                raise ValueError("Could not find results table")

            next_button = soup.find('img', {'src': '/cgi-bin/search/images/buttonr.gif'})
            has_pagination = bool(next_button and next_button.find_parent('a'))

            pagination_logger.info(f"Page has pagination: {has_pagination}")

            experiences = []
            exp_rows = exp_table.find_all('tr', class_='exp-list-row')
            pagination_logger.debug(f"Found {len(exp_rows)} experience rows in initial table")

            if has_pagination:
                pagination_logger.info(f"Processing paginated view - Start: {start}, Max: {max}")
                form = soup.find('form', {'name': 'ResultsForm'})
                if not form:
                    pagination_logger.error("Could not find pagination form")
                    raise ValueError("Could not find results form")

                action_url = form.get('action')
                if not action_url:
                    pagination_logger.error("Could not find form action URL")
                    raise ValueError("Could not find form action URL")

                base_url = f"https://www.erowid.org{action_url}"
                page_url = f"{base_url}?S={start}&C={max}"
                pagination_logger.info(f"Fetching paginated results from: {page_url}")

                page_response = await client.get(page_url)
                page_soup = BeautifulSoup(page_response.text, 'html.parser')
                exp_table = page_soup.find('table', class_='exp-list-table')
                if not exp_table:
                    pagination_logger.error("Could not find results table in paginated page")
                    raise ValueError("Could not find results table in paginated page")

                exp_rows = exp_table.find_all('tr', class_='exp-list-row')
                pagination_logger.info(f"Found {len(exp_rows)} experiences in paginated view")
            else:
                pagination_logger.info(f"Processing non-paginated view - Start: {start}, Max: {max}")
                end = min(start + max, len(exp_rows))
                pagination_logger.debug(f"Taking slice [{start}:{end}] from {len(exp_rows)} total rows")
                exp_rows = exp_rows[start:end]

            for row in exp_rows:
                try:
                    rating_img = row.find('img', alt=True)
                    rating = rating_img['alt'] if rating_img else "Unrated"

                    title_cell = row.find('td', class_='exp-title')
                    if not title_cell or not title_cell.find('a'):
                        pagination_logger.warning("Skipping row - missing title cell or link")
                        continue

                    title = title_cell.find('a').text.strip()
                    raw_href = title_cell.find('a')['href'].lstrip('/')

                    # Normalize link
                    if raw_href.startswith('experiences/'):
                        exp_url = f"https://www.erowid.org/{raw_href}"
                    else:
                        exp_url = f"https://www.erowid.org/experiences/{raw_href}"

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
                except Exception as row_error:
                    pagination_logger.error(f"Error parsing row: {str(row_error)}")
                    continue

            pagination_logger.info(f"Successfully parsed {len(experiences)} experiences")

            if has_pagination:
                total_pages = (total_count + max - 1) // max
                current_page = (start // max) + 1
                has_next = current_page < total_pages
                next_url = f"{base_url}?S={start + max}&C={max}" if has_next else None

                pagination = {
                    "current_page": current_page,
                    "total_pages": total_pages,
                    "has_next": has_next,
                    "next_url": next_url,
                    "experiences_per_page": max,
                    "total_experiences": total_count,
                    "current_start": start,
                    "base_url": base_url
                }
            else:
                pagination = {
                    "current_page": 1,
                    "total_pages": 1,
                    "has_next": False,
                    "next_url": None,
                    "experiences_per_page": total_count,
                    "total_experiences": total_count,
                    "current_start": 0,
                    "base_url": url
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