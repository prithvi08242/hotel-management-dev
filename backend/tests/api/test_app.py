import requests

BASE_URL = "http://localhost:8000"


def _login(email, password):
    r = requests.post(f"{BASE_URL}/api/login", json={"email": email, "password": password})
    return r.json()["access_token"]


def test_health_check():
    r = requests.get(f"{BASE_URL}/api/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_login_valid_guest():
    r = requests.post(f"{BASE_URL}/api/login", json={"email": "guest@w.com", "password": "guest"})
    assert r.status_code == 200
    assert r.json()["user"]["role"] == "guest"


def test_login_wrong_password():
    r = requests.post(f"{BASE_URL}/api/login", json={"email": "guest@w.com", "password": "wrong"})
    assert r.status_code == 401


def test_signup_and_login():
    import uuid
    email = f"test-{uuid.uuid4().hex[:8]}@w.com"
    r = requests.post(
        f"{BASE_URL}/api/signup",
        json={"email": email, "password": "pass123", "full_name": "Test User"},
    )
    assert r.status_code == 200
    assert r.json()["user"]["role"] == "guest"

    r2 = requests.post(f"{BASE_URL}/api/login", json={"email": email, "password": "pass123"})
    assert r2.status_code == 200


def test_signup_duplicate_email():
    r = requests.post(
        f"{BASE_URL}/api/signup",
        json={"email": "guest@w.com", "password": "x", "full_name": "Dup"},
    )
    assert r.status_code == 409


def test_list_rooms():
    r = requests.get(f"{BASE_URL}/api/rooms")
    assert r.status_code == 200
    assert len(r.json()) >= 1


def test_create_booking_requires_auth():
    r = requests.post(
        f"{BASE_URL}/api/bookings",
        json={"room_id": 1, "check_in": "2026-08-01", "check_out": "2026-08-03"},
    )
    assert r.status_code == 401


def test_create_and_cancel_booking():
    token = _login("guest@w.com", "guest")
    headers = {"Authorization": f"Bearer {token}"}

    rooms = requests.get(f"{BASE_URL}/api/rooms").json()
    room_id = rooms[0]["id"]

    r = requests.post(
        f"{BASE_URL}/api/bookings",
        json={"room_id": room_id, "check_in": "2026-09-01", "check_out": "2026-09-03"},
        headers=headers,
    )
    assert r.status_code == 200
    booking_id = r.json()["id"]

    r2 = requests.get(f"{BASE_URL}/api/bookings/me", headers=headers)
    assert r2.status_code == 200
    assert any(b["id"] == booking_id for b in r2.json())

    r3 = requests.delete(f"{BASE_URL}/api/bookings/{booking_id}", headers=headers)
    assert r3.status_code == 200
    assert r3.json()["status"] == "cancelled"


def test_admin_bookings_requires_admin():
    token = _login("guest@w.com", "guest")
    r = requests.get(
        f"{BASE_URL}/api/admin/bookings", headers={"Authorization": f"Bearer {token}"}
    )
    assert r.status_code == 403


def test_admin_can_view_bookings():
    token = _login("admin@w.com", "admin")
    r = requests.get(
        f"{BASE_URL}/api/admin/bookings", headers={"Authorization": f"Bearer {token}"}
    )
    assert r.status_code == 200
