import math
import httpx
from fastapi import APIRouter, HTTPException
from bs4 import BeautifulSoup, Tag
import logging
from urllib.parse import urlparse, parse_qs, urlencode, urlunparse
from typing import List, Dict, Any
import re


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
                
                category_link = row.find('a', {'href': True})
                if not category_link:
                    continue
                
                category_name = category_link.find('u').text.strip()
                category_url = f"https://www.erowid.org/experiences/subs/{category_link['href']}"
                
                count_cells = row.find_all('b')
                exp_count = 0
                if len(count_cells) >= 3:  
                    count_text = count_cells[2].text.strip('[]')  
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


_log = logging.getLogger("erowid.pagination")


def _update_query(url: str, **new_q) -> str:
    u = urlparse(url)
    q = parse_qs(u.query, keep_blank_values=True)
    q.update({k: [str(v)] for k, v in new_q.items()})
    return urlunparse(u._replace(query=urlencode(q, doseq=True)))


async def _soup(client: httpx.AsyncClient, url: str) -> BeautifulSoup:
    r = await client.get(url)
    r.raise_for_status()
    return BeautifulSoup(r.text, "html.parser")


async def fetch_paginated_experiences(
    url: str,
    start: int = 0,
    max: int = 100,
) -> Dict[str, Any]:
    """
    Scrape experiences from an Erowid category/search page.
    - exp.cgi pages: honor ?Start & ?Max on the server
    - exp_*.shtml pages: fetch once and slice locally
    """
    try:
        async with httpx.AsyncClient(verify=False, timeout=30.0) as client:
            first_soup = await _soup(client, url)

            # ── detect if this is a CGI page (server pagination) ───────────
            page_link = first_soup.select_one('a[href*="Start="]')
            is_cgi = bool(page_link and "exp.cgi" in page_link["href"])

            # -----------------------------------------------------------------
            #   1) Build the page URL to fetch (CGI) or keep static URL (shtml)
            # -----------------------------------------------------------------
            if is_cgi:
                pl_parsed = urlparse(page_link["href"])
                q = parse_qs(pl_parsed.query)
                s_id, c_id = q.get("S", [None])[0], q.get("C", [None])[0]
                base_cgi = f"https://www.erowid.org{pl_parsed.path}"
                page_url = _update_query(
                    base_cgi,
                    S=s_id,
                    C=c_id,
                    ShowViews=q.get("ShowViews", ["0"])[0],
                    Cellar=q.get("Cellar", ["0"])[0],
                    Start=start,
                    Max=max,
                )
                soup = await _soup(client, page_url)
            else:
                # static .shtml page – single fetch, slice rows locally
                page_url = url
                soup = first_soup

            # -----------------------------------------------------------------
            #   2) Parse rows
            # -----------------------------------------------------------------
            table = soup.select_one("table.exp-list-table")
            if not table:
                return {
                    "status": "success",
                    "experiences": [],
                    "pagination": {
                        "current_page": 1,
                        "total_pages": 1,
                        "has_next": False,
                        "next_url": None,
                        "experiences_per_page": 0,
                        "total_experiences": 0,
                        "current_start": 0,
                        "base_url": page_url,
                    },
                }

            rows = table.select('tr[class^="exp-list-row"]')
            if not is_cgi:
                rows = rows[start : start + max]  # local slice for static pages

            exps: List[Dict[str, str | None]] = []
            for r in rows:
                a_tag = r.select_one("td.exp-title a")
                if not a_tag:
                    continue
                raw_href = a_tag["href"].lstrip("/")
                full_url = (
                    f"https://www.erowid.org/{raw_href}"
                    if raw_href.startswith("experiences/")
                    else f"https://www.erowid.org/experiences/{raw_href}"
                )
                author_tag = r.select_one("td.exp-author")
                substance_tag = r.select_one("td.exp-substance")
                rating_tag = r.select_one("img[alt]")
                date_tag = r.select_one("td.exp-pubdate")

                exps.append(
                    {
                        "title": a_tag.text.strip(),
                        "url": full_url,
                        "author": author_tag.text.strip() if author_tag else None,
                        "substance": substance_tag.text.strip() if substance_tag else None,
                        "rating": rating_tag["alt"] if rating_tag else "Unrated",
                        "date": date_tag.text.strip() if date_tag else None,
                    }
                )

                

            # -----------------------------------------------------------------
            #   3) Pagination metadata
            # -----------------------------------------------------------------
            if is_cgi:
                total_div = soup.select_one("div.exp-list-page-title-sub")
                total_cnt = int(re.search(r"\d+", total_div.text).group()) if total_div else len(exps)
                total_pages = math.ceil(total_cnt / max)
                has_next = start + max < total_cnt
                next_url = _update_query(page_url, Start=start + max, Max=max) if has_next else None
            else:
                total_cnt = len(table.select('tr[class^="exp-list-row"]'))
                total_pages = 1
                has_next = False
                next_url = None

            return {
                "status": "success",
                "experiences": exps,
                "pagination": {
                    "current_page": start // max + 1 if is_cgi else 1,
                    "total_pages": total_pages,
                    "has_next": has_next,
                    "next_url": next_url,
                    "experiences_per_page": max if is_cgi else len(exps),
                    "total_experiences": total_cnt,
                    "current_start": start,
                    "base_url": page_url,
                },
            }

    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Erowid request timed out")
    except httpx.HTTPError as e:
        raise HTTPException(status_code=502, detail=f"Erowid fetch error: {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Scraper error: {e}")