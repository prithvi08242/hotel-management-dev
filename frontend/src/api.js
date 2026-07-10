const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "";

async function handle(res) {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `Request failed (${res.status})`);
  }
  return res.json();
}

export async function login(email, password) {
  const res = await fetch(`${BACKEND_URL}/api/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return handle(res);
}

export async function signup(email, password, fullName) {
  const res = await fetch(`${BACKEND_URL}/api/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, full_name: fullName }),
  });
  return handle(res);
}

export async function fetchRooms(filters = {}) {
  const params = new URLSearchParams();
  if (filters.roomType) params.set("room_type", filters.roomType);
  if (filters.maxPrice) params.set("max_price", filters.maxPrice);
  if (filters.checkIn) params.set("check_in", filters.checkIn);
  if (filters.checkOut) params.set("check_out", filters.checkOut);

  const res = await fetch(`${BACKEND_URL}/api/rooms?${params.toString()}`);
  return handle(res);
}

export async function createBooking(token, roomId, checkIn, checkOut) {
  const res = await fetch(`${BACKEND_URL}/api/bookings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ room_id: roomId, check_in: checkIn, check_out: checkOut }),
  });
  return handle(res);
}

export async function fetchMyBookings(token) {
  const res = await fetch(`${BACKEND_URL}/api/bookings/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return handle(res);
}

export async function cancelBooking(token, bookingId) {
  const res = await fetch(`${BACKEND_URL}/api/bookings/${bookingId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
  return handle(res);
}

export async function fetchAdminBookings(token) {
  const res = await fetch(`${BACKEND_URL}/api/admin/bookings`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  return handle(res);
}

export async function createRoom(token, room) {
  const res = await fetch(`${BACKEND_URL}/api/admin/rooms`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(room),
  });
  return handle(res);
}