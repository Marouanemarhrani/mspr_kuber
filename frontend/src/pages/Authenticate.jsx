import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuth } from "../context/AuthContext";
import { validateCredentials } from "../api";
import "./Pages.css";

export default function Authenticate() {
  const navigate = useNavigate();
  const { setLoggedIn } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage("");
    setSuccess(null);
    if (!username.trim() || !password) {
      setMessage("Enter your username and password.");
      setSuccess(false);
      return;
    }
    setLoading(true);
    try {
      const res = await validateCredentials(username.trim(), password);
      if (res.authenticated) {
        setLoggedIn(username.trim(), res.has2FA === true ? true : false);
        toast.success("Login successful");
        navigate("/", { replace: true });
        return;
      } else if (res.need2FA) {
        navigate("/authenticate/otp", { state: { username: username.trim(), password } });
        return;
      } else if (res.expired) {
        toast.error("Error happened, try again");
        setMessage(res.message || "Your account has expired. Create a new account and set up 2FA again.");
        setSuccess(false);
        setTimeout(() => navigate("/", { replace: true }), 2500);
      } else {
        toast.error("Error happened, try again");
        setMessage(res.error || "Invalid username or password.");
        setSuccess(false);
      }
    } catch (err) {
      toast.error("Error happened, try again");
      setMessage(err.message || "Request failed");
      setSuccess(false);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page">
      <div className="card">
        <h1>Sign in</h1>
        <p className="muted">Enter your username and password. If 2FA is enabled, you’ll enter the code on the next page.</p>
        <form onSubmit={handleSubmit}>
          <label>
            <span className="label-text">Username</span>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Username"
              disabled={loading}
              autoComplete="username"
            />
          </label>
          <label>
            <span className="label-text">Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your password"
              disabled={loading}
              autoComplete="current-password"
            />
          </label>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? "Checking…" : "Continue"}
          </button>
        </form>
        {message && (
          <p className={success === true ? "success" : success === false ? "error" : "muted"}>
            {message}
          </p>
        )}
      </div>
    </div>
  );
}
