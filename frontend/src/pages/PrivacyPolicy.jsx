import { Link } from "react-router-dom";
import "./Pages.css";

export default function PrivacyPolicy() {
  return (
    <div className="static-page-full">
      <h1>Privacy Policy</h1>
      <p className="muted">Last updated: 2025. Information we collect and how we use it.</p>
      <h2>1. Data we collect</h2>
      <p>
        To provide account and authentication services, we store your username, an encrypted password, and an encrypted two-factor authentication (2FA) secret. We also store a generation date and an expiration flag for security rotation.
      </p>
      <h2>2. How we use it</h2>
      <p>
        This data is used solely to authenticate you and to enforce our security policy (including mandatory 2FA and periodic credential rotation). We do not sell your data to third parties.
      </p>
      <h2>3. Security</h2>
      <p>
        Passwords and 2FA secrets are encrypted at rest. Access to the platform is protected by strong authentication.
      </p>
      <h2>4. Your rights</h2>
      <p>
        You may request information about the data we hold about you or request its deletion, subject to applicable law and our retention requirements.
      </p>
      <p className="back-link-block">
        <Link to="/" className="link-inline">Back to home</Link>
      </p>
    </div>
  );
}
