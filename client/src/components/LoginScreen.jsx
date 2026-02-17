import { useState, useRef, useEffect } from "react";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import palette from "../styles/palette";
import * as Icons from "./Icons";
import Button from "./Button";
import Input from "./Input";
import Card from "./Card";

const DEMO_ACCOUNTS = [
  { username: "alice", email: "alice@demo.com", password: "DemoPass1" },
  { username: "bob", email: "bob@demo.com", password: "DemoPass1" },
  { username: "charlie", email: "charlie@demo.com", password: "DemoPass1" },
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

export default function LoginScreen({ onLogin, onDemoLogin, loading, error }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [localError, setLocalError] = useState(null);
  const [busy, setBusy] = useState(false);

  const width = useWindowWidth();
  const isMobile = width < 640;
  const isTablet = width < 900;

  const howRef = useRef(null);
  const featuresRef = useRef(null);
  const authRef = useRef(null);

  const displayError = error || localError;

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
          padding: isMobile ? "60px 20px 48px" : "100px 40px 80px",
          textAlign: "center",
          maxWidth: 900,
          margin: "0 auto",
        }}
      >
        {/* Lottie hero animation — blended background */}
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: isMobile ? 350 : 600,
            height: isMobile ? 350 : 600,
            opacity: 0.15,
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
              margin: "0 auto 36px",
              animation: "fadeUp 0.6s ease both",
              animationDelay: "0.2s",
            }}
          >
            Trade directly with anyone, anywhere. Our escrow holds funds safely
            until both parties are satisfied — no middlemen, no surprises.
          </p>

          {/* CTA buttons */}
          <div
            style={{
              display: "flex",
              flexDirection: isMobile ? "column" : "row",
              gap: 14,
              justifyContent: "center",
              alignItems: "center",
              marginBottom: isMobile ? 32 : 48,
              animation: "fadeUp 0.6s ease both",
              animationDelay: "0.3s",
            }}
          >
            <Button size="lg" onClick={() => scrollTo(authRef)}>
              Start Trading <Icons.ArrowRight />
            </Button>
            <Button
              size="lg"
              variant="secondary"
              onClick={() => scrollTo(howRef)}
            >
              See How It Works
            </Button>
          </div>

          {/* Trust row */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              justifyContent: "center",
              gap: isMobile ? 16 : 32,
              animation: "fadeUp 0.6s ease both",
              animationDelay: "0.4s",
            }}
          >
            {[
              "256-bit Security",
              "Instant Setup",
              "Zero Fees",
            ].map((t) => (
              <span
                key={t}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 13,
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
              title: "Create an Escrow",
              desc: "Buyer creates a deal with the terms, amount, and counterparty. Both sides agree before any funds move.",
              step: "01",
            },
            {
              icon: <Icons.Wallet />,
              color: palette.blue,
              title: "Fund the Deal",
              desc: "Buyer deposits Bitcoin into the secure escrow wallet. Funds are locked until the deal conditions are met.",
              step: "02",
            },
            {
              icon: <Icons.Check />,
              color: palette.green,
              title: "Release Payment",
              desc: "Once the buyer confirms delivery, funds are released to the seller instantly. Disputes are handled fairly.",
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
                icon: <Icons.Shield />,
                color: palette.green,
                title: "Escrow Protection",
                desc: "Funds are held securely in escrow until both parties confirm the deal is complete. No one can access them prematurely.",
              },
              {
                icon: <Icons.AlertTriangle />,
                color: palette.purple,
                title: "Dispute Resolution",
                desc: "If something goes wrong, our resolution process ensures a fair outcome for both buyers and sellers.",
              },
              {
                icon: <Icons.Clock />,
                color: palette.blue,
                title: "Instant Settlement",
                desc: "Once confirmed, payments are released immediately. No waiting periods, no delays — just fast, reliable transfers.",
              },
              {
                icon: <Icons.Lock />,
                color: palette.accent,
                title: "Full Transparency",
                desc: "Every transaction is tracked and visible. Both parties can verify the deal status at any time.",
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

      {/* ── Auth Section ── */}
      <section
        ref={authRef}
        style={{
          padding: isMobile ? "48px 20px" : "80px 40px",
          maxWidth: 1000,
          margin: "0 auto",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isTablet ? "1fr" : "1fr 1fr",
            gap: isTablet ? 32 : 48,
            alignItems: "center",
          }}
        >
          {/* Left column — marketing copy */}
          <div style={{ textAlign: isTablet ? "center" : "left" }}>
            <h2
              style={{
                fontSize: isMobile ? 28 : 36,
                fontWeight: 800,
                letterSpacing: "-1px",
                marginBottom: 16,
              }}
            >
              Start Trading
              <br />
              <span style={{ color: palette.accent }}>in Seconds</span>
            </h2>
            <p
              style={{
                fontSize: 16,
                color: palette.textMuted,
                lineHeight: 1.7,
                marginBottom: 28,
              }}
            >
              Create an account or sign in to start using myEscrow. Set up
              deals, fund your wallet, and trade peer-to-peer with confidence.
            </p>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 16,
                alignItems: isTablet ? "center" : "flex-start",
              }}
            >
              {[
                "No KYC required to get started",
                "Create your first escrow in under a minute",
                "Built-in dispute resolution for every deal",
                "Fully transparent transaction history",
              ].map((t) => (
                <div
                  key={t}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    fontSize: 14,
                    color: palette.textMuted,
                  }}
                >
                  <span
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 22,
                      height: 22,
                      borderRadius: "50%",
                      background: palette.green + "18",
                      color: palette.green,
                      flexShrink: 0,
                    }}
                  >
                    <Icons.Check />
                  </span>
                  {t}
                </div>
              ))}
            </div>
          </div>

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
              </div>
            </form>

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
                    background: palette.bg,
                    border: `1px solid ${palette.border}`,
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
                      e.currentTarget.style.borderColor = palette.accent;
                      e.currentTarget.style.transform = "translateX(4px)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = palette.border;
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
                        background: palette.accent + "18",
                        color: palette.accent,
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
