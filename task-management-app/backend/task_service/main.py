from sqlalchemy import func, case, and_, or_
from datetime import datetime, timedelta
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
        print("Admin fetching tasks for user:", user)
        return db.query(models.Task).filter(models.Task.owner == user).all()
    elif role == "Admin":
        print("Admin fetching all tasks")
        print( db.query(models.Task).all())
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

    activity_entries = []
    # Track changes for activity log
    if update.title is not None and update.title != db_task.title:
        old = db_task.title
        db_task.title = update.title
        activity_entries.append(models.TaskActivity(
            task_id=task_id, user=username, action="title_change", detail=f"Title changed from '{old}' to '{update.title}'"
        ))
    if update.description is not None and update.description != db_task.description:
        old = db_task.description
        db_task.description = update.description
        activity_entries.append(models.TaskActivity(
            task_id=task_id, user=username, action="description_change", detail=f"Description changed."
        ))

    if update.status is not None and update.status != db_task.status:
        prev_status = db_task.status
        db_task.status = update.status
        activity_entries.append(models.TaskActivity(
            task_id=task_id, user=username, action="status_change", detail=f"Status changed from '{prev_status}' to '{update.status}'"
        ))

        if update.status == "In Progress":
            if update.progress is not None:
                if 0 <= update.progress <= 100:
                    db_task.progress = update.progress
                else:
                    raise HTTPException(status_code=400, detail="Progress must be between 0 and 100")
            else:
                if db_task.progress is None:
                    db_task.progress = 0
            db_task.completed_at = None
        elif update.status == "Done":
            db_task.progress = 100
            if db_task.completed_at is None:
                db_task.completed_at = datetime.utcnow()
        else:
            db_task.completed_at = None
            if update.progress is not None:
                if 0 <= update.progress <= 100:
                    db_task.progress = update.progress
                else:
                    raise HTTPException(status_code=400, detail="Progress must be between 0 and 100")

    # If only progress is updated (status unchanged)
    if update.progress is not None and (update.status is None or update.status == db_task.status):
        if 0 <= update.progress <= 100:
            if update.progress != db_task.progress:
                old = db_task.progress
                db_task.progress = update.progress
                activity_entries.append(models.TaskActivity(
                    task_id=task_id, user=username, action="progress_update", detail=f"Progress changed from {old}% to {update.progress}%"
                ))
        else:
            raise HTTPException(status_code=400, detail="Progress must be between 0 and 100")

    # Handle new comment
    if update.comment:
        comment_obj = models.TaskComment(
            task_id=task_id, user=username, comment=update.comment
        )
        db.add(comment_obj)
        activity_entries.append(models.TaskActivity(
            task_id=task_id, user=username, action="comment", detail=f"Commented: {update.comment}"
        ))

    # Add all activity log entries
    for entry in activity_entries:
        db.add(entry)

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

@app.get("/tasks/{task_id}/comments", response_model=list[schemas.TaskCommentOut])
def get_task_comments(task_id: int, db: Session = Depends(get_db), user_and_role: tuple = Depends(get_current_user_and_role)):
    username, role = user_and_role
    task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    # Only allow owner or admin to view comments
    if role != "Admin" and task.owner != username:
        raise HTTPException(status_code=403, detail="Not authorized to view comments")
    return task.comments

@app.get("/tasks/{task_id}/activity", response_model=list[schemas.TaskActivityOut])
def get_task_activity(task_id: int, db: Session = Depends(get_db), user_and_role: tuple = Depends(get_current_user_and_role)):
    username, role = user_and_role
    task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    # Only allow owner or admin to view activity log
    if role != "Admin" and task.owner != username:
        raise HTTPException(status_code=403, detail="Not authorized to view activity log")
    return task.activity_log


# --- DASHBOARD ENDPOINTS ---
@app.get("/dashboard/status")
def dashboard_status(db: Session = Depends(get_db), user_and_role: tuple = Depends(get_current_user_and_role), user: str = None):
    username, role = user_and_role
    q = db.query(models.Task.status, func.count(models.Task.id)).group_by(models.Task.status)
    if role == "Admin" and user:
        q = q.filter(models.Task.owner == user)
    elif role != "Admin":
        q = q.filter(models.Task.owner == username)
    data = q.all()
    return [{"status": s, "value": c} for s, c in data]

