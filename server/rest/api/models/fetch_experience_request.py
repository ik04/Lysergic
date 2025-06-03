from pydantic import BaseModel

class FetchExperienceRequest(BaseModel):
    url: str