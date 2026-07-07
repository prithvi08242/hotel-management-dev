import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function NavBar() {
  const { user, logout } = useAuth();

  return (
    <nav className="nav-bar" data-testid="nav-bar">
      <Link to="/rooms" data-testid="nav-rooms">Rooms</Link>
      <Link to="/login" data-testid="nav-login">Login</Link>
      <Link to="/signup" data-testid="nav-signup">Signup</Link>
      <Link to="/my-bookings" data-testid="nav-my-bookings">My Bookings</Link>
      <Link to="/admin" data-testid="nav-admin">Admin</Link>

      <span className="nav-spacer" />

      {user ? (
        <>
          <span data-testid="nav-user-info">{user.full_name} ({user.role})</span>
          <button onClick={logout} data-testid="nav-logout">Log out</button>
        </>
      ) : (
        <span data-testid="nav-user-info">Not signed in</span>
      )}
    </nav>
  );
}

export default NavBar;
