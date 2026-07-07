import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function SignupPage() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await signup(email, password, fullName);
      navigate("/rooms");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="auth-page" data-testid="signup-page">
      <h1>Create your account</h1>

      <form data-testid="signup-form" onSubmit={handleSubmit}>
        <label htmlFor="fullname-input">Full name</label>
        <input
          id="fullname-input"
          data-testid="fullname-input"
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
        />

        <label htmlFor="signup-email-input">Email</label>
        <input
          id="signup-email-input"
          data-testid="signup-email-input"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />

        <label htmlFor="signup-password-input">Password</label>
        <input
          id="signup-password-input"
          data-testid="signup-password-input"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <button type="submit" data-testid="signup-button" disabled={loading}>
          {loading ? "Creating account…" : "Create account"}
        </button>

        {error && (
          <p data-testid="signup-error" role="alert">
            {error}
          </p>
        )}
      </form>

      <p className="auth-switch">
        Already have an account? <Link to="/login" data-testid="go-to-login">Sign in</Link>
      </p>
    </section>
  );
}

export default SignupPage;
