import { Link } from "react-router-dom";
import "./Pages.css";

export default function Contact() {
  return (
    <div className="static-page-full">
      <h1>Contact</h1>
      <p className="muted">
        Get in touch with COFRAP for questions about our services, hosting options, or this platform.
      </p>
      <p>
        <strong>COFRAP</strong><br />
        Compagnie Française de Réalisation d&apos;Applicatifs Professionnels
      </p>
      <p>
        For general inquiries or support, please contact your account manager or use the channels provided by your organization.
      </p>
      <p className="back-link-block">
        <Link to="/" className="link-inline">Back to home</Link>
      </p>
    </div>
  );
}
