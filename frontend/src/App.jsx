import { useEffect, useRef } from "react";
import { BrowserRouter, Routes, Route, Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { logout as apiLogout } from "./api";
import Home from "./pages/Home";
import LoginRegister from "./pages/LoginRegister";
import Setup2FA from "./pages/Setup2FA";
import Authenticate from "./pages/Authenticate";
import AuthenticateOTP from "./pages/AuthenticateOTP";
import About from "./pages/About";
import Contact from "./pages/Contact";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import TermsOfUse from "./pages/TermsOfUse";
import Footer from "./components/Footer";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./App.css";

function NavLink({ to, children }) {
  const location = useLocation();
  const isActive = location.pathname === to || (to !== "/" && location.pathname.startsWith(to));
  return (
    <Link to={to} className={isActive ? "nav-link active" : "nav-link"}>
      {children}
    </Link>
  );
}

function AppContent() {
  const { user, has2FA, show2FANotice, clearUser, clear2FANotice } = useAuth();
  const navigate = useNavigate();
  const noticeTimerRef = useRef(null);

  async function handleLogout() {
    try {
      await apiLogout();
    } catch {
      // Logout is stateless, so clear local auth even if the ack fails.
    }
    clearUser();
    toast.success("Logout successful");
    navigate("/", { replace: true });
  }

  const showNotice = user && has2FA === false && show2FANotice;

  useEffect(() => {
    if (!showNotice) return;
    noticeTimerRef.current = setTimeout(() => clear2FANotice(), 10000);
    return () => {
      if (noticeTimerRef.current) clearTimeout(noticeTimerRef.current);
    };
  }, [showNotice, clear2FANotice]);

  function goToSetup2FA() {
    clear2FANotice();
    navigate("/setup-2fa");
  }

  return (
    <div className="app-wrap">
      <header className="header">
        <div className="header-inner">
          <Link to="/" className="logo logo-link">COFRAP</Link>
          <nav className="nav">
            {user ? (
              <>
                <NavLink to="/">Home</NavLink>
                <NavLink to="/about">About</NavLink>
                <NavLink to="/contact">Contact</NavLink>
                {has2FA !== true && <NavLink to="/setup-2fa">Setup 2FA</NavLink>}
                <span className="nav-user">Signed in as {user}</span>
                <button type="button" className="nav-link nav-link-btn" onClick={handleLogout}>Logout</button>
              </>
            ) : (
              <>
                <NavLink to="/">Home</NavLink>
                <NavLink to="/about">About</NavLink>
                <NavLink to="/contact">Contact</NavLink>
                <NavLink to="/create-account">Create account</NavLink>
                <NavLink to="/authenticate">Sign in</NavLink>
              </>
            )}
          </nav>
        </div>
      </header>
      {showNotice && (
        <div className="notice-2fa" role="alert">
          <p className="notice-2fa-text">
            Two-factor authentication (2FA) is highly recommended for your account security. Please set it up when you can.
          </p>
          <div className="notice-2fa-actions">
            <button type="button" className="btn btn-primary notice-2fa-btn" onClick={goToSetup2FA}>
              Go to Setup 2FA
            </button>
            <button type="button" className="btn btn-secondary notice-2fa-btn" onClick={clear2FANotice}>
              Close
            </button>
          </div>
        </div>
      )}
      <main className="main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/create-account" element={<LoginRegister />} />
          <Route path="/setup-2fa" element={<Setup2FA />} />
          <Route path="/authenticate" element={<Authenticate />} />
          <Route path="/authenticate/otp" element={<AuthenticateOTP />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsOfUse />} />
        </Routes>
      </main>
      <Footer />
      <ToastContainer position="top-center" autoClose={3000} hideProgressBar theme="colored" />
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}

export default App;