@app.get("/dashboard/productivity")
def dashboard_productivity(db: Session = Depends(get_db), user_and_role: tuple = Depends(get_current_user_and_role), user: str = None):
    username, role = user_and_role
    # Get tasks completed per day for last 14 days
    base_query = db.query(
        func.date(models.Task.completed_at).label("date"),
        func.count(models.Task.id).label("completed")
    ).filter(
        models.Task.status == "Done",
        models.Task.completed_at != None,
        models.Task.completed_at >= datetime.utcnow() - timedelta(days=14)
    )
    if role == "Admin" and user:
        base_query = base_query.filter(models.Task.owner == user)
    elif role != "Admin":
        base_query = base_query.filter(models.Task.owner == username)
    base_query = base_query.group_by(func.date(models.Task.completed_at)).order_by(func.date(models.Task.completed_at))
    data = base_query.all()
    # Fill missing days
    days = [(datetime.utcnow() - timedelta(days=i)).date() for i in range(13, -1, -1)]
    result = []
    data_dict = {str(d[0]): d[1] for d in data if d[0]}
    for d in days:
        result.append({"date": d.strftime("%Y-%m-%d"), "completed": data_dict.get(str(d), 0)})
    return result

@app.get("/dashboard/progress")
def dashboard_progress(db: Session = Depends(get_db), user_and_role: tuple = Depends(get_current_user_and_role), user: str = None):
    username, role = user_and_role
    # Ranges: 0-25, 26-50, 51-75, 76-100
    ranges = [(0,25), (26,50), (51,75), (76,100)]
    labels = ["0-25%", "26-50%", "51-75%", "76-100%"]
    q = db.query(models.Task.progress)
    if role == "Admin" and user:
        q = q.filter(models.Task.owner == user)
    elif role != "Admin":
        q = q.filter(models.Task.owner == username)
    progress_list = [t[0] for t in q.all() if t[0] is not None]
    buckets = [0,0,0,0]
    for p in progress_list:
        for i, (lo, hi) in enumerate(ranges):
            if lo <= p <= hi:
                buckets[i] += 1
                break
    return [{"range": labels[i], "count": buckets[i]} for i in range(4)]

@app.get("/dashboard/upcoming")
def dashboard_upcoming(db: Session = Depends(get_db), user_and_role: tuple = Depends(get_current_user_and_role), user: str = None):
    username, role = user_and_role
    now = datetime.utcnow()
    week = now + timedelta(days=7)
    q = db.query(models.Task).filter(models.Task.status != "Done")
    if hasattr(models.Task, "deadline"):
        q = q.filter(models.Task.deadline != None, models.Task.deadline >= now, models.Task.deadline <= week)
    if role == "Admin" and user:
        q = q.filter(models.Task.owner == user)
    elif role != "Admin":
        q = q.filter(models.Task.owner == username)
    tasks = q.order_by(models.Task.deadline).all() if hasattr(models.Task, "deadline") else []
    # fallback: if no deadline field, return empty
    return [
        {"id": t.id, "title": t.title, "deadline": t.deadline, "status": t.status}
        for t in tasks
    ]

@app.get("/dashboard/user_summary")
def dashboard_user_summary(db: Session = Depends(get_db), user_and_role: tuple = Depends(get_current_user_and_role)):
    # Only admin can see all users
    username, role = user_and_role
    if role != "Admin":
        raise HTTPException(status_code=403, detail="Only admin can view user summary")
    # Get all users
    user_db = user_database.SessionLocal()
    try:
        users = user_db.query(user_models.User).all()
        result = []
        for user in users:
            assigned = db.query(models.Task).filter(models.Task.owner == user.username).count()
            completed = db.query(models.Task).filter(models.Task.owner == user.username, models.Task.status == "Done").count()
            comments = db.query(models.TaskComment).filter(models.TaskComment.user == user.username).count()
            result.append({
                "username": user.username,
                "assigned": assigned,
                "completed": completed,
                "comments": comments
            })
        return result
    finally:
        user_db.close()
