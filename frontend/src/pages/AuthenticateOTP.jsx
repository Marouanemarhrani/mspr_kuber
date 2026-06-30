import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuth } from "../context/AuthContext";
import { authenticate } from "../api";
import "./Pages.css";

export default function AuthenticateOTP() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setLoggedIn } = useAuth();
  const { username, password } = location.state || {};
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(null);

  if (!username || !password) {
    navigate("/authenticate", { replace: true });
    return null;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage("");
    setSuccess(null);
    if (!otp.trim() || otp.length !== 6) {
      setMessage("Enter the 6-digit code from your authenticator app.");
      setSuccess(false);
      return;
    }
    setLoading(true);
    try {
      const res = await authenticate(username, password, otp.trim());
      if (res.authenticated) {
        setLoggedIn(username, true);
        toast.success("Login successful");
        navigate("/", { replace: true });
        return;
      } else if (res.expired) {
        toast.error("Error happened, try again");
        setMessage(res.message || "Your account has expired. Create a new account and set up 2FA again.");
        setSuccess(false);
        setTimeout(() => navigate("/", { replace: true }), 2500);
      } else {
        toast.error("Error happened, try again");
        setMessage(res.error || "Invalid code. Use the current code from Google Authenticator.");
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
        <h1>Verification code</h1>
        <p className="muted">Enter the 6-digit code from Google Authenticator for <strong>{username}</strong>.</p>
        <form onSubmit={handleSubmit}>
          <label>
            <span className="label-text">Code</span>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="000000"
              maxLength={6}
              disabled={loading}
              autoComplete="one-time-code"
              className="otp-input"
              autoFocus
            />
          </label>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? "Verifying…" : "Verify and sign in"}
          </button>
        </form>
        {message && (
          <p className={success === true ? "success" : success === false ? "error" : "muted"}>
            {message}
          </p>
        )}
        <p className="back-link">
          <button type="button" className="btn btn-ghost" onClick={() => navigate("/authenticate")}>
            ← Back to sign in
          </button>
        </p>
      </div>
    </div>
  );
}
