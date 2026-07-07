import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { fetchAdminBookings, createRoom } from "../api";

function AdminDashboardPage() {
  const { token } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [roomNumber, setRoomNumber] = useState("");
  const [roomType, setRoomType] = useState("single");
  const [price, setPrice] = useState("");
  const [occupancy, setOccupancy] = useState("");
  const [roomError, setRoomError] = useState(null);
  const [roomSuccess, setRoomSuccess] = useState(false);

  const loadBookings = async () => {
    setLoading(true);
    try {
      const data = await fetchAdminBookings(token);
      setBookings(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBookings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleAddRoom = async (e) => {
    e.preventDefault();
    setRoomError(null);
    setRoomSuccess(false);
    try {
      await createRoom(token, {
        room_number: roomNumber,
        room_type: roomType,
        price_per_night: parseFloat(price),
        max_occupancy: parseInt(occupancy, 10),
      });
      setRoomSuccess(true);
      setRoomNumber("");
      setPrice("");
      setOccupancy("");
    } catch (err) {
      setRoomError(err.message);
    }
  };

  const confirmedCount = bookings.filter((b) => b.status === "confirmed").length;
  const cancelledCount = bookings.filter((b) => b.status === "cancelled").length;

  return (
    <section className="admin-page" data-testid="admin-dashboard-page">
      <div className="hero">
        <h1>Admin dashboard</h1>
        <p className="hero-sub">Manage rooms and monitor bookings across the property.</p>
      </div>

      <div className="admin-stats">
        <div className="stat-card">
          <span className="num" data-testid="stat-total-bookings">{bookings.length}</span>
          <span className="label">Total bookings</span>
        </div>
        <div className="stat-card">
          <span className="num" data-testid="stat-confirmed-bookings">{confirmedCount}</span>
          <span className="label">Confirmed</span>
        </div>
        <div className="stat-card">
          <span className="num" data-testid="stat-cancelled-bookings">{cancelledCount}</span>
          <span className="label">Cancelled</span>
        </div>
      </div>

      <h2>Add a room</h2>
      <form data-testid="add-room-form" onSubmit={handleAddRoom}>
        <label htmlFor="admin-room-number">Room number</label>
        <input
          id="admin-room-number"
          data-testid="admin-room-number"
          value={roomNumber}
          onChange={(e) => setRoomNumber(e.target.value)}
          required
        />

        <label htmlFor="admin-room-type">Room type</label>
        <select
          id="admin-room-type"
          data-testid="admin-room-type"
          value={roomType}
          onChange={(e) => setRoomType(e.target.value)}
        >
          <option value="single">Single</option>
          <option value="double">Double</option>
          <option value="suite">Suite</option>
        </select>

        <label htmlFor="admin-room-price">Price per night</label>
        <input
          id="admin-room-price"
          data-testid="admin-room-price"
          type="number"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          required
        />

        <label htmlFor="admin-room-occupancy">Max occupancy</label>
        <input
          id="admin-room-occupancy"
          data-testid="admin-room-occupancy"
          type="number"
          value={occupancy}
          onChange={(e) => setOccupancy(e.target.value)}
          required
        />

        <button type="submit" data-testid="add-room-button">Add room</button>

        {roomError && <p data-testid="add-room-error" role="alert">{roomError}</p>}
        {roomSuccess && <p data-testid="add-room-success">Room added.</p>}
      </form>

      <h2>All bookings</h2>
      {loading && <p data-testid="admin-bookings-loading">Loading…</p>}
      {error && <p data-testid="admin-bookings-error" role="alert">{error}</p>}
      {!loading && !error && (
        <ul className="booking-list" data-testid="admin-bookings-list">
          {bookings.map((b) => (
            <li key={b.id} data-testid={`admin-booking-${b.id}`}>
              {b.guest_name} ({b.guest_email}) — {b.room.room_type} #{b.room.room_number} —{" "}
              {b.check_in} to {b.check_out} — {b.status}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default AdminDashboardPage;
