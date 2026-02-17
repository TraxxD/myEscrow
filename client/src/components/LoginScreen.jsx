import { useState, useRef, useEffect } from "react";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import palette from "../styles/palette";
import * as api from "../services/api";
import * as Icons from "./Icons";
import Button from "./Button";
import Input from "./Input";
import Card from "./Card";

const DEMO_ACCOUNTS = [
  { username: "alice", email: "alice@demo.com", password: "DemoPass1" },
  { username: "bob", email: "bob@demo.com", password: "DemoPass1" },
  { username: "charlie", email: "charlie@demo.com", password: "DemoPass1" },
  { username: "admin", email: "admin@demo.com", password: "AdminPass1", isAdmin: true },
];

const CATEGORIES = [
  {
    id: "domains",
    label: "Domain Names",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
      </svg>
    ),
    color: palette.blue,
  },
  {
    id: "vehicles",
    label: "Vehicles & Auto",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M5 17h14M5 17a2 2 0 01-2-2V9a2 2 0 012-2h1l2-3h8l2 3h1a2 2 0 012 2v6a2 2 0 01-2 2M5 17a2 2 0 100 4 2 2 0 000-4zm14 0a2 2 0 100 4 2 2 0 000-4z" />
      </svg>
    ),
    color: palette.purple,
  },
  {
    id: "electronics",
    label: "Electronics",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2" ry="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" />
      </svg>
    ),
    color: palette.green,
  },
  {
    id: "merchandise",
    label: "General Merchandise",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 01-8 0" />
      </svg>
    ),
    color: palette.yellow,
  },
  {
    id: "services",
    label: "Services",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.7 6.3a1 1 0 000 1.4l1.6 1.6a1 1 0 001.4 0l3.77-3.77a6 6 0 01-7.94 7.94l-6.91 6.91a2.12 2.12 0 01-3-3l6.91-6.91a6 6 0 017.94-7.94l-3.76 3.76z" />
      </svg>
    ),
    color: palette.accent,
  },
  {
    id: "crypto",
    label: "Crypto & NFTs",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11.767 19.089c4.924.868 6.14-6.025 1.216-6.894m-1.216 6.894L5.86 18.047m5.908 1.042-.347 1.97m1.563-8.864c4.924.869 6.14-6.025 1.215-6.893m-1.215 6.893-3.94-.694m5.155-6.2L8.29 4.26m5.908 1.042.348-1.97M7.48 20.364l3.126-17.727" />
      </svg>
    ),
    color: palette.accent,
  },
];

function useWindowWidth() {
  const [width, setWidth] = useState(window.innerWidth);
  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return width;
}

