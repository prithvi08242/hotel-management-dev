import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { createBooking } from "../api";

function BookingPage() {
  const { roomId } = useParams();
  const { token } = useAuth();
  const navigate = useNavigate();
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await createBooking(token, parseInt(roomId, 10), checkIn, checkOut);
      setSuccess(true);
      setTimeout(() => navigate("/my-bookings"), 1200);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <section className="booking-page" data-testid="booking-success">
        <h1>Booking confirmed</h1>
        <p>Redirecting to your bookings…</p>
      </section>
    );
  }

  return (
    <section className="booking-page" data-testid="booking-page">
      <h1>Book Room #{roomId}</h1>

      <form data-testid="booking-form" onSubmit={handleSubmit}>
        <label htmlFor="booking-check-in">Check-in</label>
        <input
          id="booking-check-in"
          data-testid="booking-check-in"
          type="date"
          value={checkIn}
          onChange={(e) => setCheckIn(e.target.value)}
          required
        />

        <label htmlFor="booking-check-out">Check-out</label>
        <input
          id="booking-check-out"
          data-testid="booking-check-out"
          type="date"
          value={checkOut}
          onChange={(e) => setCheckOut(e.target.value)}
          required
        />

        <button type="submit" data-testid="confirm-booking-button" disabled={loading}>
          {loading ? "Booking…" : "Confirm booking"}
        </button>

        {error && (
          <p data-testid="booking-error" role="alert">
            {error}
          </p>
        )}
      </form>
    </section>
  );
}

export default BookingPage;
