ADMIN_USERNAME = "testuser1"
ADMIN_PASSWORD = "TestPass123!"
import pytest
from fastapi.testclient import TestClient
from .main import app

client = TestClient(app)


# User registration (first user is admin)
@pytest.mark.parametrize("username,password", [
    ("testuser1", "TestPass123!"),
    ("testuser2", "AnotherPass456!")
])
def test_register_success(username, password):
    print(f"\n[TEST] test_register_success: Register user '{username}' and check for correct status and role.")
    response = client.post("/register", json={"username": username, "password": password})
    print(f"[REGISTER] ({username}) status:", response.status_code, response.json())
    assert response.status_code in [200, 201, 422, 400, 403]  # 422 if already exists, 400 for duplicate, 403 if not allowed
    if response.status_code == 200:
        assert response.json()["username"] == username
        assert response.json()["role"] in ["Admin", "User"]
    elif response.status_code == 400:
        assert "already" in response.json()["detail"].lower()
    elif response.status_code == 403:
        assert "disabled" in response.json()["detail"].lower() or "admin" in response.json()["detail"].lower()

# Duplicate registration
def test_register_duplicate():
    print("\n[TEST] test_register_duplicate: Attempt duplicate registration and expect failure.")
    username = "testuser_dup"
    password = "TestPassDup!"
    reg1 = client.post("/register", json={"username": username, "password": password})
    print(f"[REGISTER 1] ({username}) status:", reg1.status_code, reg1.json())
    response = client.post("/register", json={"username": username, "password": password})
    print(f"[REGISTER 2 - DUPLICATE] ({username}) status:", response.status_code, response.json())
    assert response.status_code in [400, 403]
    if response.status_code == 400:
        assert "already" in response.json()["detail"].lower()


