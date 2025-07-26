from fastapi import FastAPI, Depends, HTTPException, status, Header
from sqlalchemy.orm import Session
from jose import jwt, JWTError
from . import models, schemas, database
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()


origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,            # Or ["*"] for all origins (less secure)
    allow_credentials=True,
    allow_methods=["*"],              # Allows all HTTP methods, including OPTIONS
    allow_headers=["*"],              # Allows all headers
)


SECRET_KEY = "your-very-secret-key" 
ALGORITHM = "HS256"

models.Base.metadata.create_all(bind=database.engine)

def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_current_username(authorization: str = Header(...)):
    try:
        scheme, token = authorization.split()
        if scheme.lower() != "bearer":
            raise ValueError("Not Bearer token")
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if not username:
            raise HTTPException(status_code=401, detail="Invalid token")
        return username
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or missing JWT")

@app.post("/tasks", response_model=schemas.TaskOut)
def create_task(task: schemas.TaskCreate, db: Session = Depends(get_db), username: str = Depends(get_current_username)):
    print("Creating task for user:", username)
    print("Creating task title ",task.title)

    db_task = models.Task(
        title=task.title,
        description=task.description,
        status=task.status,
        owner=username,
        progress=0,  # Default progress to 0
        
    )
    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    return db_task


@app.get("/tasks", response_model=list[schemas.TaskOut])
def get_tasks(db: Session = Depends(get_db), username: str = Depends(get_current_username)):
    return db.query(models.Task).filter(models.Task.owner == username).all()

@app.get("/tasks/{task_id}", response_model=schemas.TaskOut)
def get_task(task_id: int, db: Session = Depends(get_db), username: str = Depends(get_current_username)):
    task = db.query(models.Task).filter(models.Task.id == task_id, models.Task.owner == username).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task

from datetime import datetime

@app.put("/tasks/{task_id}", response_model=schemas.TaskOut)
def update_task(task_id: int, update: schemas.TaskUpdate, db: Session = Depends(get_db), username: str = Depends(get_current_username)):
    db_task = db.query(models.Task).filter(models.Task.id == task_id, models.Task.owner == username).first()
    if not db_task:
        raise HTTPException(status_code=404, detail="Task not found")

    
    if update.title is not None:
        db_task.title = update.title
    if update.description is not None:
        db_task.description = update.description

    
    if update.status is not None:
        status = update.status
        prev_status = db_task.status
        db_task.status = status

        if status == "In Progress":
            # If user provided progress, validate & uppdate it
            if update.progress is not None:
                if 0 <= update.progress <= 100:
                    db_task.progress = update.progress
                else:
                    raise HTTPException(status_code=400, detail="Progress must be between 0 and 100")
            else:
                # If no progress provided, keep current or default 0
                if db_task.progress is None:
                    db_task.progress = 0
            db_task.completed_at = None  # Reset completed_at if task goes back to In Progress

        elif status == "Done":
            db_task.progress = 100  # Done implies 100%
            if db_task.completed_at is None:
                db_task.completed_at = datetime.utcnow()
        else:
            # For statuses like "To Do" or others, clear progress and completed_at accordingly
            db_task.completed_at = None
            if update.progress is not None:
                if 0 <= update.progress <= 100:
                    db_task.progress = update.progress
                else:
                    raise HTTPException(status_code=400, detail="Progress must be between 0 and 100")

    db.commit()
    db.refresh(db_task)
    return db_task


@app.delete("/tasks/{task_id}")
def delete_task(task_id: int, db: Session = Depends(get_db), username: str = Depends(get_current_username)):
    db_task = db.query(models.Task).filter(models.Task.id == task_id, models.Task.owner == username).first()
    if not db_task:
        raise HTTPException(status_code=404, detail="Task not found")
    db.delete(db_task)
    db.commit()
    return {"detail": "Task deleted"}
