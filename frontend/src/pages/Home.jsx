import { Link } from "react-router-dom";
import "./Pages.css";

export default function Home() {
  return (
    <div className="landing">
      {/* Hero */}
      <section className="landing-hero">
        <div className="landing-inner">
          <h1 className="landing-hero-title">COFRAP</h1>
          <p className="landing-hero-tagline">Compagnie Française de Réalisation d&apos;Applicatifs Professionnels</p>
          <p className="landing-hero-desc">
            Complex, powerful enterprise management applications — ERP, groupware, and more. Recognized worldwide for quality and reliability.
          </p>
        </div>
      </section>

      {/* Services */}
      <section className="landing-section landing-services">
        <div className="landing-inner">
          <h2 className="landing-section-title">Our services</h2>
          <p className="landing-section-lead">We deliver and host the tools your business needs.</p>
          <div className="landing-cards">
            <div className="landing-card">
              <div className="landing-card-icon">◇</div>
              <h3>ERP</h3>
              <p>Enterprise resource planning: finance, inventory, HR, and operations in one integrated suite.</p>
            </div>
            <div className="landing-card">
              <div className="landing-card-icon">◆</div>
              <h3>Groupware</h3>
              <p>Collaboration, calendars, mail, and workflows to keep teams aligned and productive.</p>
            </div>
            <div className="landing-card">
              <div className="landing-card-icon">▣</div>
              <h3>Hosting</h3>
              <p>Run on your infrastructure or on COFRAP cloud — we adapt to your requirements.</p>
            </div>
            <div className="landing-card">
              <div className="landing-card-icon">◈</div>
              <h3>Security</h3>
              <p>Strong authentication: generated passwords, mandatory 2FA, and 6‑month credential rotation.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Why / Features */}
      <section className="landing-section landing-why">
        <div className="landing-inner">
          <h2 className="landing-section-title">Why COFRAP</h2>
          <ul className="landing-features">
            <li>Applications recognized for quality and power</li>
            <li>Hosting on your premises or in our cloud</li>
            <li>Secure access with automatic passwords and 2FA</li>
            <li>Credential rotation every six months</li>
          </ul>
        </div>
      </section>

      {/* Pricing */}
      <section className="landing-section landing-pricing">
        <div className="landing-inner">
          <h2 className="landing-section-title">Plans</h2>
          <p className="landing-section-lead">Choose how you want to run and host.</p>
          <div className="pricing-grid">
            <div className="pricing-card">
              <h3>On your infrastructure</h3>
              <p className="pricing-desc">We deliver and integrate. You host and operate.</p>
              <div className="pricing-price">Custom</div>
              <ul className="pricing-features">
                <li>Full ERP & groupware</li>
                <li>Your servers, your data</li>
                <li>Support & updates</li>
              </ul>
              <Link to="/contact" className="btn btn-outline">Contact us</Link>
            </div>
            <div className="pricing-card pricing-card-featured">
              <span className="pricing-badge">Popular</span>
              <h3>COFRAP Cloud</h3>
              <p className="pricing-desc">Managed hosting on our cloud. Scale and secure.</p>
              <div className="pricing-price">On request</div>
              <ul className="pricing-features">
                <li>Full ERP & groupware</li>
                <li>Managed hosting & backups</li>
                <li>2FA & rotation included</li>
              </ul>
              <Link to="/contact" className="btn btn-primary">Get started</Link>
            </div>
            <div className="pricing-card">
              <h3>Support & training</h3>
              <p className="pricing-desc">Dedicated support and training for your teams.</p>
              <div className="pricing-price">On request</div>
              <ul className="pricing-features">
                <li>Technical support</li>
                <li>On-site or remote training</li>
                <li>Custom workflows</li>
              </ul>
              <Link to="/contact" className="btn btn-outline">Contact us</Link>
            </div>
          </div>
        </div>
      </section>

    </div>
  );
}
