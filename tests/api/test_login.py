import requests

BASE_URL = "http://localhost:8000"


def test_health_check():
    response = requests.get(f"{BASE_URL}/api/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"


def test_login_valid_guest():
    response = requests.post(
        f"{BASE_URL}/api/login",
        json={"email": "guest@w.com", "password": "guest"},
    )
    assert response.status_code == 200
    body = response.json()
    assert "access_token" in body
    assert body["user"]["role"] == "guest"


def test_login_valid_admin():
    response = requests.post(
        f"{BASE_URL}/api/login",
        json={"email": "admin@w.com", "password": "admin"},
    )
    assert response.status_code == 200
    assert response.json()["user"]["role"] == "admin"


def test_login_wrong_password():
    response = requests.post(
        f"{BASE_URL}/api/login",
        json={"email": "guest@w.com", "password": "wrongpass"},
    )
    assert response.status_code == 401


def test_login_unknown_email():
    response = requests.post(
        f"{BASE_URL}/api/login",
        json={"email": "nobody@w.com", "password": "guest"},
    )
    assert response.status_code == 401


def test_login_missing_password():
    response = requests.post(
        f"{BASE_URL}/api/login",
        json={"email": "guest@w.com"},
    )
    assert response.status_code == 422