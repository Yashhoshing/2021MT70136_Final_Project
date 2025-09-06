
import pytest
from fastapi.testclient import TestClient
import sys
import os
sys.path.append(os.path.abspath(os.path.dirname(__file__)))
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from task_service.main import app

client = TestClient(app)

# Helper to get a valid token from user_service
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../user_service')))
from main import app as user_app
user_client = TestClient(user_app)

def get_token(username, password):
    user_client.post("/register", json={"username": username, "password": password})
    login = user_client.post("/login", data={"username": username, "password": password})
    return login.json()["access_token"]

# Create task
def test_create_task():
    username = "taskuser1"
    password = "TaskPass1!"
    token = get_token(username, password)
    response = client.post("/tasks", json={"title": "Test Task", "description": "Task desc"}, headers={"Authorization": f"Bearer {token}"})
    assert response.status_code in [200, 201]
    assert response.json()["title"] == "Test Task"

# Get tasks
def test_get_tasks():
    username = "taskuser2"
    password = "TaskPass2!"
    token = get_token(username, password)
    client.post("/tasks", json={"title": "Task1", "description": "Desc1"}, headers={"Authorization": f"Bearer {token}"})
    response = client.get("/tasks", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    assert isinstance(response.json(), list)

# Update task
def test_update_task():
    username = "taskuser3"
    password = "TaskPass3!"
    token = get_token(username, password)
    create = client.post("/tasks", json={"title": "Task2", "description": "Desc2"}, headers={"Authorization": f"Bearer {token}"})
    task_id = create.json()["id"]
    response = client.put(f"/tasks/{task_id}", json={"title": "Updated Task", "status": "In Progress", "progress": 50}, headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    assert response.json()["title"] == "Updated Task"
    assert response.json()["progress"] == 50

# Delete task
def test_delete_task():
    username = "taskuser4"
    password = "TaskPass4!"
    token = get_token(username, password)
    create = client.post("/tasks", json={"title": "Task3", "description": "Desc3"}, headers={"Authorization": f"Bearer {token}"})
    task_id = create.json()["id"]
    response = client.delete(f"/tasks/{task_id}", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    assert "deleted" in response.json()["detail"].lower()

# Access control: user cannot delete others' tasks
def test_delete_other_user_task_forbidden():
    # Create task as user1
    username1 = "owneruser"
    password1 = "OwnerPass!"
    token1 = get_token(username1, password1)
    create = client.post("/tasks", json={"title": "Owner Task", "description": "Owner Desc"}, headers={"Authorization": f"Bearer {token1}"})
    task_id = create.json()["id"]
    # Try to delete as user2
    username2 = "otheruser"
    password2 = "OtherPass!"
    token2 = get_token(username2, password2)
    response = client.delete(f"/tasks/{task_id}", headers={"Authorization": f"Bearer {token2}"})
    assert response.status_code == 403
    assert "not allowed" in response.json()["detail"].lower()
