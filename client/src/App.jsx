import { useState, useCallback, useEffect } from "react";
import palette from "./styles/palette";
import { formatBTC } from "./utils/helpers";
import * as api from "./services/api";
import useAuth from "./hooks/useAuth";
import LoginScreen from "./components/LoginScreen";
import Dashboard from "./components/Dashboard";
import CreateEscrowForm from "./components/CreateEscrowForm";
import EscrowDetail from "./components/EscrowDetail";
import AdminPanel from "./components/AdminPanel";
import WalletPanel from "./components/WalletPanel";
import Button from "./components/Button";
import * as Icons from "./components/Icons";

export default function App() {
  const auth = useAuth();
  const [escrows, setEscrows] = useState([]);

  // Scroll to top on page load/refresh
  useEffect(() => {
    window.history.scrollRestoration = "manual";
    window.scrollTo(0, 0);
  }, []);
  const [view, setView] = useState("dashboard");
  const [selectedEscrow, setSelectedEscrow] = useState(null);
  const [notification, setNotification] = useState(null);
  const [loadingEscrows, setLoadingEscrows] = useState(false);
  const [pendingCategory, setPendingCategory] = useState(null);

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
      // If user selected a category before login, go to create form
      if (pendingCategory) {
        setView("create");
      }
    }
  }, [auth.user, fetchEscrows, pendingCategory]);

  const handleCreateEscrow = async (formData) => {
    try {
      const newEscrow = await api.createEscrow({
        title: formData.title,
        description: formData.description,
        amount: parseFloat(formData.amount),
        sellerUsername: formData.seller,
        expiresInDays: parseInt(formData.days) || 14,
        category: formData.category || undefined,
        inspectionDays: parseInt(formData.inspectionDays) || 3,
      });
      setEscrows((prev) => [newEscrow, ...prev]);
      setView("dashboard");
      setPendingCategory(null);
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
          case "agree":
            updated = await api.agreeEscrow(selectedEscrow.id);
            showNotification("You agreed to the escrow terms!");
            break;
          case "fund":
            updated = await api.fundEscrow(selectedEscrow.id);
            showNotification(
              `${formatBTC(selectedEscrow.amount)} deposited into escrow`
            );
            break;
          case "ship":
            updated = await api.shipEscrow(selectedEscrow.id, data);
            showNotification("Item shipped! Tracking info recorded.");
            break;
          case "deliver":
            updated = await api.deliverEscrow(selectedEscrow.id, data);
            showNotification("Marked as delivered!");
            break;
          case "receive":
            updated = await api.receiveEscrow(selectedEscrow.id);
            showNotification("Marked as received! Inspection period started.");
            break;
          case "accept":
            updated = await api.acceptEscrow(selectedEscrow.id);
            showNotification(
              `${formatBTC(selectedEscrow.amount * 0.98)} released to ${selectedEscrow.seller}!`
            );
            break;
          case "release":
            updated = await api.releaseEscrow(selectedEscrow.id);
            showNotification(
              `${formatBTC(selectedEscrow.amount * 0.98)} released to ${selectedEscrow.seller}!`
            );
            break;
          case "reject":
            updated = await api.rejectEscrow(selectedEscrow.id, data);
            showNotification("Item rejected. Please ship it back.", "warning");
            break;
          case "returnShip":
            updated = await api.returnShipEscrow(selectedEscrow.id, data);
            showNotification("Return shipped! Awaiting seller confirmation.");
            break;
          case "refund":
            updated = await api.refundEscrow(selectedEscrow.id);
            showNotification(
              `${formatBTC(selectedEscrow.amount)} refunded to buyer.`
            );
            break;
          case "dispute":
            updated = await api.disputeEscrow(selectedEscrow.id, data);
            showNotification("Dispute opened. Awaiting admin resolution.", "warning");
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

  // Show loading spinner only during initial token validation on mount
  if (auth.initializing) {
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
        onCategorySelect={setPendingCategory}
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
            onClick={() => { setView("wallet"); setSelectedEscrow(null); }}
            style={{
              padding: "6px 14px",
              borderRadius: 8,
              background: palette.accent + "12",
              display: "flex",
              alignItems: "center",
              gap: 6,
              cursor: "pointer",
              transition: "all 0.2s",
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
                background: auth.isAdmin ? palette.red + "22" : palette.accent + "22",
                color: auth.isAdmin ? palette.red : palette.accent,
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
            {auth.isAdmin && (
              <span
                style={{
                  fontSize: 9,
                  padding: "2px 6px",
                  borderRadius: 4,
                  background: palette.red + "18",
                  color: palette.red,
                  fontWeight: 700,
                }}
              >
                ADMIN
              </span>
            )}
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              auth.logout();
              setEscrows([]);
              setView("dashboard");
              setSelectedEscrow(null);
              setPendingCategory(null);
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
            onOpenAdmin={auth.isAdmin ? () => setView("admin") : undefined}
            onOpenWallet={() => setView("wallet")}
          />
        )}
        {view === "create" && (
          <CreateEscrowForm
            currentUser={auth.user}
            onSubmit={handleCreateEscrow}
            onCancel={() => {
              setView("dashboard");
              setPendingCategory(null);
            }}
            initialCategory={pendingCategory}
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
              fetchEscrows();
            }}
          />
        )}
        {view === "wallet" && (
          <WalletPanel
            currentUser={auth.user}
            onBack={() => {
              setView("dashboard");
              auth.refreshBalance();
            }}
          />
        )}
        {view === "admin" && auth.isAdmin && (
          <AdminPanel
            onBack={() => {
              setView("dashboard");
              fetchEscrows();
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
