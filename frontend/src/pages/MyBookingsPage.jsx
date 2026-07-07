import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { fetchMyBookings, cancelBooking } from "../api";

function MyBookingsPage() {
  const { token } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchMyBookings(token);
      setBookings(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCancel = async (id) => {
    await cancelBooking(token, id);
    load();
  };

  return (
    <section className="bookings-page" data-testid="my-bookings-page">
      <h1>My bookings</h1>

      {loading && <p data-testid="bookings-loading">Loading…</p>}
      {error && <p data-testid="bookings-error" role="alert">{error}</p>}
      {!loading && !error && bookings.length === 0 && (
        <p data-testid="bookings-empty">You have no bookings yet.</p>
      )}

      {!loading && !error && bookings.length > 0 && (
        <ul className="booking-list" data-testid="bookings-list">
          {bookings.map((b) => (
            <li key={b.id} className="booking-card" data-testid={`booking-card-${b.id}`}>
              <h2>{b.room.room_type} — Room {b.room.room_number}</h2>
              <p>{b.check_in} → {b.check_out}</p>
              <p data-testid={`booking-status-${b.id}`}>Status: {b.status}</p>
              {b.status === "confirmed" && (
                <button onClick={() => handleCancel(b.id)} data-testid={`cancel-booking-${b.id}`}>
                  Cancel booking
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default MyBookingsPage;
