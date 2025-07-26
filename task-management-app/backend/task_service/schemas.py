from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field

class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    status: str = Field(default="To Do")
    # progress should not be set on creation; default 0

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    progress: Optional[int] = Field(default=None, ge=0, le=100)  # Only allowed when In Progress

class TaskOut(BaseModel):
    id: int
    title: str
    description: Optional[str]
    status: str
    owner: str
    created_at: datetime
    completed_at: Optional[datetime]
    progress: int

    class Config:
        orm_mode = True
