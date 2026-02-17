import { useState, useEffect } from "react";
import palette from "../styles/palette";
import * as api from "../services/api";
import Card from "./Card";
import Button from "./Button";
import Input from "./Input";
import StatusBadge from "./StatusBadge";
import { formatBTC, formatDate } from "../utils/helpers";

export default function AdminPanel({ onBack }) {
  const [tab, setTab] = useState("stats");
  const [stats, setStats] = useState(null);
  const [disputes, setDisputes] = useState([]);
  const [users, setUsers] = useState([]);
  const [auditLog, setAuditLog] = useState([]);
  const [fees, setFees] = useState(null);
  const [allEscrows, setAllEscrows] = useState([]);
  const [loading, setLoading] = useState(false);

  // Resolve dispute form
  const [resolveId, setResolveId] = useState(null);
  const [ruling, setRuling] = useState("BUYER");
  const [splitPct, setSplitPct] = useState("100");
  const [resolveNotes, setResolveNotes] = useState("");

  // Escrows filter
  const [escrowFilter, setEscrowFilter] = useState("");

  useEffect(() => {
    loadData();
  }, [tab, escrowFilter]);

  async function loadData() {
    setLoading(true);
    try {
      if (tab === "stats") {
        setStats(await api.getAdminStats());
      } else if (tab === "disputes") {
        setDisputes(await api.getAdminDisputes());
      } else if (tab === "users") {
        const res = await api.getAdminUsers();
        setUsers(res.users || []);
      } else if (tab === "audit") {
        setAuditLog(await api.getAdminAuditLog());
      } else if (tab === "fees") {
        setFees(await api.getAdminFees());
      } else if (tab === "escrows") {
        const res = await api.getAdminEscrows(1, escrowFilter);
        setAllEscrows(res.escrows || []);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }

  async function handleResolve(escrowId) {
    try {
      await api.resolveDispute(escrowId, {
        ruling,
        splitPercentage: parseInt(splitPct),
        notes: resolveNotes,
      });
      setResolveId(null);
      setRuling("BUYER");
      setSplitPct("100");
      setResolveNotes("");
      loadData();
    } catch {
      // silently fail
    }
  }

  async function handleRoleChange(userId, newRole) {
    try {
      await api.changeUserRole(userId, newRole);
      loadData();
    } catch {
      // silently fail
    }
  }

  const tabs = [
    { id: "stats", label: "Dashboard" },
    { id: "disputes", label: "Disputes" },
    { id: "escrows", label: "Escrows" },
    { id: "fees", label: "Fees" },
    { id: "users", label: "Users" },
    { id: "audit", label: "Audit" },
  ];

  return (
    <div style={{ animation: "fadeUp 0.3s ease both" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
        <button
          onClick={onBack}
          style={{ background: "none", border: "none", color: palette.textMuted, cursor: "pointer", padding: 4 }}
        >
          {"\u2190"}
        </button>
        <h2 style={{ fontSize: 22, fontWeight: 700 }}>Admin Panel</h2>
        <span
          style={{
            fontSize: 10,
            padding: "3px 8px",
            borderRadius: 4,
            background: palette.red + "18",
            color: palette.red,
            fontWeight: 700,
          }}
        >
          ADMIN
        </span>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          background: palette.surface,
          borderRadius: 10,
          padding: 4,
          marginBottom: 24,
          border: `1px solid ${palette.border}`,
          overflowX: "auto",
        }}
      >
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              flex: 1,
              padding: "10px 0",
              fontSize: 12,
              fontWeight: 600,
              fontFamily: "'Outfit', sans-serif",
              borderRadius: 8,
              border: "none",
              cursor: "pointer",
              background: tab === t.id ? palette.surfaceAlt : "transparent",
              color: tab === t.id ? palette.text : palette.textDim,
              transition: "all 0.2s",
              whiteSpace: "nowrap",
              minWidth: 0,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <Card style={{ textAlign: "center", padding: 48 }}>
          <span
            style={{
              display: "inline-block",
              width: 24,
              height: 24,
              border: `3px solid ${palette.border}`,
              borderTopColor: palette.accent,
              borderRadius: "50%",
              animation: "spin 0.6s linear infinite",
            }}
          />
        </Card>
      ) : (
        <>
          {/* Stats Tab */}
          {tab === "stats" && stats && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
              {[
                { label: "Total Users", value: stats.totalUsers, color: palette.blue },
                { label: "Total Escrows", value: stats.totalEscrows, color: palette.accent },
                { label: "Active Escrows", value: stats.activeEscrows, color: palette.green },
                { label: "Total Volume", value: formatBTC(stats.totalVolume), color: palette.purple },
                { label: "Platform Fees", value: formatBTC(stats.totalFees), color: palette.yellow },
                { label: "Open Disputes", value: stats.disputeCount, color: palette.red },
              ].map((s, i) => (
                <Card key={i}>
                  <div style={{ fontSize: 11, color: palette.textDim, marginBottom: 6, fontWeight: 600, letterSpacing: "0.5px" }}>
                    {s.label.toUpperCase()}
                  </div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: s.color, fontFamily: "'JetBrains Mono', monospace" }}>
                    {s.value}
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Disputes Tab */}
          {tab === "disputes" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {disputes.length === 0 ? (
                <Card style={{ textAlign: "center", padding: 32 }}>
                  <p style={{ color: palette.textMuted }}>No open disputes</p>
                </Card>
              ) : (
                disputes.map((d) => (
                  <Card key={d.id}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                      <div>
                        <span style={{ fontSize: 15, fontWeight: 600 }}>{d.title}</span>
                        <span style={{ marginLeft: 8, fontSize: 12, color: palette.textDim, fontFamily: "'JetBrains Mono', monospace" }}>{d.id}</span>
                      </div>
                      <StatusBadge status={d.status} />
                    </div>
                    <div style={{ display: "flex", gap: 16, fontSize: 12, color: palette.textMuted, marginBottom: 8 }}>
                      <span>Buyer: <strong style={{ color: palette.text }}>{d.buyer}</strong></span>
                      <span>Seller: <strong style={{ color: palette.text }}>{d.seller}</strong></span>
                      <span>Amount: <strong style={{ color: palette.accent }}>{formatBTC(d.amount)}</strong></span>
                    </div>
                    {d.dispute && (
                      <div style={{ padding: 12, borderRadius: 8, background: palette.bg, marginBottom: 12 }}>
                        <p style={{ fontSize: 12, color: palette.textDim }}>
                          <strong>Opened by:</strong> {d.dispute.openedBy} | <strong>Reason:</strong> {d.dispute.reason}
                        </p>
                      </div>
                    )}
                    {resolveId === d.id ? (
                      <div style={{ padding: 16, borderRadius: 10, background: palette.bg, border: `1px solid ${palette.border}` }}>
                        <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
                          <div style={{ flex: 1 }}>
                            <label style={{ fontSize: 11, color: palette.textDim, fontWeight: 600 }}>RULING</label>
                            <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                              {["BUYER", "SELLER"].map((r) => (
                                <button
                                  key={r}
                                  onClick={() => setRuling(r)}
                                  style={{
                                    flex: 1,
                                    padding: "8px 0",
                                    borderRadius: 8,
                                    border: `1px solid ${ruling === r ? palette.accent : palette.border}`,
                                    background: ruling === r ? palette.accent + "14" : "transparent",
                                    color: ruling === r ? palette.accent : palette.textMuted,
                                    cursor: "pointer",
                                    fontFamily: "'Outfit', sans-serif",
                                    fontSize: 13,
                                    fontWeight: 600,
                                  }}
                                >
                                  {r}
                                </button>
                              ))}
                            </div>
                          </div>
                          <div style={{ width: 120 }}>
                            <Input
                              label="SPLIT %"
                              value={splitPct}
                              onChange={setSplitPct}
                              type="number"
                              mono
                            />
                          </div>
                        </div>
                        <Input
                          label="NOTES"
                          value={resolveNotes}
                          onChange={setResolveNotes}
                          placeholder="Resolution notes..."
                          textarea
                        />
                        <div style={{ display: "flex", gap: 8, marginTop: 12, justifyContent: "flex-end" }}>
                          <Button variant="secondary" size="sm" onClick={() => setResolveId(null)}>Cancel</Button>
                          <Button variant="success" size="sm" onClick={() => handleResolve(d.id)}>Resolve Dispute</Button>
                        </div>
                      </div>
                    ) : (
                      <Button size="sm" onClick={() => setResolveId(d.id)}>
                        Resolve
                      </Button>
                    )}
                  </Card>
                ))
              )}
            </div>
          )}

          {/* Escrows Tab */}
          {tab === "escrows" && (
            <div>
              {/* Status filter pills */}
              <div style={{ display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
                {["", "AWAITING_AGREEMENT", "CREATED", "FUNDED", "SHIPPED", "INSPECTION", "DISPUTED", "RELEASED", "REFUNDED"].map((s) => (
                  <button
                    key={s}
                    onClick={() => setEscrowFilter(s)}
                    style={{
                      padding: "6px 12px",
                      borderRadius: 6,
                      fontSize: 11,
                      fontWeight: 600,
                      fontFamily: "'JetBrains Mono', monospace",
                      border: `1px solid ${escrowFilter === s ? palette.accent : palette.border}`,
                      background: escrowFilter === s ? palette.accent + "14" : "transparent",
                      color: escrowFilter === s ? palette.accent : palette.textMuted,
                      cursor: "pointer",
                      transition: "all 0.2s",
                    }}
                  >
                    {s || "ALL"}
                  </button>
                ))}
              </div>
              <Card>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                    <thead>
                      <tr>
                        {["Title", "Buyer", "Seller", "Amount", "Status", "Created"].map((h) => (
                          <th
                            key={h}
                            style={{
                              textAlign: "left",
                              padding: "10px 10px",
                              borderBottom: `1px solid ${palette.border}`,
                              fontSize: 10,
                              color: palette.textDim,
                              fontWeight: 600,
                              letterSpacing: "0.5px",
                            }}
                          >
                            {h.toUpperCase()}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {allEscrows.length === 0 ? (
                        <tr>
                          <td colSpan={6} style={{ padding: 24, textAlign: "center", color: palette.textMuted }}>
                            No escrows found
                          </td>
                        </tr>
                      ) : (
                        allEscrows.map((e) => (
                          <tr key={e.id}>
                            <td style={{ padding: "10px 10px", borderBottom: `1px solid ${palette.border}`, fontWeight: 600, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {e.title}
                            </td>
                            <td style={{ padding: "10px 10px", borderBottom: `1px solid ${palette.border}`, color: palette.textMuted, fontFamily: "'JetBrains Mono', monospace" }}>
                              {e.buyer}
                            </td>
                            <td style={{ padding: "10px 10px", borderBottom: `1px solid ${palette.border}`, color: palette.textMuted, fontFamily: "'JetBrains Mono', monospace" }}>
                              {e.seller}
                            </td>
                            <td style={{ padding: "10px 10px", borderBottom: `1px solid ${palette.border}`, fontFamily: "'JetBrains Mono', monospace", color: palette.accent }}>
                              {formatBTC(e.amount)}
                            </td>
                            <td style={{ padding: "10px 10px", borderBottom: `1px solid ${palette.border}` }}>
                              <StatusBadge status={e.status} />
                            </td>
                            <td style={{ padding: "10px 10px", borderBottom: `1px solid ${palette.border}`, color: palette.textDim, fontSize: 11 }}>
                              {formatDate(e.createdAt)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}

          {/* Fees Tab */}
          {tab === "fees" && fees && (
            <div>
              {/* Fee summary cards */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 20 }}>
                <Card>
                  <div style={{ fontSize: 11, color: palette.textDim, marginBottom: 6, fontWeight: 600, letterSpacing: "0.5px" }}>
                    TOTAL REVENUE
                  </div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: palette.green, fontFamily: "'JetBrains Mono', monospace" }}>
                    {formatBTC(fees.stats?.totalFees || 0)}
                  </div>
                </Card>
                <Card>
                  <div style={{ fontSize: 11, color: palette.textDim, marginBottom: 6, fontWeight: 600, letterSpacing: "0.5px" }}>
                    ESCROW FEES (2%)
                  </div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: palette.accent, fontFamily: "'JetBrains Mono', monospace" }}>
                    {formatBTC(fees.stats?.escrowFees || 0)}
                  </div>
                </Card>
                <Card>
                  <div style={{ fontSize: 11, color: palette.textDim, marginBottom: 6, fontWeight: 600, letterSpacing: "0.5px" }}>
                    DISPUTE FEES (3%)
                  </div>
                  <div style={{ fontSize: 24, fontWeight: 800, color: palette.red, fontFamily: "'JetBrains Mono', monospace" }}>
                    {formatBTC(fees.stats?.disputeFees || 0)}
                  </div>
                </Card>
              </div>

              {/* Fee records */}
              <div style={{ fontSize: 12, color: palette.textDim, fontWeight: 600, letterSpacing: "0.5px", marginBottom: 12 }}>
                FEE RECORDS
              </div>
              {(!fees.fees || fees.fees.length === 0) ? (
                <Card style={{ textAlign: "center", padding: 32 }}>
                  <p style={{ color: palette.textMuted }}>No fees collected yet</p>
                </Card>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {fees.fees.map((f, i) => (
                    <Card key={i} style={{ padding: 14 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <span
                            style={{
                              fontSize: 10,
                              padding: "2px 8px",
                              borderRadius: 4,
                              background: f.feeType === "escrow_fee" ? palette.accent + "14" : palette.red + "14",
                              color: f.feeType === "escrow_fee" ? palette.accent : palette.red,
                              fontWeight: 700,
                              fontFamily: "'JetBrains Mono', monospace",
                              marginRight: 10,
                            }}
                          >
                            {f.feeType === "escrow_fee" ? "ESCROW" : "DISPUTE"}
                          </span>
                          <span style={{ fontSize: 12, color: palette.textDim, fontFamily: "'JetBrains Mono', monospace" }}>
                            {f.escrowId}
                          </span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <span style={{ fontSize: 14, fontWeight: 700, color: palette.green, fontFamily: "'JetBrains Mono', monospace" }}>
                            +{formatBTC(f.amountBtc)}
                          </span>
                          <span style={{ fontSize: 11, color: palette.textDim, fontFamily: "'JetBrains Mono', monospace" }}>
                            {formatDate(f.collectedAt)}
                          </span>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Users Tab */}
          {tab === "users" && (
            <Card>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr>
                      {["Username", "Email", "Role", "Balance", "Joined", "Actions"].map((h) => (
                        <th
                          key={h}
                          style={{
                            textAlign: "left",
                            padding: "10px 12px",
                            borderBottom: `1px solid ${palette.border}`,
                            fontSize: 11,
                            color: palette.textDim,
                            fontWeight: 600,
                            letterSpacing: "0.5px",
                          }}
                        >
                          {h.toUpperCase()}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u) => (
                      <tr key={u.id}>
                        <td style={{ padding: "10px 12px", borderBottom: `1px solid ${palette.border}`, fontWeight: 600 }}>
                          {u.username}
                        </td>
                        <td style={{ padding: "10px 12px", borderBottom: `1px solid ${palette.border}`, color: palette.textMuted, fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}>
                          {u.email}
                        </td>
                        <td style={{ padding: "10px 12px", borderBottom: `1px solid ${palette.border}` }}>
                          <span
                            style={{
                              fontSize: 11,
                              padding: "2px 8px",
                              borderRadius: 4,
                              background: u.role === "admin" ? palette.red + "18" : palette.surfaceAlt,
                              color: u.role === "admin" ? palette.red : palette.textMuted,
                              fontWeight: 600,
                            }}
                          >
                            {u.role}
                          </span>
                        </td>
                        <td style={{ padding: "10px 12px", borderBottom: `1px solid ${palette.border}`, fontFamily: "'JetBrains Mono', monospace", color: palette.accent }}>
                          {formatBTC(u.walletBalance)}
                        </td>
                        <td style={{ padding: "10px 12px", borderBottom: `1px solid ${palette.border}`, color: palette.textDim, fontSize: 12 }}>
                          {formatDate(u.createdAt)}
                        </td>
                        <td style={{ padding: "10px 12px", borderBottom: `1px solid ${palette.border}` }}>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRoleChange(u.id, u.role === "admin" ? "user" : "admin")}
                          >
                            {u.role === "admin" ? "Demote" : "Promote"}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          {/* Audit Log Tab */}
          {tab === "audit" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {auditLog.length === 0 ? (
                <Card style={{ textAlign: "center", padding: 32 }}>
                  <p style={{ color: palette.textMuted }}>No audit entries</p>
                </Card>
              ) : (
                auditLog.map((entry) => (
                  <Card key={entry.id} style={{ padding: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span
                          style={{
                            fontSize: 10,
                            padding: "2px 8px",
                            borderRadius: 4,
                            background: palette.accent + "14",
                            color: palette.accent,
                            fontWeight: 700,
                            fontFamily: "'JetBrains Mono', monospace",
                          }}
                        >
                          {entry.action}
                        </span>
                        {entry.resource && (
                          <span style={{ fontSize: 12, color: palette.textDim, fontFamily: "'JetBrains Mono', monospace" }}>
                            {entry.resource}/{entry.resourceId?.slice(0, 8)}
                          </span>
                        )}
                      </div>
                      <span style={{ fontSize: 11, color: palette.textDim, fontFamily: "'JetBrains Mono', monospace" }}>
                        {formatDate(entry.timestamp)}
                      </span>
                    </div>
                    {entry.details && (
                      <div style={{ fontSize: 11, color: palette.textMuted, marginTop: 4, fontFamily: "'JetBrains Mono', monospace", wordBreak: "break-all" }}>
                        {typeof entry.details === "string" ? entry.details : JSON.stringify(entry.details)}
                      </div>
                    )}
                    {entry.ip && (
                      <div style={{ fontSize: 10, color: palette.textDim, marginTop: 2, fontFamily: "'JetBrains Mono', monospace" }}>
                        IP: {entry.ip}
                      </div>
                    )}
                  </Card>
                ))
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
