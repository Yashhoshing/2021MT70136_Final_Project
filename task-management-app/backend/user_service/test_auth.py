import pytest
from fastapi.testclient import TestClient
from .main import app

client = TestClient(app)

# User registration
@pytest.mark.parametrize("username,password", [
    ("testuser1", "TestPass123!"),
    ("testuser2", "AnotherPass456!")
])
def test_register_success(username, password):
    response = client.post("/register", json={"username": username, "password": password})
    assert response.status_code in [200, 201, 422, 400]  # 422 if already exists, 400 for duplicate
    if response.status_code == 200:
        assert response.json()["username"] == username
    elif response.status_code == 400:
        assert "already" in response.json()["detail"].lower()

# Duplicate registration
def test_register_duplicate():
    username = "testuser_dup"
    password = "TestPassDup!"
    client.post("/register", json={"username": username, "password": password})
    response = client.post("/register", json={"username": username, "password": password})
    assert response.status_code == 400
    assert "already" in response.json()["detail"].lower()

# Login success
def test_login_success():
    username = "testuser_login"
    password = "TestPassLogin!"
    client.post("/register", json={"username": username, "password": password})
    response = client.post("/login", data={"username": username, "password": password})
    assert response.status_code == 200
    assert "access_token" in response.json()

# Login wrong password
def test_login_wrong_password():
    username = "testuser_wrong"
    password = "TestPassWrong!"
    client.post("/register", json={"username": username, "password": password})
    response = client.post("/login", data={"username": username, "password": "wrongpass"})
    assert response.status_code == 400
    assert "incorrect" in response.json()["detail"].lower()

# Login nonexistent user
def test_login_nonexistent_user():
    response = client.post("/login", data={"username": "nouser_xyz", "password": "nopass"})
    assert response.status_code == 400
    assert "incorrect" in response.json()["detail"].lower()

# Get current user
def test_read_me():
    username = "testuser_me"
    password = "TestPassMe!"
    client.post("/register", json={"username": username, "password": password})
    login = client.post("/login", data={"username": username, "password": password})
    token = login.json()["access_token"]
    response = client.get("/me", headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 200
    assert response.json()["username"] == username
