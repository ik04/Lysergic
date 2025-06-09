from pydantic import BaseModel

class FetchExperienceDetailsRequest(BaseModel):
    url: str