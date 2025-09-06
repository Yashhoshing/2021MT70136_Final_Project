from fastapi import FastAPI, Depends, HTTPException, status, Header
from sqlalchemy.orm import Session
from jose import jwt, JWTError
from . import models, schemas, database
# from task_service import models, schemas, database
# import models, database, schemas
import sys
sys.path.append(r"C:\Users\Lenovo\Desktop\Bits\Project\task-management-app\backend\user_service")
import models as user_models
import database as user_database
from fastapi.middleware.cors import CORSMiddleware

SECRET_KEY = "your-very-secret-key"
ALGORITHM = "HS256"

app = FastAPI()

models.Base.metadata.create_all(bind=database.engine)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

origins = [
    "http://localhost:3000",
    "http://127.0.0.1:3000",
]

def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

def get_current_user_and_role(authorization: str = Header(...)):
    try:
        scheme, token = authorization.split()
        if scheme.lower() != "bearer":
            raise ValueError("Not Bearer token")
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        role: str = payload.get("role", "User")
        if not username:
            raise HTTPException(status_code=401, detail="Invalid token")
        return username, role
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or missing JWT")

# @app.post("/tasks", response_model=schemas.TaskOut)
@app.post("/tasks", response_model=schemas.TaskOut)
def create_task(task: schemas.TaskCreate, db: Session = Depends(get_db), user_and_role: tuple = Depends(get_current_user_and_role)):
    """
    Create a new task for the authenticated user, or for any user if Admin.
    If admin, can specify owner in the request body.
    """
    username, role = user_and_role
    # If admin and task.owner is provided, use it. Otherwise, use current user.
    task_owner = task.owner if (role == "Admin" and task.owner) else username
    try:
        db_task = models.Task(
            title=task.title,
            description=task.description,
            status=task.status if task.status else "To Do",
            progress=0,  # Always set to 0 for new tasks
            owner=task_owner
        )
        db.add(db_task)
        db.commit()
        db.refresh(db_task)
        return db_task
    except Exception as e:
        print("Error creating task:", e)
        raise HTTPException(status_code=400, detail=f"Failed to create task: {e}")
# Endpoint to delete a user (admin only)
@app.delete("/users/{username}")
def delete_user(username: str, user_and_role: tuple = Depends(get_current_user_and_role), db: Session = Depends(get_db)):
    _, role = user_and_role
    if role != "Admin":
        raise HTTPException(status_code=403, detail="Only admin can delete users")
    user_db = user_database.SessionLocal()
    try:
        user = user_db.query(user_models.User).filter(user_models.User.username == username).first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        # Delete all tasks for this user
        db.query(models.Task).filter(models.Task.owner == username).delete()
        db.commit()
        user_db.delete(user)
        user_db.commit()
        return {"detail": f"User '{username}' and their tasks deleted"}
    finally:
        user_db.close()


@app.get("/tasks", response_model=list[schemas.TaskOut])
def get_tasks(db: Session = Depends(get_db), user_and_role: tuple = Depends(get_current_user_and_role), user: str = None):
    username, role = user_and_role
    if role == "Admin" and user:
        return db.query(models.Task).filter(models.Task.owner == user).all()
    elif role == "Admin":
        return db.query(models.Task).all()
    else:
        return db.query(models.Task).filter(models.Task.owner == username).all()

@app.get("/tasks/{task_id}", response_model=schemas.TaskOut)
def get_task(task_id: int, db: Session = Depends(get_db), user_and_role: tuple = Depends(get_current_user_and_role)):
    username, role = user_and_role
    if role == "Admin":
        task = db.query(models.Task).filter(models.Task.id == task_id).first()
    else:
        task = db.query(models.Task).filter(models.Task.id == task_id, models.Task.owner == username).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return task

from datetime import datetime

@app.put("/tasks/{task_id}", response_model=schemas.TaskOut)
@app.put("/tasks/{task_id}", response_model=schemas.TaskOut)
def update_task(task_id: int, update: schemas.TaskUpdate, db: Session = Depends(get_db), user_and_role: tuple = Depends(get_current_user_and_role)):
    username, role = user_and_role
    if role == "Admin":
        db_task = db.query(models.Task).filter(models.Task.id == task_id).first()
    else:
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
@app.delete("/tasks/{task_id}")
def delete_task(task_id: int, db: Session = Depends(get_db), user_and_role: tuple = Depends(get_current_user_and_role)):
    username, role = user_and_role
    if role == "Admin":
        db_task = db.query(models.Task).filter(models.Task.id == task_id).first()
    else:
        db_task = db.query(models.Task).filter(models.Task.id == task_id, models.Task.owner == username).first()
    if not db_task:
        raise HTTPException(status_code=404, detail="Task not found")
    db.delete(db_task)
    db.commit()
    return {"detail": "Task deleted"}

    # Endpoint to list all created users
@app.get("/users")
def list_users():
    db = user_database.SessionLocal()
    print("Listing users",db)
    try:
        users = db.query(user_models.User).all()
        # Return dicts with id, username, and email=None for frontend compatibility
        return [
            {"id": user.id, "username": user.username, "email": None} for user in users
        ]
    finally:
        db.close()
