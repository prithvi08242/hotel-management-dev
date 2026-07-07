import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { fetchRooms } from "../api";

function RoomListPage() {
  const { user } = useAuth();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [roomType, setRoomType] = useState("");
  const [checkIn, setCheckIn] = useState("");
  const [checkOut, setCheckOut] = useState("");

  const load = async (filters = {}) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchRooms(filters);
      setRooms(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    load({ roomType: roomType || undefined, checkIn: checkIn || undefined, checkOut: checkOut || undefined });
  };

  const roomTypeCount = new Set(rooms.map((r) => r.room_type)).size;
  const cheapest = rooms.length ? Math.min(...rooms.map((r) => r.price_per_night)) : null;

  return (
    <section className="room-list" data-testid="room-list-page">
      <div className="hero">
        <h1>Find your room</h1>
        <p className="hero-sub">Search by type, price, and dates — availability updates as you book.</p>
        <div className="hero-stats">
          <div className="hero-stat">
            <span className="num">{rooms.length}</span>
            <span className="label">Available now</span>
          </div>
          <div className="hero-stat">
            <span className="num">{roomTypeCount}</span>
            <span className="label">Room types</span>
          </div>
          <div className="hero-stat">
            <span className="num">{cheapest !== null ? `$${cheapest}` : "—"}</span>
            <span className="label">From / night</span>
          </div>
        </div>
      </div>

      <form className="room-filters" data-testid="room-search-form" onSubmit={handleSearch}>
        <div>
          <label htmlFor="room-type-select">Room type</label>
          <select id="room-type-select" data-testid="room-type-filter" value={roomType} onChange={(e) => setRoomType(e.target.value)}>
            <option value="">Any</option>
            <option value="single">Single</option>
            <option value="double">Double</option>
            <option value="suite">Suite</option>
          </select>
        </div>

        <div>
          <label htmlFor="check-in-input">Check-in</label>
          <input id="check-in-input" data-testid="check-in-filter" type="date" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} />
        </div>

        <div>
          <label htmlFor="check-out-input">Check-out</label>
          <input id="check-out-input" data-testid="check-out-filter" type="date" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} />
        </div>

        <button type="submit" data-testid="search-button">Search</button>
      </form>

      {loading && <p data-testid="room-list-loading">Loading rooms…</p>}
      {error && <p data-testid="room-list-error" role="alert">Couldn&apos;t load rooms: {error}</p>}
      {!loading && !error && rooms.length === 0 && <p data-testid="room-list-empty">No rooms match your search.</p>}

      {!loading && !error && rooms.length > 0 && (
        <ul className="room-cards" data-testid="room-results">
          {rooms.map((room) => (
            <li key={room.id} className="room-card" data-testid={`room-card-${room.id}`}>
              <div className="stub-main">
                <h2>{room.room_type} — Room {room.room_number}</h2>
                <p>{room.description}</p>
                <p>Sleeps up to {room.max_occupancy}</p>
              </div>
              <div className="stub-divider" />
              <div className="stub-price">
                <span className="price" data-testid={`room-price-${room.id}`}>
                  ${room.price_per_night.toFixed(2)}<span> / night</span>
                </span>
                {user ? (
                  <Link to={`/book/${room.id}`} data-testid={`book-room-${room.id}`}>Book this room</Link>
                ) : (
                  <Link to="/login" data-testid={`book-room-${room.id}`}>Sign in to book</Link>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default RoomListPage;
