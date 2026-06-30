import { Link } from "react-router-dom";
import "./Pages.css";

export default function About() {
  return (
    <div className="static-page-full">
      <h1>About COFRAP</h1>
      <p className="muted">
        <strong>COFRAP</strong> (Compagnie Française de Réalisation d&apos;Applicatifs Professionnels) develops and delivers complex, powerful enterprise management applications.
      </p>
      <p>
        Our solutions include ERP, groupware, and other web-based management tools, recognized for their quality and reliability. We offer hosting either on your infrastructure or on COFRAP cloud infrastructure.
      </p>
      <p>
        This platform provides secure account creation and sign-in with automatically generated passwords, mandatory two-factor authentication (2FA), and periodic rotation of credentials to protect your access.
      </p>
      <p className="back-link-block">
        <Link to="/" className="link-inline">Back to home</Link>
      </p>
    </div>
  );
}
