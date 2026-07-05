"""
In-memory user store for the login page.

This is intentionally NOT a database. The login flow is being proven out
first; persistence gets added later (see project README) once a feature
actually needs relational guarantees.
"""

FAKE_USERS = {
    "guest@w.com": {
        "password": "guest",
        "full_name": "Demo Guest",
        "role": "guest",
    },
    "admin@w.com": {
        "password": "admin",
        "full_name": "Demo Admin",
        "role": "admin",
    },
}


def authenticate(email: str, password: str):
    user = FAKE_USERS.get(email)
    if user is None or user["password"] != password:
        return None
    return {"email": email, "full_name": user["full_name"], "role": user["role"]}
