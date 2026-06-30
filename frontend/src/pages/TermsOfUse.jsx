import { Link } from "react-router-dom";
import "./Pages.css";

export default function TermsOfUse() {
  return (
    <div className="static-page-full">
      <h1>Terms of Use</h1>
      <p className="muted">Terms governing use of the COFRAP platform.</p>
      <h2>1. Acceptance</h2>
      <p>
        By creating an account and using this platform, you agree to these terms and to use the service in compliance with applicable laws and your organization's policies.
      </p>
      <h2>2. Account security</h2>
      <p>
        You are responsible for keeping your credentials secure. You must use the automatically generated password and mandatory two-factor authentication (2FA) as provided. Credentials are rotated periodically; you must complete the renewal process when notified.
      </p>
      <h2>3. Acceptable use</h2>
      <p>
        You may not use the platform for unauthorized access, abuse, or any purpose that violates our policies or the law. COFRAP reserves the right to suspend or terminate accounts that violate these terms.
      </p>
      <h2>4. Changes</h2>
      <p>
        We may update these terms from time to time. Continued use of the platform after changes constitutes acceptance of the updated terms.
      </p>
      <p className="back-link-block">
        <Link to="/" className="link-inline">Back to home</Link>
      </p>
    </div>
  );
}
