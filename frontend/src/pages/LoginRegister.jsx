import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { createUser } from "../api";
import "./Pages.css";

export default function LoginRegister() {
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [password, setPassword] = useState("");
  const [qrBase64, setQrBase64] = useState("");
  const [userExists, setUserExists] = useState(false);

  async function handleCreateAccount(e) {
    e.preventDefault();
    setError("");
    setPassword("");
    setQrBase64("");
    setUserExists(false);
    if (!username.trim()) {
      setError("Enter a username");
      return;
    }
    setLoading(true);
    try {
      const res = await createUser(username.trim());
      if (res && res.error) {
        if (res.error.includes("already exists") || res.error.includes("duplicate")) {
          setUserExists(true);
          setError("");
        } else {
          toast.error("Error happened, try again");
          setError(res.error);
        }
        return;
      }
      if (res && res.password) {
        setPassword(res.password);
        if (res.qr_code) setQrBase64(res.qr_code.replace(/^data:image\/[^;]+;base64,/, "") || res.qr_code);
        toast.success("Account created");
      } else if (res && !res.error) {
        const hasUsernameOnly = res.username != null && res.password == null;
        toast.error("Error happened, try again");
        setError(
          hasUsernameOnly
            ? "Backend returned the request instead of a password. Rebuild and redeploy the functions: ./build-and-push.sh then ./deploy.sh (and ensure the gateway is exposed: kubectl port-forward -n openfaas svc/gateway 8080:8080)."
            : "No password in response. Check that the OpenFaaS gateway is running (kubectl port-forward -n openfaas svc/gateway 8080:8080) and that generate-password is deployed."
        );
      }
    } catch (err) {
      toast.error("Error happened, try again");
      const msg = err.message || "Request failed";
      setError(msg === "Failed to fetch" ? "Cannot reach the API. Start the gateway (port 8080) and use npm run dev so the app can proxy to it." : msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="page">
      <div className="card">
        <h1>Create account</h1>
        <p className="muted">Register a new user. You will get a one-time password and then set up 2FA.</p>
        <form onSubmit={handleCreateAccount}>
          <label>
            <span className="label-text">Username</span>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Choose a username"
              disabled={loading}
              autoComplete="username"
            />
          </label>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? "Creating…" : "Create account"}
          </button>
        </form>
        {error && <p className="error">{error}</p>}
        {userExists && (
          <div className="info-box">
            <p><strong>This username is already registered.</strong></p>
            <p>Set up 2FA for this account or sign in:</p>
            <div className="actions">
              <Link to="/setup-2fa" className="btn btn-secondary">Setup 2FA</Link>
              <Link to="/authenticate" className="btn btn-primary">Sign in</Link>
            </div>
          </div>
        )}
        {password && (
          <div className="result-box">
            <p className="result-title">Your generated password</p>
            <p className="hint">Save it now; you will need it to sign in. Then go to Setup 2FA.</p>
            <code className="password">{password}</code>
            {qrBase64 && (
              <div className="qr-section">
                <p className="qr-label">Password backup (optional QR – do not scan with Google Authenticator)</p>
                <img src={`data:image/png;base64,${qrBase64}`} alt="Password backup QR" className="qr" />
              </div>
            )}
            <div className="actions">
              <Link to="/setup-2fa" className="btn btn-primary">Next: Setup 2FA</Link>
            </div>
          </div>
        )}
      </div>
      <div className="card card-muted">
        <p className="muted">Already have an account?</p>
        <Link to="/authenticate" className="btn btn-secondary">Sign in</Link>
      </div>
    </div>
  );
}
