from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, Field

class TaskCommentOut(BaseModel):
    id: int
    user: str
    comment: str
    timestamp: datetime
    class Config:
        orm_mode = True

class TaskActivityOut(BaseModel):
    id: int
    user: str
    action: str
    detail: Optional[str]
    timestamp: datetime
    class Config:
        orm_mode = True

class TaskCreate(BaseModel):
    title: str
    description: Optional[str] = None
    status: str = Field(default="To Do")
    owner: Optional[str] = None  # Only admin can set this
    # progress should not be set on creation; default 0

class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    progress: Optional[int] = Field(default=None, ge=0, le=100)  # Only allowed when In Progress
    comment: Optional[str] = None  # New comment to add

class TaskOut(BaseModel):
    id: int
    title: str
    description: Optional[str]
    status: str
    owner: str
    created_at: datetime
    completed_at: Optional[datetime]
    progress: int
    comments: List[TaskCommentOut] = []
    activity_log: List[TaskActivityOut] = []

    class Config:
        orm_mode = True