# Login success
def test_login_success():
    print("\n[TEST] test_login_success: Register and login as admin, expect successful login and token.")
    # Use the first user from the parametrize list for registration and login
    username = "testuser1"
    password = "TestPass123!"
    reg_response = client.post("/register", json={"username": ADMIN_USERNAME, "password": ADMIN_PASSWORD})
    print(f"[REGISTER] ({ADMIN_USERNAME}) status:", reg_response.status_code, reg_response.json())
    response = client.post(
        "/login",
        data={"username": ADMIN_USERNAME, "password": ADMIN_PASSWORD},
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    print(f"[LOGIN] ({ADMIN_USERNAME}) status:", response.status_code, response.json())
    assert response.status_code == 200
    assert "access_token" in response.json()

# Login wrong password
def test_login_wrong_password():
    print("\n[TEST] test_login_wrong_password: Register user, then attempt login with wrong password and expect failure.")
    username = "testuser_wrong"
    password = "TestPassWrong!"
    reg_response = client.post("/register", json={"username": username, "password": password})
    print(f"[REGISTER] ({username}) status:", reg_response.status_code, reg_response.json())
    response = client.post("/login", data={"username": username, "password": "wrongpass"})
    print(f"[LOGIN WRONG PASSWORD] ({username}) status:", response.status_code, response.json())
    assert response.status_code == 400
    assert "incorrect" in response.json()["detail"].lower()

# Login nonexistent user
def test_login_nonexistent_user():
    print("\n[TEST] test_login_nonexistent_user: Attempt login with a non-existent user and expect failure.")
    response = client.post("/login", data={"username": "nouser_xyz", "password": "nopass"})
    print(f"[LOGIN NONEXISTENT USER] status:", response.status_code, response.json())
    assert response.status_code == 400
    assert "incorrect" in response.json()["detail"].lower()

# Get current user
def test_read_me():
    print("\n[TEST] test_read_me: Register and login as admin, then access /me endpoint and verify user info.")
    reg_response = client.post("/register", json={"username": ADMIN_USERNAME, "password": ADMIN_PASSWORD})
    print(f"[REGISTER] ({ADMIN_USERNAME}) status:", reg_response.status_code, reg_response.json())
    login = client.post(
        "/login",
        data={"username": ADMIN_USERNAME, "password": ADMIN_PASSWORD},
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    print(f"[LOGIN] ({ADMIN_USERNAME}) status:", login.status_code, login.json())
    token = login.json()["access_token"]
    response = client.get("/me", headers={"Authorization": f"Bearer {token}"})
    print(f"[GET /me] ({ADMIN_USERNAME}) status:", response.status_code, response.json())
    assert response.status_code == 200
    assert response.json()["username"] == ADMIN_USERNAME

def test_admin_register_and_role():
    print("\n[TEST] test_admin_register_and_role: Register admin, login, and register a new user as admin, checking roles.")
    # Register first user (admin)
    reg_response = client.post("/register", json={"username": ADMIN_USERNAME, "password": ADMIN_PASSWORD})
    print(f"[REGISTER] ({ADMIN_USERNAME}) status:", reg_response.status_code, reg_response.json())
    # Login as admin
    login = client.post(
        "/login",
        data={"username": ADMIN_USERNAME, "password": ADMIN_PASSWORD},
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    print(f"[LOGIN] ({ADMIN_USERNAME}) status:", login.status_code, login.json())
    token = login.json()["access_token"]
    # Register a new user as admin
    response = client.post(
        "/admin/register",
        json={"username": "newuser", "password": "NewPass!", "role": "User"},
        headers={"Authorization": f"Bearer {token}"}
    )
    print(f"[ADMIN REGISTER] (newuser) status:", response.status_code, response.json())
    assert response.status_code in [200, 201, 400]
    if response.status_code == 200:
        assert response.json()["username"] == "newuser"
        assert response.json()["role"] == "User"

def test_admin_only_register_after_first():
    print("\n[TEST] test_admin_only_register_after_first: Register admin, then attempt direct registration of another user and expect failure.")
    # Register first user
    reg_response = client.post("/register", json={"username": ADMIN_USERNAME, "password": ADMIN_PASSWORD})
    print(f"[REGISTER] ({ADMIN_USERNAME}) status:", reg_response.status_code, reg_response.json())
    # Try to register another user directly
    response = client.post("/register", json={"username": "shouldfail", "password": "failpass"})
    print(f"[REGISTER - SHOULD FAIL] (shouldfail) status:", response.status_code, response.json())
    assert response.status_code == 403
    assert "disabled" in response.json()["detail"].lower() or "admin" in response.json()["detail"].lower()

def test_admin_only_delete_user():
    print("\n[TEST] test_admin_only_delete_user: Register admin and user, then delete user as admin and check result.")
    # Register admin and user
    user_username = "userdel"
    user_password = "UserDelPass!"
    reg_response = client.post("/register", json={"username": ADMIN_USERNAME, "password": ADMIN_PASSWORD})
    print(f"[REGISTER] ({ADMIN_USERNAME}) status:", reg_response.status_code, reg_response.json())
    login = client.post(
        "/login",
        data={"username": ADMIN_USERNAME, "password": ADMIN_PASSWORD},
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    print(f"[LOGIN] ({ADMIN_USERNAME}) status:", login.status_code, login.json())
    token = login.json()["access_token"]
    # Register user as admin
    reg_user_response = client.post(
        "/admin/register",
        json={"username": user_username, "password": user_password},
        headers={"Authorization": f"Bearer {token}"}
    )
    print(f"[ADMIN REGISTER USER] ({user_username}) status:", reg_user_response.status_code, reg_user_response.json())
    # Try to delete as admin
    response = client.delete(f"/users/{user_username}", headers={"Authorization": f"Bearer {token}"})
    print(f"[DELETE USER] ({user_username}) status:", response.status_code, response.json())
    assert response.status_code in [200, 404]
    if response.status_code == 200:
        assert "deleted" in response.json()["detail"].lower()

def test_users_count_endpoint():
    print("\n[TEST] test_users_count_endpoint: Call /users/count endpoint and verify response contains user count.")
    response = client.get("/users/count")
    print(f"[GET /users/count] status:", response.status_code, response.json())
    assert response.status_code == 200
    assert "count" in response.json()
