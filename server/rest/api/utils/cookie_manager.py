from typing import Optional
import httpx
import asyncio
import logging

logger = logging.getLogger(__name__)

_cf_clearance: Optional[str] = None
_refresh_lock = asyncio.Lock()
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate",
    "Sec-Ch-Ua": '"Chromium";v="148", "Google Chrome";v="148", "Not/A)Brand";v="99"',
    "Sec-Ch-Ua-Mobile": "?0",
    "Sec-Ch-Ua-Platform": '"macOS"',
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "none",
    "Sec-Fetch-User": "?1",
    "Upgrade-Insecure-Requests": "1",
}


def init() -> None:
    global _cf_clearance
    from core.config import settings
    _cf_clearance = settings.CF_CLEARANCE or None


def get_cookies() -> Optional[dict]:
    if _cf_clearance:
        return {
            "cf_clearance": _cf_clearance,
            "donation_referrer": "https%3A%2F%2Ferowid.org%2Fplants%2Fdatura%2Fdatura.shtml",
            "src": "ms242",
        }
    return None


async def refresh() -> None:
    global _cf_clearance
    async with _refresh_lock:
        logger.info("Launching headless browser to refresh cf_clearance...")
        try:
            from playwright.async_api import async_playwright
            async with async_playwright() as pw:
                browser = await pw.chromium.launch(
                    headless=True,
                    args=["--no-sandbox", "--disable-setuid-sandbox"],
                )
                page = await browser.new_page()
                await page.goto("https://erowid.org", wait_until="domcontentloaded")
                await page.wait_for_timeout(15000)
                cookies = await page.context.cookies()
                await browser.close()

            for c in cookies:
                if c["name"] == "cf_clearance":
                    _cf_clearance = c["value"]
                    logger.info(f"cf_clearance refreshed successfully")
                    return

            logger.warning("cf_clearance cookie not found after Playwright navigation")
        except Exception as e:
            logger.error(f"Failed to refresh cf_clearance: {e}")


async def get_client(**kwargs) -> httpx.AsyncClient:
    return httpx.AsyncClient(
        verify=False,
        cookies=get_cookies(),
        headers=HEADERS,
        **kwargs,
    )


async def fetch_url(url: str, **kwargs) -> httpx.Response:
    for attempt in range(2):
        client = await get_client(**kwargs)
        async with client:
            resp = await client.get(url)
            if resp.status_code == 200:
                return resp
            if resp.status_code in (403, 502) and attempt == 0:
                logger.info(f"Got {resp.status_code}, refreshing cf_clearance...")
                await refresh()
                continue
            resp.raise_for_status()
    raise httpx.HTTPError(f"Failed after cookie refresh: {resp.status_code}")
