import { Link } from "react-router-dom";
import "./Footer.css";

export default function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-brand">COFRAP</div>
        <p className="footer-tagline">Compagnie Française de Réalisation d&apos;Applicatifs Professionnels</p>
        <nav className="footer-nav" aria-label="Footer">
          <Link to="/privacy-policy">Privacy Policy</Link>
          <Link to="/terms">Terms of Use</Link>
        </nav>
        <p className="footer-copy">&copy; {year} COFRAP. All rights reserved.</p>
      </div>
    </footer>
  );
}
