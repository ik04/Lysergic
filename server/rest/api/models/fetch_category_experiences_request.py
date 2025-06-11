from pydantic import BaseModel

class FetchCategoryExperiencesRequest(BaseModel):
    url: str