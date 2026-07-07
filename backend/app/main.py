from datetime import date
from typing import Optional

from fastapi import FastAPI, HTTPException, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import and_

from app.database import get_db
from app.models import User, Room, Booking
from app.auth import authenticate, create_access_token, get_current_user, require_admin

app = FastAPI(title="Wayfarer API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Schema is managed by Alembic migrations (backend/alembic/). Run
# `alembic upgrade head` before starting the app.


@app.on_event("startup")
def seed_data():
    db = next(get_db())
    if db.query(User).count() == 0:
        db.add_all(
            [
                User(email="guest@w.com", password="guest", full_name="Demo Guest", role="guest"),
                User(email="admin@w.com", password="admin", full_name="Demo Admin", role="admin"),
            ]
        )
    if db.query(Room).count() == 0:
        db.add_all(
            [
                Room(room_number="101", room_type="single", price_per_night=89.00,
                     max_occupancy=1, description="Cozy single room with city view."),
                Room(room_number="102", room_type="double", price_per_night=129.00,
                     max_occupancy=2, description="Double room with queen bed."),
                Room(room_number="201", room_type="suite", price_per_night=249.00,
                     max_occupancy=4, description="Executive suite with lounge area."),
            ]
        )
    db.commit()
    db.close()


@app.get("/api/health")
def health():
    return {"status": "ok"}


# ---------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------

class SignupRequest(BaseModel):
    email: str
    password: str
    full_name: str


class LoginRequest(BaseModel):
    email: str
    password: str


def _user_response(user: User):
    return {"email": user.email, "full_name": user.full_name, "role": user.role}


@app.post("/api/signup")
def signup(payload: SignupRequest, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=409, detail="An account with this email already exists")

    user = User(
        email=payload.email,
        password=payload.password,
        full_name=payload.full_name,
        role="guest",
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token(user.email, user.role)
    return {"access_token": token, "token_type": "bearer", "user": _user_response(user)}


@app.post("/api/login")
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    user = authenticate(db, payload.email, payload.password)
    if user is None:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_access_token(user.email, user.role)
    return {"access_token": token, "token_type": "bearer", "user": _user_response(user)}


# ---------------------------------------------------------------------
# Rooms
# ---------------------------------------------------------------------

def _room_response(room: Room):
    return {
        "id": room.id,
        "room_number": room.room_number,
        "room_type": room.room_type,
        "price_per_night": float(room.price_per_night),
        "max_occupancy": room.max_occupancy,
        "description": room.description,
    }


@app.get("/api/rooms")
def list_rooms(
    room_type: Optional[str] = Query(None),
    max_price: Optional[float] = Query(None, ge=0),
    min_occupancy: Optional[int] = Query(None, ge=1),
    check_in: Optional[date] = Query(None),
    check_out: Optional[date] = Query(None),
    db: Session = Depends(get_db),
):
    query = db.query(Room).filter(Room.is_available.is_(True))

    if room_type:
        query = query.filter(Room.room_type == room_type)
    if max_price is not None:
        query = query.filter(Room.price_per_night <= max_price)
    if min_occupancy is not None:
        query = query.filter(Room.max_occupancy >= min_occupancy)

    rooms = query.all()

    # Exclude rooms with an overlapping confirmed booking, if dates given.
    if check_in and check_out:
        booked_room_ids = {
            b.room_id
            for b in db.query(Booking).filter(
                Booking.status == "confirmed",
                Booking.check_in < check_out,
                Booking.check_out > check_in,
            )
        }
        rooms = [r for r in rooms if r.id not in booked_room_ids]

    return [_room_response(r) for r in rooms]


# ---------------------------------------------------------------------
# Bookings
# ---------------------------------------------------------------------

class BookingRequest(BaseModel):
    room_id: int
    check_in: date
    check_out: date


def _booking_response(booking: Booking):
    return {
        "id": booking.id,
        "room": _room_response(booking.room),
        "check_in": booking.check_in.isoformat(),
        "check_out": booking.check_out.isoformat(),
        "status": booking.status,
    }


@app.post("/api/bookings")
def create_booking(
    payload: BookingRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if payload.check_out <= payload.check_in:
        raise HTTPException(status_code=422, detail="check_out must be after check_in")

    room = db.query(Room).filter(Room.id == payload.room_id).first()
    if room is None:
        raise HTTPException(status_code=404, detail="Room not found")

    overlap = (
        db.query(Booking)
        .filter(
            Booking.room_id == payload.room_id,
            Booking.status == "confirmed",
            Booking.check_in < payload.check_out,
            Booking.check_out > payload.check_in,
        )
        .first()
    )
    if overlap:
        raise HTTPException(status_code=409, detail="Room is already booked for those dates")

    booking = Booking(
        user_id=current_user.id,
        room_id=payload.room_id,
        check_in=payload.check_in,
        check_out=payload.check_out,
        status="confirmed",
    )
    db.add(booking)
    db.commit()
    db.refresh(booking)
    return _booking_response(booking)


@app.get("/api/bookings/me")
def my_bookings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    bookings = (
        db.query(Booking)
        .filter(Booking.user_id == current_user.id)
        .order_by(Booking.check_in.desc())
        .all()
    )
    return [_booking_response(b) for b in bookings]


@app.delete("/api/bookings/{booking_id}")
def cancel_booking(
    booking_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if booking is None:
        raise HTTPException(status_code=404, detail="Booking not found")
    if booking.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not your booking")

    booking.status = "cancelled"
    db.commit()
    return {"status": "cancelled"}


# ---------------------------------------------------------------------
# Admin
# ---------------------------------------------------------------------

class RoomCreateRequest(BaseModel):
    room_number: str
    room_type: str
    price_per_night: float
    max_occupancy: int
    description: Optional[str] = None


@app.get("/api/admin/bookings")
def admin_list_bookings(
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    bookings = db.query(Booking).order_by(Booking.created_at.desc()).all()
    return [
        {
            **_booking_response(b),
            "guest_email": b.user.email,
            "guest_name": b.user.full_name,
        }
        for b in bookings
    ]


@app.post("/api/admin/rooms")
def admin_create_room(
    payload: RoomCreateRequest,
    db: Session = Depends(get_db),
    _admin: User = Depends(require_admin),
):
    existing = db.query(Room).filter(Room.room_number == payload.room_number).first()
    if existing:
        raise HTTPException(status_code=409, detail="Room number already exists")

    room = Room(
        room_number=payload.room_number,
        room_type=payload.room_type,
        price_per_night=payload.price_per_night,
        max_occupancy=payload.max_occupancy,
        description=payload.description,
    )
    db.add(room)
    db.commit()
    db.refresh(room)
    return _room_response(room)
