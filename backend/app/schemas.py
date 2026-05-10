from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    # NO role field — hardcoded to reviewer on backend

class Token(BaseModel):
    access_token: str
    token_type: str

class ScoreCreate(BaseModel):
    category: str
    score: int  # 1-5
    note: Optional[str] = None

class ScoreOut(BaseModel):
    id: int
    category: str
    score: int
    note: Optional[str]
    reviewer_id: int
    created_at: datetime
    class Config: from_attributes = True

class CandidateOut(BaseModel):
    id: int
    name: str
    email: str
    role_applied: str
    status: str
    skills: List[str]
    created_at: datetime
    scores: List[ScoreOut] = []
    internal_notes: Optional[str] = None  # only populated for admin
    class Config: from_attributes = True