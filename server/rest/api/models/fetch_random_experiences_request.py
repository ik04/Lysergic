from pydantic import BaseModel
from typing import List


class FetchRandomExperiencesRequest(BaseModel):
    urls: List[str]