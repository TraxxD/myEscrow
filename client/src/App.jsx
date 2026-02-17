import { useState, useCallback, useEffect } from "react";
import palette from "./styles/palette";
import { formatBTC } from "./utils/helpers";
import * as api from "./services/api";
import useAuth from "./hooks/useAuth";
import LoginScreen from "./components/LoginScreen";
import Dashboard from "./components/Dashboard";
import CreateEscrowForm from "./components/CreateEscrowForm";
import EscrowDetail from "./components/EscrowDetail";
import Button from "./components/Button";
import * as Icons from "./components/Icons";

export default function App() {
  const auth = useAuth();
  const [escrows, setEscrows] = useState([]);
  const [view, setView] = useState("dashboard");
  const [selectedEscrow, setSelectedEscrow] = useState(null);
  const [notification, setNotification] = useState(null);
  const [loadingEscrows, setLoadingEscrows] = useState(false);

  const showNotification = useCallback((msg, type = "success") => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 3000);
  }, []);

  // Fetch escrows when user logs in
  const fetchEscrows = useCallback(async () => {
    setLoadingEscrows(true);
    try {
      const data = await api.getEscrows();
      setEscrows(data);
    } catch (err) {
      showNotification(err.message, "error");
    } finally {
      setLoadingEscrows(false);
    }
  }, [showNotification]);

  useEffect(() => {
    if (auth.user) {
      fetchEscrows();
    }
  }, [auth.user, fetchEscrows]);

  const handleCreateEscrow = async (formData) => {
    try {
      const newEscrow = await api.createEscrow({
        title: formData.title,
        description: formData.description,
        amount: parseFloat(formData.amount),
        sellerUsername: formData.seller,
        expiresInDays: parseInt(formData.days) || 14,
      });
      setEscrows((prev) => [newEscrow, ...prev]);
      setView("dashboard");
      showNotification("Escrow created successfully!");
    } catch (err) {
      showNotification(err.message, "error");
    }
  };

  const handleAction = useCallback(
    async (action, data) => {
      try {
        let updated;
        switch (action) {
          case "fund":
            updated = await api.fundEscrow(selectedEscrow.id);
            showNotification(
              `${formatBTC(selectedEscrow.amount)} deposited into escrow`
            );
            break;
          case "deliver":
            updated = await api.deliverEscrow(selectedEscrow.id, data);
            showNotification("Marked as delivered!");
            break;
          case "release":
            updated = await api.releaseEscrow(selectedEscrow.id);
            showNotification(
              `${formatBTC(selectedEscrow.amount * 0.98)} released to ${selectedEscrow.seller}!`
            );
            break;
          case "dispute":
            updated = await api.disputeEscrow(selectedEscrow.id, data);
            showNotification("Dispute opened. Awaiting arbiter.", "warning");
            break;
          default:
            return;
        }

        // Update local state with server response
        setSelectedEscrow(updated);
        setEscrows((prev) =>
          prev.map((e) => (e.id === updated.id ? updated : e))
        );
        // Refresh wallet balance
        auth.refreshBalance();
      } catch (err) {
        showNotification(err.message, "error");
      }
    },
    [selectedEscrow, showNotification, auth]
  );

  const handleLogin = async (credentials) => {
    if (credentials.type === "register") {
      await auth.register(credentials.username, credentials.email, credentials.password);
    } else {
      await auth.login(credentials.email, credentials.password);
    }
  };

  // Show loading spinner while checking auth on mount
  if (auth.loading && !auth.user) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: palette.bg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <span
          style={{
            display: "inline-block",
            width: 32,
            height: 32,
            border: `3px solid ${palette.border}`,
            borderTopColor: palette.accent,
            borderRadius: "50%",
            animation: "spin 0.6s linear infinite",
          }}
        />
      </div>
    );
  }

  if (!auth.user) {
    return (
      <LoginScreen
        onLogin={handleLogin}
        onDemoLogin={auth.demoLogin}
        loading={auth.loading}
        error={auth.error}
      />
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: palette.bg,
        color: palette.text,
        fontFamily: "'Outfit', sans-serif",
      }}
    >
      {/* Notification */}
      {notification && (
        <div
          style={{
            position: "fixed",
            top: 16,
            right: 16,
            zIndex: 1000,
            padding: "12px 20px",
            borderRadius: 12,
            background:
              notification.type === "error"
                ? palette.red + "dd"
                : notification.type === "warning"
                ? palette.accentDark
                : palette.greenDark,
            color: "#fff",
            fontSize: 14,
            fontWeight: 600,
            animation: "fadeUp 0.3s ease both",
            boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
          }}
        >
          {notification.msg}
        </div>
      )}

      {/* Top Bar */}
      <div
        style={{
          borderBottom: `1px solid ${palette.border}`,
          padding: "12px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: palette.surface + "cc",
          backdropFilter: "blur(12px)",
          position: "sticky",
          top: 0,
          zIndex: 100,
        }}
      >
        <div
          onClick={() => {
            setView("dashboard");
            setSelectedEscrow(null);
          }}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            cursor: "pointer",
          }}
        >
          <span style={{ color: palette.accent }}>
            <Icons.Bitcoin />
          </span>
          <span
            style={{
              fontSize: 17,
              fontWeight: 800,
              color: palette.text,
              letterSpacing: "-0.5px",
            }}
          >
            my<span style={{ color: palette.accent }}>Escrow</span>
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              padding: "6px 14px",
              borderRadius: 8,
              background: palette.accent + "12",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Icons.Wallet />
            <span
              style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 13,
                fontWeight: 600,
                color: palette.accent,
              }}
            >
              {formatBTC(auth.user.walletBalance)}
            </span>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 12px",
              borderRadius: 8,
              background: palette.surfaceAlt,
            }}
          >
            <div
              style={{
                width: 26,
                height: 26,
                borderRadius: "50%",
                background: palette.accent + "22",
                color: palette.accent,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 12,
                fontWeight: 700,
                fontFamily: "'JetBrains Mono', monospace",
              }}
            >
              {auth.user.username[0].toUpperCase()}
            </div>
            <span style={{ fontSize: 13, fontWeight: 600 }}>
              {auth.user.username}
            </span>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              auth.logout();
              setEscrows([]);
              setView("dashboard");
              setSelectedEscrow(null);
            }}
          >
            Logout
          </Button>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "28px 24px" }}>
        {view === "dashboard" && (
          <Dashboard
            currentUser={auth.user}
            escrows={escrows}
            loading={loadingEscrows}
            onCreateNew={() => setView("create")}
            onSelectEscrow={(e) => {
              setSelectedEscrow(e);
              setView("detail");
            }}
          />
        )}
        {view === "create" && (
          <CreateEscrowForm
            currentUser={auth.user}
            onSubmit={handleCreateEscrow}
            onCancel={() => setView("dashboard")}
          />
        )}
        {view === "detail" && selectedEscrow && (
          <EscrowDetail
            escrow={selectedEscrow}
            currentUser={auth.user}
            onAction={handleAction}
            onBack={() => {
              setView("dashboard");
              setSelectedEscrow(null);
            }}
          />
        )}
      </div>

      {/* Footer */}
      <div
        style={{
          textAlign: "center",
          padding: "32px 24px",
          borderTop: `1px solid ${palette.border}`,
          marginTop: 48,
        }}
      >
        <p
          style={{
            fontSize: 11,
            color: palette.textDim,
            fontFamily: "'JetBrains Mono', monospace",
          }}
        >
          SIMULATION ONLY · NO REAL BTC · EDUCATIONAL PURPOSE
        </p>
      </div>
    </div>
  );
}
