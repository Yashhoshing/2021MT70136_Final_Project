ADMIN_USERNAME = "testuser1"
ADMIN_PASSWORD = "TestPass123!"

import pytest
import requests
from fastapi.testclient import TestClient
from task_service.main import app

client = TestClient(app)

USER_SERVICE_URL = "http://localhost:8000"
def get_token(username, password):
    # Always ensure admin is registered first
    reg_admin = requests.post(f"{USER_SERVICE_URL}/register", json={"username": ADMIN_USERNAME, "password": ADMIN_PASSWORD})
    print(f"[ADMIN REGISTER] status: {reg_admin.status_code}, response: {reg_admin.json()}")
    # If requesting token for admin, just login
    if username == ADMIN_USERNAME and password == ADMIN_PASSWORD:
        login = requests.post(f"{USER_SERVICE_URL}/login", data={"username": username, "password": password})
        print(f"[ADMIN LOGIN] status: {login.status_code}, response: {login.json()}")
        return login.json()["access_token"]
    # For all other users, register using admin token
    admin_login = requests.post(f"{USER_SERVICE_URL}/login", data={"username": ADMIN_USERNAME, "password": ADMIN_PASSWORD})
    print(f"[ADMIN LOGIN FOR TOKEN] status: {admin_login.status_code}, response: {admin_login.json()}")
    admin_token = admin_login.json().get("access_token")
    reg_user = requests.post(
        f"{USER_SERVICE_URL}/admin/register",
        json={"username": username, "password": password, "role": "User"},
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    print(f"[USER REGISTER] ({username}) status: {reg_user.status_code}, response: {reg_user.json()}")
    login = requests.post(f"{USER_SERVICE_URL}/login", data={"username": username, "password": password})
    print(f"[USER LOGIN] ({username}) status: {login.status_code}, response: {login.json()}")
    return login.json()["access_token"]

# Create task
def test_create_task():
    """
    Test: Create a new task as a frontend developer and verify the response fields and owner.
    Steps:
    - Register and login as a frontend developer
    - Create a task (e.g., 'Implement Login Page')
    - Assert the response fields and owner
    """
    print("\n[TEST] test_create_task: Register a frontend dev, create a UI task, and verify the task is created with correct fields and owner.")
    username = "frontenddev"
    password = "FrontEnd123!"
    token = get_token(username, password)
    task_title = "Implement Login Page"
    task_desc = "Develop the login page UI using React and Material-UI. Ensure responsive design and form validation."
    response = client.post("/tasks", json={"title": task_title, "description": task_desc}, headers={"Authorization": f"Bearer {token}"})
    print(f"[CREATE TASK RESPONSE] status: {response.status_code}, response: {response.json()}")
    assert response.status_code in [200, 201]
    data = response.json()
    assert data["title"] == task_title
    assert data["description"] == task_desc
    assert data["progress"] == 0
    assert data["status"] == "To Do"
    assert data["owner"] == username

# Get tasks
def test_get_tasks():
    """
    Test: Get all tasks for a backend developer and verify the response is a list.
    Steps:
    - Register and login as a backend developer
    - Create a task (e.g., 'Build REST API for Tasks')
    - Get all tasks
    - Assert the response is a list
    """
    print("\n[TEST] test_get_tasks: Register a backend dev, create an API task, and get all tasks for the user.")
    username = "backenddev"
    password = "BackEnd123!"
    token = get_token(username, password)
    task_title = "Build REST API for Tasks"
    task_desc = "Develop FastAPI endpoints for task CRUD operations. Ensure JWT authentication and proper error handling."
    client.post("/tasks", json={"title": task_title, "description": task_desc}, headers={"Authorization": f"Bearer {token}"})
    response = client.get("/tasks", headers={"Authorization": f"Bearer {token}"})
    print(f"[GET TASKS RESPONSE] status: {response.status_code}, response: {response.json()}")
    assert response.status_code == 200
    assert isinstance(response.json(), list)

# Update task
def test_update_task():
    """
    Test: Update a CI/CD task's status, progress, and add a comment. Verify updates and activity log.
    Steps:
    - Register and login as a CI/CD engineer
    - Create a task (e.g., 'Set up GitHub Actions')
    - Update the task's status and progress
    - Add a comment
    - Assert updates and activity log
    """
    print("\n[TEST] test_update_task: Register CI/CD engineer, create CI/CD task, update status/progress, add comment, check activity log.")
    username = "cicdengineer"
    password = "CICDpass123!"
    token = get_token(username, password)
    task_title = "Set up GitHub Actions"
    task_desc = "Configure GitHub Actions for automated testing and deployment. Add badge to README."
    create = client.post("/tasks", json={"title": task_title, "description": task_desc}, headers={"Authorization": f"Bearer {token}"})
    print(f"[CREATE TASK RESPONSE] status: {create.status_code}, response: {create.json()}")
    task_id = create.json()["id"]
    update_title = "Configure CI Pipeline"
    response = client.put(
        f"/tasks/{task_id}",
        json={"title": update_title, "status": "In Progress", "progress": 50},
        headers={"Authorization": f"Bearer {token}"}
    )
    print(f"[UPDATE TASK RESPONSE] status: {response.status_code}, response: {response.json()}")
    assert response.status_code == 200
    data = response.json()
    assert data["title"] == update_title
    assert data["progress"] == 50
    response2 = client.put(
        f"/tasks/{task_id}",
        json={"comment": "CI pipeline configured for PRs."},
        headers={"Authorization": f"Bearer {token}"}
    )
    print(f"[ADD COMMENT RESPONSE] status: {response2.status_code}, response: {response2.json()}")
    assert response2.status_code == 200
    assert any(c["comment"] == "CI pipeline configured for PRs." for c in response2.json().get("comments", []))
    assert len(response2.json().get("activity_log", [])) > 0

def test_progress_update_rules():
    """
    Test: Try to update progress for a Dockerization task when status is not 'In Progress'.
    Steps:
    - Register and login as a DevOps engineer
    - Create a task (e.g., 'Write Dockerfile for Backend')
    - Try to update progress without changing status
    - Assert backend allows or restricts as per rules
    """
    print("\n[TEST] test_progress_update_rules: Register DevOps, create Docker task, try to update progress without status change.")
    username = "devops"
    password = "DevOps123!"
    token = get_token(username, password)
    task_title = "Write Dockerfile for Backend"
    task_desc = "Create a Dockerfile for the FastAPI backend. Use multi-stage builds and expose port 8000."
    create = client.post("/tasks", json={"title": task_title, "description": task_desc}, headers={"Authorization": f"Bearer {token}"})
    print(f"[CREATE TASK RESPONSE] status: {create.status_code}, response: {create.json()}")
    task_id = create.json()["id"]
    resp = client.put(f"/tasks/{task_id}", json={"progress": 30}, headers={"Authorization": f"Bearer {token}"})
    print(f"[PROGRESS UPDATE RESPONSE] status: {resp.status_code}, response: {resp.json()}")
    assert resp.status_code in [200, 400]
    if resp.status_code == 400:
        assert "progress" in resp.json()["detail"].lower()

# Delete task
def test_delete_task():
    """
    Test: Delete a Kubernetes deployment task and verify deletion message.
    Steps:
    - Register and login as an SRE
    - Create a task (e.g., 'Deploy Backend to Kubernetes')
    - Delete the task
    - Assert deletion message in response
    """
    print("\n[TEST] test_delete_task: Register SRE, create Kubernetes task, delete task, check deletion message.")
    username = "sreuser"
    password = "SREpass123!"
    token = get_token(username, password)
    task_title = "Deploy Backend to Kubernetes"
    task_desc = "Write Kubernetes manifests for backend deployment. Use ConfigMaps and Secrets for environment variables."
    create = client.post("/tasks", json={"title": task_title, "description": task_desc}, headers={"Authorization": f"Bearer {token}"})
    print(f"[CREATE TASK RESPONSE] status: {create.status_code}, response: {create.json()}")
    task_id = create.json()["id"]
    response = client.delete(f"/tasks/{task_id}", headers={"Authorization": f"Bearer {token}"})
    print(f"[DELETE TASK RESPONSE] status: {response.status_code}, response: {response.json()}")
    assert response.status_code == 200
    assert "deleted" in response.json()["detail"].lower()

def test_admin_delete_user():
    """
    Test: Admin deletes a user. Assert correct status and message.
    Steps:
    - Register admin and another user
    - Delete user as admin
    - Assert status and deletion message
    """
    print("\n[TEST] test_admin_delete_user: Register admin and user, delete user as admin.")
    admin_username = "adminuser2"
    admin_password = "AdminPass2!"
    user_username = "deluser"
    user_password = "DelPass!"
    admin_token = get_token(admin_username, admin_password)
    response = client.delete(f"/users/{user_username}", headers={"Authorization": f"Bearer {admin_token}"})
    print(f"[ADMIN DELETE USER RESPONSE] status: {response.status_code}, response: {response.json()}")
    assert response.status_code in [200, 403, 404]
    if response.status_code == 200:
        assert "deleted" in response.json()["detail"].lower()

def test_list_users():
    """
    Test: List all users. Assert response is a list.
    """
    print("\n[TEST] test_list_users: List all users.")
    response = client.get("/users")
    print(f"[LIST USERS RESPONSE] status: {response.status_code}, response: {response.json()}")
    assert response.status_code == 200
    assert isinstance(response.json(), list)

def test_task_comments_and_activity():
    """
    Test: Add a comment to a QA testing task and verify comments and activity endpoints.
    Steps:
    - Register and login as a QA engineer
    - Create a task (e.g., 'Write Pytest for User API')
    - Add a comment
    - Get comments and activity log
    - Assert comment and activity present
    """
    print("\n[TEST] test_task_comments_and_activity: Register QA, create testing task, add comment, check comments and activity.")
    username = "qaengineer"
    password = "QApass123!"
    token = get_token(username, password)
    task_title = "Write Pytest for User API"
    task_desc = "Write pytest cases for user registration and login endpoints. Cover edge cases and error handling."
    create = client.post("/tasks", json={"title": task_title, "description": task_desc}, headers={"Authorization": f"Bearer {token}"})
    print(f"[CREATE TASK RESPONSE] status: {create.status_code}, response: {create.json()}")
    task_id = create.json()["id"]
    client.put(f"/tasks/{task_id}", json={"comment": "Added tests for invalid login."}, headers={"Authorization": f"Bearer {token}"})
    resp = client.get(f"/tasks/{task_id}/comments", headers={"Authorization": f"Bearer {token}"})
    print(f"[GET COMMENTS RESPONSE] status: {resp.status_code}, response: {resp.json()}")
    assert resp.status_code == 200
    assert any(c["comment"] == "Added tests for invalid login." for c in resp.json())
    resp2 = client.get(f"/tasks/{task_id}/activity", headers={"Authorization": f"Bearer {token}"})
    print(f"[GET ACTIVITY RESPONSE] status: {resp2.status_code}, response: {resp2.json()}")
    assert resp2.status_code == 200
    assert any(a["action"] == "comment" for a in resp2.json())

def test_dashboard_endpoints():
    """
    Test: Dashboard endpoints for progress and upcoming tasks.
    Steps:
    - Register and login as a user
    - Create a task
    - Check dashboard progress and upcoming endpoints
    - Assert correct status codes
    """
    print("\n[TEST] test_dashboard_endpoints: Register user, create task, check dashboard endpoints.")
    username = "taskuser1"
    password = "TaskPass1!"
    token = get_token(username, password)
    response = client.post("/tasks", json={"title": "Test Task", "description": "Task desc"}, headers={"Authorization": f"Bearer {token}"})
    print(f"[CREATE TASK RESPONSE] status: {response.status_code}, response: {response.json()}")
    assert response.status_code in [200, 201]
    data = response.json()
    assert data["title"] == "Test Task"
    assert data["progress"] == 0
    assert data["status"] == "To Do"
    assert data["owner"] == username
    resp3 = client.get("/dashboard/progress", headers={"Authorization": f"Bearer {token}"})
    print(f"[DASHBOARD PROGRESS RESPONSE] status: {resp3.status_code}, response: {resp3.json()}")
    assert resp3.status_code == 200
    resp4 = client.get("/dashboard/upcoming", headers={"Authorization": f"Bearer {token}"})
    print(f"[DASHBOARD UPCOMING RESPONSE] status: {resp4.status_code}, response: {resp4.json()}")
    assert resp4.status_code == 200

# Access control: user cannot delete others' tasks
def test_delete_other_user_task_forbidden():
    """
    Test: Ensure a user cannot delete another user's task (access control).
    Steps:
    - Create a task as user1
    - Attempt to delete as user2
    - Assert forbidden status and error message
    """
    print("\n[TEST] test_delete_other_user_task_forbidden: Create task as user1, try to delete as user2.")
    username1 = "owneruser"
    password1 = "OwnerPass!"
    token1 = get_token(username1, password1)
    create = client.post("/tasks", json={"title": "Owner Task", "description": "Owner Desc"}, headers={"Authorization": f"Bearer {token1}"})
    print(f"[CREATE TASK (user1) RESPONSE] status: {create.status_code}, response: {create.json()}")
    task_id = create.json()["id"]
    username2 = "otheruser"
    password2 = "OtherPass!"
    token2 = get_token(username2, password2)
    response = client.delete(f"/tasks/{task_id}", headers={"Authorization": f"Bearer {token2}"})
    print(f"[FORBIDDEN DELETE RESPONSE] status: {response.status_code}, response: {response.json()}")
    assert response.status_code == 403
    assert "not allowed" in response.json()["detail"].lower()