export default function LoginScreen({ onLogin, onDemoLogin, onCategorySelect, loading, error }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [localError, setLocalError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [category, setCategory] = useState(null);
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSent, setForgotSent] = useState(false);
  const [forgotBusy, setForgotBusy] = useState(false);

  const width = useWindowWidth();
  const isMobile = width < 640;
  const isTablet = width < 900;

  const howRef = useRef(null);
  const featuresRef = useRef(null);
  const authRef = useRef(null);

  const displayError = error || localError;

  const handleCategoryClick = (cat) => {
    const newCat = category === cat.id ? null : cat.id;
    setCategory(newCat);
    if (onCategorySelect) {
      onCategorySelect(newCat ? cat.label : null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError(null);
    setBusy(true);
    try {
      if (mode === "register") {
        if (!username || !email || !password) {
          setLocalError("All fields are required");
          return;
        }
        await onLogin({ type: "register", username, email, password });
      } else {
        if (!email || !password) {
          setLocalError("Email and password are required");
          return;
        }
        await onLogin({ type: "login", email, password });
      }
    } catch {
      // error is set by parent via the error prop
    } finally {
      setBusy(false);
    }
  };

  const handleDemoClick = async (account) => {
    setLocalError(null);
    setBusy(true);
    try {
      await onDemoLogin(account.username, account.email, account.password);
    } catch {
      // error handled by parent
    } finally {
      setBusy(false);
    }
  };

  const isLoading = loading || busy;

  const scrollTo = (ref) => {
    ref.current?.scrollIntoView({ behavior: "smooth" });
  };

  const selectedCat = CATEGORIES.find((c) => c.id === category);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: palette.bg,
        fontFamily: "'Outfit', sans-serif",
        color: palette.text,
        overflowX: "hidden",
      }}
    >
      {/* Keyframe animations */}
      <style>{`
        @keyframes heroGlow {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.1); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>

      {/* ── Sticky Navbar ── */}
      <nav
        style={{
          position: "sticky",
          top: 0,
          zIndex: 100,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: isMobile ? "12px 16px" : "14px 40px",
          background: palette.bg + "cc",
          backdropFilter: "blur(16px)",
          borderBottom: `1px solid ${palette.border}`,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            cursor: "pointer",
          }}
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        >
          <span style={{ color: palette.accent }}>
            <Icons.Bitcoin />
          </span>
          <span
            style={{
              fontSize: isMobile ? 18 : 20,
              fontWeight: 800,
              letterSpacing: "-0.5px",
            }}
          >
            my<span style={{ color: palette.accent }}>Escrow</span>
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 12 : 32 }}>
          {!isMobile && (
            <>
              <span
                onClick={() => scrollTo(howRef)}
                style={{
                  fontSize: 14,
                  color: palette.textMuted,
                  cursor: "pointer",
                  transition: "color 0.2s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = palette.text)}
                onMouseLeave={(e) =>
                  (e.currentTarget.style.color = palette.textMuted)
                }
              >
                How It Works
              </span>
              <span
                onClick={() => scrollTo(featuresRef)}
                style={{
                  fontSize: 14,
                  color: palette.textMuted,
                  cursor: "pointer",
                  transition: "color 0.2s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.color = palette.text)}
                onMouseLeave={(e) =>
                  (e.currentTarget.style.color = palette.textMuted)
                }
              >
                Features
              </span>
            </>
          )}
          <Button size="sm" onClick={() => scrollTo(authRef)}>
            Get Started
          </Button>
        </div>
      </nav>

      {/* ── Hero Section ── */}
      <section
        style={{
          position: "relative",
          padding: isMobile ? "80px 20px 60px" : "120px 40px 100px",
          textAlign: "center",
          maxWidth: 900,
          margin: "0 auto",
          overflow: "visible",
        }}
      >
        {/* Lottie hero animation — blended background */}
        <div
          style={{
            position: "absolute",
            top: "65%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: isMobile ? 400 : 700,
            height: isMobile ? 400 : 700,
            opacity: 0.18,
            pointerEvents: "none",
            maskImage: "radial-gradient(circle, black 30%, transparent 70%)",
            WebkitMaskImage: "radial-gradient(circle, black 30%, transparent 70%)",
          }}
        >
          <DotLottieReact
            src="/hero-animation.json"
            loop
            autoplay
            style={{ width: "100%", height: "100%" }}
          />
        </div>

        <div style={{ position: "relative", zIndex: 1 }}>
          {/* Pill badge */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 16px",
              borderRadius: 100,
              background: palette.accent + "14",
              border: `1px solid ${palette.accent}30`,
              color: palette.accent,
              fontSize: 13,
              fontWeight: 600,
              marginBottom: 28,
              animation: "fadeUp 0.5s ease both",
            }}
          >
            <Icons.Shield />
            Trusted P2P Escrow
          </div>

          {/* Headline */}
          <h1
            style={{
              fontSize: isMobile ? 32 : isTablet ? 40 : 52,
              fontWeight: 800,
              letterSpacing: isMobile ? "-1px" : "-2px",
              lineHeight: 1.1,
              marginBottom: 20,
              animation: "fadeUp 0.6s ease both",
              animationDelay: "0.1s",
            }}
          >
            Secure Bitcoin Escrow
            <br />
            for{" "}
            <span style={{ color: palette.accent }}>
              Peer-to-Peer Trading
            </span>
          </h1>

          {/* Subheadline */}
          <p
            style={{
              fontSize: isMobile ? 15 : 18,
              color: palette.textMuted,
              lineHeight: 1.7,
              maxWidth: 600,
              margin: "0 auto",
              animation: "fadeUp 0.6s ease both",
              animationDelay: "0.2s",
            }}
          >
            Trade directly with anyone, anywhere. 2-of-3 multisig Bitcoin escrow
            holds funds on-chain until both parties are satisfied — trustless, transparent, verifiable.
          </p>
        </div>
      </section>

      {/* ── Blockchain Banner ── */}
      <section
        style={{
          padding: isMobile ? "0 20px 40px" : "0 40px 60px",
          maxWidth: 1100,
          margin: "0 auto",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "repeat(4, 1fr)",
            gap: 12,
          }}
        >
          {[
            { label: "NETWORK", value: "Bitcoin Testnet", color: palette.accent },
            { label: "ESCROW TYPE", value: "2-of-3 P2SH Multisig", color: palette.green },
            { label: "KEY DERIVATION", value: "BIP32 / BIP39 HD", color: palette.blue },
            { label: "MONITORING", value: "mempool.space API", color: palette.purple },
          ].map((item) => (
            <div
              key={item.label}
              style={{
                padding: "14px 18px",
                borderRadius: 12,
                background: palette.surface,
                border: `1px solid ${palette.border}`,
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: palette.textDim,
                  letterSpacing: "1px",
                  fontFamily: "'JetBrains Mono', monospace",
                  marginBottom: 6,
                }}
              >
                {item.label}
              </div>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 700,
                  color: item.color,
                  fontFamily: "'JetBrains Mono', monospace",
                }}
              >
                {item.value}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Transaction Widget + Auth Section ── */}
      <section
        ref={authRef}
        style={{
          padding: isMobile ? "0 20px 48px" : "0 40px 80px",
          maxWidth: 1100,
          margin: "0 auto",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isTablet ? "1fr" : "1fr 1fr",
            gap: isTablet ? 28 : 36,
            alignItems: "start",
          }}
        >
          {/* Left column — Transaction category selector */}
          <Card style={{ padding: isMobile ? 20 : 28 }}>
            <h3
              style={{
                fontSize: isMobile ? 18 : 20,
                fontWeight: 700,
                marginBottom: 6,
              }}
            >
              What are you looking to escrow?
            </h3>
            <p
              style={{
                fontSize: 13,
                color: palette.textMuted,
                marginBottom: 20,
                lineHeight: 1.5,
              }}
            >
              Select a category to get started with a secure transaction.
            </p>

            {/* Category grid */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(3, 1fr)",
                gap: 10,
                marginBottom: 20,
              }}
            >
              {CATEGORIES.map((cat) => {
                const isSelected = category === cat.id;
                return (
                  <button
                    key={cat.id}
                    onClick={() => handleCategoryClick(cat)}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      padding: "16px 8px",
                      borderRadius: 12,
                      background: isSelected ? cat.color + "14" : palette.bg,
                      border: `1.5px solid ${isSelected ? cat.color : palette.border}`,
                      color: isSelected ? cat.color : palette.textMuted,
                      cursor: "pointer",
                      fontFamily: "'Outfit', sans-serif",
                      fontSize: 12,
                      fontWeight: 600,
                      transition: "all 0.2s ease",
                    }}
                    onMouseEnter={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.borderColor = palette.borderLight;
                        e.currentTarget.style.color = palette.text;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isSelected) {
                        e.currentTarget.style.borderColor = palette.border;
                        e.currentTarget.style.color = palette.textMuted;
                      }
                    }}
                  >
                    <span
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: 40,
                        height: 40,
                        borderRadius: 10,
                        background: isSelected ? cat.color + "20" : palette.surfaceAlt,
                        color: isSelected ? cat.color : palette.textMuted,
                        transition: "all 0.2s ease",
                      }}
                    >
                      {cat.icon}
                    </span>
                    {cat.label}
                  </button>
                );
              })}
            </div>

            {/* Selected category CTA */}
            {selectedCat && (
              <div
                style={{
                  padding: "12px 16px",
                  borderRadius: 10,
                  background: selectedCat.color + "10",
                  border: `1px solid ${selectedCat.color}30`,
                  marginBottom: 20,
                  animation: "fadeUp 0.3s ease both",
                }}
              >
                <p style={{ fontSize: 13, color: selectedCat.color, fontWeight: 600, marginBottom: 4 }}>
                  {selectedCat.label} Escrow
                </p>
                <p style={{ fontSize: 12, color: palette.textMuted, lineHeight: 1.5 }}>
                  Sign in to create a secure escrow transaction for {selectedCat.label.toLowerCase()}.
                </p>
              </div>
            )}

            {/* Trust badges */}
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                justifyContent: "center",
                gap: isMobile ? 14 : 24,
                paddingTop: 16,
                borderTop: `1px solid ${palette.border}`,
              }}
            >
              {[
                "2-of-3 Multisig",
                "Bitcoin Testnet",
                "On-Chain Escrow",
              ].map((t) => (
                <span
                  key={t}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 12,
                    color: palette.textMuted,
                  }}
                >
                  <span style={{ color: palette.green }}>
                    <Icons.Check />
                  </span>
                  {t}
                </span>
              ))}
            </div>
          </Card>

          {/* Right column — auth card */}
          <Card style={{ padding: isMobile ? 20 : 32 }}>
            {/* Tab switcher */}
            <div
              style={{
                display: "flex",
                background: palette.bg,
                borderRadius: 10,
                padding: 4,
                marginBottom: 24,
              }}
            >
              {["login", "register"].map((m) => (
                <button
                  key={m}
                  onClick={() => {
                    setMode(m);
                    setLocalError(null);
                  }}
                  style={{
                    flex: 1,
                    padding: "10px 0",
                    fontSize: 14,
                    fontWeight: 600,
                    fontFamily: "'Outfit', sans-serif",
                    borderRadius: 8,
                    border: "none",
                    cursor: "pointer",
                    transition: "all 0.2s ease",
                    background:
                      mode === m ? palette.surfaceAlt : "transparent",
                    color: mode === m ? palette.text : palette.textDim,
                  }}
                >
                  {m === "login" ? "Sign In" : "Register"}
                </button>
              ))}
            </div>

            {/* Error */}
            {displayError && (
              <div
                style={{
                  padding: "10px 16px",
                  borderRadius: 10,
                  background: palette.red + "18",
                  border: `1px solid ${palette.red}33`,
                  color: palette.red,
                  fontSize: 13,
                  fontWeight: 500,
                  marginBottom: 20,
                }}
              >
                {displayError}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit}>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                  marginBottom: 20,
                }}
              >
                {mode === "register" && (
                  <Input
                    label="USERNAME"
                    value={username}
                    onChange={setUsername}
                    placeholder="Choose a username"
                  />
                )}
                <Input
                  label="EMAIL"
                  value={email}
                  onChange={setEmail}
                  placeholder="you@example.com"
                />
                <Input
                  label="PASSWORD"
                  value={password}
                  onChange={setPassword}
                  placeholder="Enter password"
                  type="password"
                />
                <Button
                  onClick={handleSubmit}
                  disabled={isLoading}
                  style={{ width: "100%", justifyContent: "center" }}
                >
                  {isLoading ? (
                    <span
                      style={{
                        display: "inline-block",
                        width: 16,
                        height: 16,
                        border: "2px solid rgba(255,255,255,0.3)",
                        borderTopColor: "#fff",
                        borderRadius: "50%",
                        animation: "spin 0.6s linear infinite",
                      }}
                    />
                  ) : mode === "login" ? (
                    "Sign In"
                  ) : (
                    "Create Account"
                  )}
                </Button>
                {mode === "login" && (
                  <button
                    type="button"
                    onClick={() => { setForgotMode(true); setForgotSent(false); setLocalError(null); }}
                    style={{
                      background: "none",
                      border: "none",
                      color: palette.accent,
                      cursor: "pointer",
                      fontSize: 12,
                      fontFamily: "'Outfit', sans-serif",
                      padding: "4px 0",
                      textAlign: "center",
                      width: "100%",
                    }}
                  >
                    Forgot password?
                  </button>
                )}
              </div>
            </form>

            {/* Forgot password modal */}
            {forgotMode && (
              <div
                style={{
                  padding: 16,
                  borderRadius: 10,
                  background: palette.bg,
                  border: `1px solid ${palette.border}`,
                  marginBottom: 20,
                  animation: "fadeUp 0.3s ease both",
                }}
              >
                {forgotSent ? (
                  <div style={{ textAlign: "center" }}>
                    <div style={{ fontSize: 24, marginBottom: 8 }}>{"\u2709\ufe0f"}</div>
                    <p style={{ fontSize: 14, color: palette.text, fontWeight: 600, marginBottom: 4 }}>
                      Check your email
                    </p>
                    <p style={{ fontSize: 12, color: palette.textMuted, marginBottom: 12 }}>
                      If an account exists for {forgotEmail}, a reset link has been sent.
                    </p>
                    <button
                      onClick={() => { setForgotMode(false); setForgotEmail(""); }}
                      style={{ background: "none", border: "none", color: palette.accent, cursor: "pointer", fontSize: 12, fontFamily: "'Outfit', sans-serif" }}
                    >
                      Back to sign in
                    </button>
                  </div>
                ) : (
                  <>
                    <p style={{ fontSize: 14, fontWeight: 600, color: palette.text, marginBottom: 8 }}>
                      Reset Password
                    </p>
                    <Input
                      label="EMAIL"
                      value={forgotEmail}
                      onChange={setForgotEmail}
                      placeholder="Enter your account email"
                    />
                    <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                      <button
                        onClick={() => setForgotMode(false)}
                        style={{ background: "none", border: "none", color: palette.textMuted, cursor: "pointer", fontSize: 12, fontFamily: "'Outfit', sans-serif" }}
                      >
                        Cancel
                      </button>
                      <Button
                        size="sm"
                        disabled={!forgotEmail || forgotBusy}
                        onClick={async () => {
                          setForgotBusy(true);
                          try {
                            await api.forgotPassword(forgotEmail);
                            setForgotSent(true);
                          } catch {
                            setForgotSent(true); // Don't reveal if email exists
                          } finally {
                            setForgotBusy(false);
                          }
                        }}
                      >
                        {forgotBusy ? "Sending..." : "Send Reset Link"}
                      </Button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Divider */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                marginBottom: 20,
              }}
            >
              <div
                style={{ flex: 1, height: 1, background: palette.border }}
              />
              <span
                style={{
                  fontSize: 11,
                  color: palette.textDim,
                  fontFamily: "'JetBrains Mono', monospace",
                  letterSpacing: "0.5px",
                }}
              >
                QUICK DEMO
              </span>
              <div
                style={{ flex: 1, height: 1, background: palette.border }}
              />
            </div>

            {/* Demo accounts */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 8,
              }}
            >
              {DEMO_ACCOUNTS.map((acc) => (
                <button
                  key={acc.username}
                  onClick={() => handleDemoClick(acc)}
                  disabled={isLoading}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "12px 18px",
                    borderRadius: 10,
                    background: acc.isAdmin ? palette.red + "08" : palette.bg,
                    border: `1px solid ${acc.isAdmin ? palette.red + "33" : palette.border}`,
                    color: palette.text,
                    cursor: isLoading ? "wait" : "pointer",
                    fontFamily: "'Outfit', sans-serif",
                    fontSize: 14,
                    fontWeight: 500,
                    transition: "all 0.2s ease",
                    opacity: isLoading ? 0.6 : 1,
                  }}
                  onMouseEnter={(e) => {
                    if (!isLoading) {
                      e.currentTarget.style.borderColor = acc.isAdmin ? palette.red : palette.accent;
                      e.currentTarget.style.transform = "translateX(4px)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = acc.isAdmin ? palette.red + "33" : palette.border;
                    e.currentTarget.style.transform = "none";
                  }}
                >
                  <span
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                    }}
                  >
                    <span
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: "50%",
                        background: acc.isAdmin ? palette.red + "18" : palette.accent + "18",
                        color: acc.isAdmin ? palette.red : palette.accent,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 12,
                        fontWeight: 700,
                        fontFamily: "'JetBrains Mono', monospace",
                      }}
                    >
                      {acc.username[0].toUpperCase()}
                    </span>
                    {acc.username}
                    {acc.isAdmin && (
                      <span
                        style={{
                          fontSize: 9,
                          padding: "2px 6px",
                          borderRadius: 4,
                          background: palette.red + "18",
                          color: palette.red,
                          fontWeight: 700,
                          letterSpacing: "0.5px",
                        }}
                      >
                        ADMIN
                      </span>
                    )}
                  </span>
                  {!isMobile && (
                    <span
                      style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: 11,
                        color: palette.textDim,
                      }}
                    >
                      {acc.email}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </Card>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section
        ref={howRef}
        style={{
          padding: isMobile ? "48px 20px" : "80px 40px",
          maxWidth: 1000,
          margin: "0 auto",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: isMobile ? 32 : 48 }}>
          <p
            style={{
              fontSize: 12,
              fontWeight: 700,
              color: palette.accent,
              letterSpacing: "2px",
              fontFamily: "'JetBrains Mono', monospace",
              marginBottom: 10,
            }}
          >
            HOW IT WORKS
          </p>
          <h2
            style={{
              fontSize: isMobile ? 28 : 36,
              fontWeight: 800,
              letterSpacing: "-1px",
            }}
          >
            Three Simple Steps
          </h2>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : isTablet ? "1fr 1fr" : "repeat(3, 1fr)",
            gap: 20,
          }}
        >
          {[
            {
              icon: <Icons.Plus />,
              color: palette.accent,
              title: "Agree & Create",
              desc: "Buyer and seller both agree to terms, amount, and inspection period. A unique 2-of-3 P2SH multisig address is generated on Bitcoin testnet.",
              step: "01",
            },
            {
              icon: <Icons.Lock />,
              color: palette.blue,
              title: "Fund On-Chain",
              desc: "Buyer sends BTC to the multisig escrow address. Deposits are monitored on-chain and auto-confirmed when the transaction is mined.",
              step: "02",
            },
            {
              icon: <Icons.Check />,
              color: palette.green,
              title: "Inspect & Release",
              desc: "Seller ships, buyer inspects during the inspection window. Accept releases funds instantly. Reject triggers a return flow. Disputes go to admin arbitration.",
              step: "03",
            },
          ].map((item) => (
            <Card
              key={item.step}
              animate
              style={{ textAlign: "center", padding: 32 }}
            >
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 52,
                  height: 52,
                  borderRadius: 14,
                  background: item.color + "18",
                  color: item.color,
                  marginBottom: 18,
                }}
              >
                {item.icon}
              </div>
              <p
                style={{
                  fontSize: 11,
                  color: palette.textDim,
                  fontFamily: "'JetBrains Mono', monospace",
                  marginBottom: 8,
                }}
              >
                STEP {item.step}
              </p>
              <h3
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  marginBottom: 10,
                }}
              >
                {item.title}
              </h3>
              <p
                style={{
                  fontSize: 14,
                  color: palette.textMuted,
                  lineHeight: 1.7,
                }}
              >
                {item.desc}
              </p>
            </Card>
          ))}
        </div>
      </section>

      {/* ── Features / Trust ── */}
      <section
        ref={featuresRef}
        style={{
          padding: isMobile ? "48px 20px" : "80px 40px",
          background: palette.surface,
        }}
      >
        <div
          style={{
            maxWidth: 1000,
            margin: "0 auto",
          }}
        >
          <div style={{ textAlign: "center", marginBottom: isMobile ? 32 : 48 }}>
            <p
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: palette.accent,
                letterSpacing: "2px",
                fontFamily: "'JetBrains Mono', monospace",
                marginBottom: 10,
              }}
            >
              WHY MYESCROW
            </p>
            <h2
              style={{
                fontSize: isMobile ? 28 : 36,
                fontWeight: 800,
                letterSpacing: "-1px",
              }}
            >
              Built for Trustless Trading
            </h2>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "repeat(2, 1fr)",
              gap: 20,
            }}
          >
            {[
              {
                icon: <Icons.Lock />,
                color: palette.green,
                title: "2-of-3 Multisig",
                desc: "Every escrow generates a unique P2SH address requiring 2-of-3 signatures (buyer, seller, platform). No single party can move funds alone.",
              },
              {
                icon: <Icons.Shield />,
                color: palette.accent,
                title: "On-Chain Verification",
                desc: "All deposits are tracked on Bitcoin testnet via mempool.space. Confirmations are monitored automatically — fully transparent and verifiable.",
              },
              {
                icon: <Icons.AlertTriangle />,
                color: palette.purple,
                title: "Dispute Arbitration",
                desc: "If issues arise, the platform acts as the third key holder to arbitrate. Admin reviews evidence and resolves disputes with split percentages.",
              },
              {
                icon: <Icons.Clock />,
                color: palette.blue,
                title: "Inspection Period",
                desc: "Buyers get a configurable inspection window (1-30 days) after delivery. Auto-accept triggers if no action is taken — just like escrow.com.",
              },
            ].map((item) => (
              <Card
                key={item.title}
                animate
                style={{
                  display: "flex",
                  gap: 18,
                  alignItems: "flex-start",
                  background: palette.surfaceAlt,
                }}
              >
                <div
                  style={{
                    flexShrink: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    background: item.color + "18",
                    color: item.color,
                  }}
                >
                  {item.icon}
                </div>
                <div>
                  <h3
                    style={{
                      fontSize: 16,
                      fontWeight: 700,
                      marginBottom: 6,
                    }}
                  >
                    {item.title}
                  </h3>
                  <p
                    style={{
                      fontSize: 14,
                      color: palette.textMuted,
                      lineHeight: 1.7,
                    }}
                  >
                    {item.desc}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer
        style={{
          borderTop: `1px solid ${palette.border}`,
          padding: isMobile ? "36px 20px 20px" : "48px 40px 24px",
          background: palette.surface,
        }}
      >
        <div
          style={{
            maxWidth: 1000,
            margin: "0 auto",
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "2fr 1fr 1fr",
            gap: isMobile ? 28 : 40,
            marginBottom: isMobile ? 28 : 40,
          }}
        >
          {/* Brand */}
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 12,
              }}
            >
              <span style={{ color: palette.accent }}>
                <Icons.Bitcoin />
              </span>
              <span
                style={{
                  fontSize: 18,
                  fontWeight: 800,
                  letterSpacing: "-0.5px",
                }}
              >
                my<span style={{ color: palette.accent }}>Escrow</span>
              </span>
            </div>
            <p
              style={{
                fontSize: 14,
                color: palette.textMuted,
                lineHeight: 1.7,
                maxWidth: 280,
              }}
            >
              Trustless peer-to-peer Bitcoin escrow. Trade directly with
              confidence, backed by smart dispute resolution.
            </p>
          </div>

          {/* Product links */}
          <div>
            <h4
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: palette.textDim,
                letterSpacing: "1px",
                fontFamily: "'JetBrains Mono', monospace",
                marginBottom: 16,
              }}
            >
              PRODUCT
            </h4>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              {["How It Works", "Features", "Get Started"].map(
                (label, i) => (
                  <span
                    key={label}
                    onClick={() =>
                      scrollTo(
                        [howRef, featuresRef, authRef][i]
                      )
                    }
                    style={{
                      fontSize: 14,
                      color: palette.textMuted,
                      cursor: "pointer",
                      transition: "color 0.2s",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.color = palette.text)
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.color = palette.textMuted)
                    }
                  >
                    {label}
                  </span>
                )
              )}
            </div>
          </div>

          {/* Info links */}
          <div>
            <h4
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: palette.textDim,
                letterSpacing: "1px",
                fontFamily: "'JetBrains Mono', monospace",
                marginBottom: 16,
              }}
            >
              INFO
            </h4>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              {["Security", "Privacy", "Terms"].map((label) => (
                <span
                  key={label}
                  style={{
                    fontSize: 14,
                    color: palette.textMuted,
                    cursor: "default",
                  }}
                >
                  {label}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div
          style={{
            borderTop: `1px solid ${palette.border}`,
            paddingTop: 20,
            display: "flex",
            flexDirection: isMobile ? "column" : "row",
            justifyContent: "space-between",
            alignItems: isMobile ? "center" : "center",
            gap: isMobile ? 8 : 0,
            textAlign: isMobile ? "center" : "left",
          }}
        >
          <span style={{ fontSize: 12, color: palette.textDim }}>
            &copy; 2026 myEscrow. Simulation only.
          </span>
          <span
            style={{
              fontSize: 11,
              color: palette.textDim,
              fontFamily: "'JetBrains Mono', monospace",
              letterSpacing: "0.5px",
            }}
          >
            SIMULATION ONLY &middot; NO REAL BTC &middot; EDUCATIONAL PURPOSE
          </span>
        </div>
      </footer>
    </div>
  );
}
