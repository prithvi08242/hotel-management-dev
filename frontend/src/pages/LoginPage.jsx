import { useState } from "react";
import { login } from "../api";

function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const data = await login(email, password);
      setUser(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (user) {
    return (
      <section className="login-page" data-testid="login-success">
        <h1>Welcome, {user.full_name}</h1>
        <p data-testid="logged-in-role">Signed in as {user.role}</p>
      </section>
    );
  }

  return (
    <section className="login-page" data-testid="login-page">
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
    </section>
  );
}

export default LoginPage;
