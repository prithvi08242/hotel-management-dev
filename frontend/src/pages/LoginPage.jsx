import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      navigate("/rooms");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="auth-page" data-testid="login-page">
      <h1>Sign in to Wayfarer</h1>

      <form data-testid="login-form" onSubmit={handleSubmit}>
        <label htmlFor="email-input">Email</label>
        <input
          id="email-input"
          data-testid="email-input"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <label htmlFor="password-input">Password</label>
        <input
          id="password-input"
          data-testid="password-input"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <button type="submit" data-testid="login-button" disabled={loading}>
          {loading ? "Signing in…" : "Sign in"}
        </button>

        {error && (
          <p data-testid="login-error" role="alert">
            {error}
          </p>
        )}
      </form>

      <p className="auth-switch">
        New here? <Link to="/signup" data-testid="go-to-signup">Create an account</Link>
      </p>
    </section>
  );
}

export default LoginPage;
