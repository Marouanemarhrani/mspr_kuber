import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuth } from "../context/AuthContext";
import { generate2FA } from "../api";
import "./Pages.css";

export default function Setup2FA() {
  const navigate = useNavigate();
  const { user, has2FA } = useAuth();
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [qrBase64, setQrBase64] = useState("");
  const [secret, setSecret] = useState("");

  useEffect(() => {
    if (user && has2FA === true) {
      toast.info("2FA already set up for your account.");
      navigate("/", { replace: true });
    }
  }, [user, has2FA, navigate]);

  useEffect(() => {
    if (user) setUsername(user);
  }, [user]);

  if (user && has2FA === true) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setQrBase64("");
    setSecret("");
    if (!username.trim()) {
      setError("Enter your username");
      return;
    }
    setLoading(true);
    try {
      const res = await generate2FA(username.trim());
      if (res.error) {
        if (res.alreadyActivated) {
          toast.info("2FA already activated for this account.");
          navigate("/", { replace: true });
          return;
        }
        toast.error("Error happened, try again");
        setError(res.error);
        return;
      }
      if (res.qr_code) setQrBase64(res.qr_code.replace(/^data:image\/[^;]+;base64,/, "") || res.qr_code);
      if (res.secret) setSecret(res.secret);
      toast.success("2FA set up");
    } catch (err) {
      toast.error("Error happened, try again");
      setError(err.message || "Request failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page">
      <div className="card">
        <h1>Setup 2FA</h1>
        <p className="muted">Generate a 2FA secret for your account. Scan the QR code with Google Authenticator (or another app).</p>
        <form onSubmit={handleSubmit}>
          <label>
            <span className="label-text">Username</span>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Your username"
              disabled={loading}
              autoComplete="username"
            />
          </label>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? "Generating…" : "Generate 2FA"}
          </button>
        </form>
        {error && <p className="error">{error}</p>}
        {qrBase64 && (
          <div className="result-box highlight">
            <p className="result-title">Scan with Google Authenticator</p>
            <p className="hint">Open Google Authenticator (or similar), add an account, and scan this QR code. Do not use the QR from the Create account page.</p>
            <div className="qr-wrapper">
              <img src={`data:image/png;base64,${qrBase64}`} alt="2FA – scan with Google Authenticator" className="qr qr-2fa" />
            </div>
            {secret && (
              <div className="secret-section">
                <p className="label-text">Or enter this secret manually</p>
                <code className="secret">{secret}</code>
              </div>
            )}
            <Link to="/authenticate" className="btn btn-primary">Go to Sign in</Link>
          </div>
        )}
      </div>
    </div>
  );
}
