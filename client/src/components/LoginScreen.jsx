import { useState } from "react";
import palette from "../styles/palette";
import * as Icons from "./Icons";
import Button from "./Button";
import Input from "./Input";

const DEMO_ACCOUNTS = [
  { username: "alice", email: "alice@demo.com", password: "demo123" },
  { username: "bob", email: "bob@demo.com", password: "demo123" },
  { username: "charlie", email: "charlie@demo.com", password: "demo123" },
];

export default function LoginScreen({ onLogin, onDemoLogin, loading, error }) {
  const [mode, setMode] = useState("login"); // "login" | "register"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [localError, setLocalError] = useState(null);
  const [busy, setBusy] = useState(false);

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

  return (
    <div
      style={{
        minHeight: "100vh",
        background: palette.bg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'Outfit', sans-serif",
      }}
    >
      <div
        style={{
          textAlign: "center",
          animation: "fadeUp 0.6s ease both",
          width: 340,
        }}
      >
        <div style={{ color: palette.accent, marginBottom: 16 }}>
          <Icons.Key />
        </div>
        <h1
          style={{
            fontSize: 32,
            fontWeight: 800,
            color: palette.text,
            letterSpacing: "-1px",
            marginBottom: 4,
          }}
        >
          my<span style={{ color: palette.accent }}>Escrow</span>
        </h1>
        <p
          style={{
            color: palette.textMuted,
            fontSize: 14,
            marginBottom: 32,
          }}
        >
          Trustless peer-to-peer transactions
        </p>

        {/* Error message */}
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

        {/* Login / Register Form */}
        <form onSubmit={handleSubmit}>
          <div
            style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 20 }}
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

        <p
          style={{ fontSize: 13, color: palette.textMuted, marginBottom: 28 }}
        >
          {mode === "login" ? "Don't have an account?" : "Already have an account?"}{" "}
          <span
            onClick={() => {
              setMode(mode === "login" ? "register" : "login");
              setLocalError(null);
            }}
            style={{
              color: palette.accent,
              cursor: "pointer",
              fontWeight: 600,
            }}
          >
            {mode === "login" ? "Register" : "Sign In"}
          </span>
        </p>

        {/* Divider */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 20,
          }}
        >
          <div style={{ flex: 1, height: 1, background: palette.border }} />
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
          <div style={{ flex: 1, height: 1, background: palette.border }} />
        </div>

        {/* Demo quick-login buttons */}
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
                background: palette.surface,
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
                style={{ display: "flex", alignItems: "center", gap: 10 }}
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
              <span
                style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 11,
                  color: palette.textDim,
                }}
              >
                {acc.email}
              </span>
            </button>
          ))}
        </div>

        <p
          style={{
            marginTop: 28,
            fontSize: 11,
            color: palette.textDim,
            maxWidth: 260,
            margin: "28px auto 0",
            lineHeight: 1.6,
          }}
        >
          This is a simulation for educational purposes. No real Bitcoin is
          involved.
        </p>
      </div>
    </div>
  );
}
