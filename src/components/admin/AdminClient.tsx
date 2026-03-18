"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Mail, Users, Inbox, BarChart2, LogOut, DollarSign,
  Search, RefreshCw, Send,
  Shield, Activity, AlertCircle, Check, X,
  CreditCard, Server, Globe, Database, Plus, Trash2,
} from "lucide-react";
import { StatCard } from "@/components/ui/StatCard";
import { PlanBadge } from "@/components/ui/PlanBadge";
import { toast } from "sonner";
import { timeAgo } from "@/lib/utils";

interface UserRow {
  _id: string;
  email: string;
  username: string;
  balance: number;
  plan: "free" | "starter" | "pro" | "enterprise";
  inboxCount: number;
  emailsReceived: number;
  isActive: boolean;
  createdAt: string;
  discordId?: string;
}

interface Stats {
  userCount: number;
  inboxCount: number;
  emailCount: number;
  totalBalance: number;
}

interface Transaction {
  _id: string;
  type: string;
  amount: number;
  description: string;
  createdAt: string;
  userId?: { username?: string };
}

interface MailcowDomain {
  domain_name: string;
  description: string;
  aliases: number;
  mailboxes: number;
  max_aliases: number;
  max_mailboxes: number;
  active: boolean;
  created: string;
}

interface MailcowMailbox {
  username: string;
  name: string;
  domain: string;
  quota: number;
  messages: number;
  active: boolean;
  created: string;
}

interface MailcowData {
  configured: boolean;
  error?: string;
  serverInfo?: { version: string; hostname: string } | null;
  domains?: MailcowDomain[];
  mailboxes?: MailcowMailbox[];
}

const SIDEBAR_W = 220;

export default function AdminClient() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [tab, setTab] = useState<"overview" | "users" | "topup" | "mailcow">("overview");
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentUsers, setRecentUsers] = useState<UserRow[]>([]);
  const [recentTx, setRecentTx] = useState<Transaction[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [search, setSearch] = useState("");
  const [userTotal, setUserTotal] = useState(0);
  const [userPage, setUserPage] = useState(1);
  const [loadingUsers, setLoadingUsers] = useState(false);
  // top-up form
  const [topupEmail, setTopupEmail] = useState("");
  const [topupAmount, setTopupAmount] = useState("");
  const [topupNote, setTopupNote] = useState("");
  const [topupLoading, setTopupLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);
  // mailcow
  const [mailcow, setMailcow] = useState<MailcowData | null>(null);
  const [mcLoading, setMcLoading] = useState(false);
  // mailcow – new domain form
  const [mcDomain, setMcDomain] = useState("");
  const [mcDomainDesc, setMcDomainDesc] = useState("");
  const [mcDomainLoading, setMcDomainLoading] = useState(false);
  // mailcow – new mailbox form
  const [mcMbLocal, setMcMbLocal] = useState("");
  const [mcMbDomain, setMcMbDomain] = useState("");
  const [mcMbName, setMcMbName] = useState("");
  const [mcMbPass, setMcMbPass] = useState("");
  const [mcMbLoading, setMcMbLoading] = useState(false);

  async function fetchStats() {
    const res = await fetch("/api/admin/stats");
    if (res.ok) {
      const d = await res.json();
      setStats(d.stats);
      setRecentUsers(d.recentUsers ?? []);
      setRecentTx(d.recentTransactions ?? []);
    }
  }

  async function fetchUsers(page = 1, q = search) {
    setLoadingUsers(true);
    const res = await fetch(`/api/admin/users?page=${page}&limit=20&search=${encodeURIComponent(q)}`);
    if (res.ok) {
      const d = await res.json();
      setUsers(d.users);
      setUserTotal(d.total);
      setUserPage(page);
    }
    setLoadingUsers(false);
  }

  async function fetchMailcow() {
    setMcLoading(true);
    const res = await fetch("/api/admin/mailcow");
    if (res.ok) {
      const d = await res.json();
      setMailcow(d);
    }
    setMcLoading(false);
  }

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated") {
      if (!session?.user?.isAdmin) router.push("/dashboard");
      else { fetchStats(); fetchUsers(); }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  useEffect(() => {
    if (tab === "mailcow" && !mailcow) fetchMailcow();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  async function handleTopup() {
    const amount = parseFloat(topupAmount);
    if (!topupEmail.trim() || isNaN(amount) || amount <= 0) {
      toast.error("Enter a valid email and amount");
      return;
    }
    setTopupLoading(true);
    // Find user by email first
    const findRes = await fetch(`/api/admin/users?search=${encodeURIComponent(topupEmail)}&limit=1`);
    const findData = await findRes.json();
    const user = findData.users?.[0];
    if (!user || user.email.toLowerCase() !== topupEmail.toLowerCase().trim()) {
      toast.error("No user found with that email");
      setTopupLoading(false);
      return;
    }
    const res = await fetch("/api/admin/topup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user._id, amount, description: topupNote || `Admin top-up: $${amount}` }),
    });
    setTopupLoading(false);
    if (res.ok) {
      toast.success(`Topped up $${amount} to ${topupEmail}`);
      setTopupEmail(""); setTopupAmount(""); setTopupNote("");
      fetchStats();
    } else {
      const d = await res.json();
      toast.error(d.error ?? "Top-up failed");
    }
  }

  async function toggleUserActive(userId: string, current: boolean) {
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !current }),
    });
    if (res.ok) {
      toast.success(`User ${current ? "deactivated" : "activated"}`);
      fetchUsers(userPage);
    }
  }

  async function changePlan(userId: string, plan: string) {
    const res = await fetch(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ plan }),
    });
    if (res.ok) {
      toast.success("Plan updated");
      fetchUsers(userPage);
    }
  }

  async function handleCreateDomain() {
    if (!mcDomain.trim()) { toast.error("Enter a domain name"); return; }
    setMcDomainLoading(true);
    const res = await fetch("/api/admin/mailcow", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "create_domain", domain: mcDomain.trim(), description: mcDomainDesc.trim() }),
    });
    setMcDomainLoading(false);
    const d = await res.json();
    if (d.success) {
      toast.success(`Domain ${mcDomain} created`);
      setMcDomain(""); setMcDomainDesc("");
      fetchMailcow();
    } else {
      toast.error(d.error ?? "Failed to create domain");
    }
  }

  async function handleDeleteDomain(domain: string) {
    if (!confirm(`Delete domain ${domain}? This cannot be undone.`)) return;
    const res = await fetch("/api/admin/mailcow", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete_domain", domain }),
    });
    const d = await res.json();
    if (d.success) { toast.success(`Domain ${domain} deleted`); fetchMailcow(); }
    else toast.error(d.error ?? "Failed to delete domain");
  }

  async function handleCreateMailbox() {
    if (!mcMbLocal.trim() || !mcMbDomain.trim() || !mcMbName.trim() || !mcMbPass.trim()) {
      toast.error("All mailbox fields are required"); return;
    }
    setMcMbLoading(true);
    const res = await fetch("/api/admin/mailcow", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "create_mailbox", localPart: mcMbLocal.trim(), domain: mcMbDomain.trim(), name: mcMbName.trim(), password: mcMbPass }),
    });
    setMcMbLoading(false);
    const d = await res.json();
    if (d.success) {
      toast.success(`Mailbox ${mcMbLocal}@${mcMbDomain} created`);
      setMcMbLocal(""); setMcMbDomain(""); setMcMbName(""); setMcMbPass("");
      fetchMailcow();
    } else {
      toast.error(d.error ?? "Failed to create mailbox");
    }
  }

  async function handleDeleteMailbox(address: string) {
    if (!confirm(`Delete mailbox ${address}? This cannot be undone.`)) return;
    const res = await fetch("/api/admin/mailcow", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "delete_mailbox", address }),
    });
    const d = await res.json();
    if (d.success) { toast.success(`Mailbox ${address} deleted`); fetchMailcow(); }
    else toast.error(d.error ?? "Failed to delete mailbox");
  }

  if (status === "loading") {
    return (
      <div style={{ minHeight: "100vh", background: "#0d0d14", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
          <div style={{ width: 40, height: 40, border: "3px solid #1e1e2e", borderTopColor: "#7c3aed", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <p style={{ color: "#64748b", fontSize: 14 }}>Loading admin panel…</p>
        </div>
      </div>
    );
  }

  const NAV_ITEMS = [
    { id: "overview", icon: <BarChart2 size={16} />, label: "Overview" },
    { id: "users", icon: <Users size={16} />, label: "Users" },
    { id: "topup", icon: <DollarSign size={16} />, label: "Top-up" },
    { id: "mailcow", icon: <Server size={16} />, label: "Mailcow" },
  ] as const;

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#0d0d14", color: "#e2e8f0" }}>

      {/* ── Sidebar ── */}
      <aside style={{ width: SIDEBAR_W, flexShrink: 0, background: "#0d0d14", borderRight: "1px solid #1e1e2e", display: "flex", flexDirection: "column", position: "sticky", top: 0, height: "100vh", overflowY: "auto" }}>
        <div style={{ padding: "20px 20px 14px", borderBottom: "1px solid #1e1e2e" }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: "linear-gradient(135deg, #7c3aed, #10b981)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Mail size={18} color="white" />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15, color: "#f1f5f9" }}>MailDrop</div>
              <div style={{ fontSize: 11, color: "#64748b" }}>Admin Panel</div>
            </div>
          </Link>
        </div>

        <div style={{ padding: "10px 10px", borderBottom: "1px solid #1e1e2e" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.2)", borderRadius: 10 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: "linear-gradient(135deg, #7c3aed, #10b981)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Shield size={14} color="white" />
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "#f1f5f9" }}>{session?.user?.name}</div>
              <div style={{ fontSize: 10, color: "#7c3aed" }}>Administrator</div>
            </div>
          </div>
        </div>

        <nav style={{ flex: 1, padding: "12px 10px" }}>
          {NAV_ITEMS.map((item) => (
            <button key={item.id} onClick={() => setTab(item.id)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 10, border: "none", cursor: "pointer", marginBottom: 3, background: tab === item.id ? "rgba(124,58,237,0.15)" : "transparent", color: tab === item.id ? "#a78bfa" : "#64748b", fontWeight: tab === item.id ? 600 : 400, fontSize: 14, transition: "all 0.15s", textAlign: "left" }}
              onMouseEnter={(e) => { if (tab !== item.id) (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.04)"; }}
              onMouseLeave={(e) => { if (tab !== item.id) (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
            >
              {item.icon} {item.label}
            </button>
          ))}
        </nav>

        <div style={{ padding: "12px 10px", borderTop: "1px solid #1e1e2e" }}>
          <button onClick={() => signOut({ callbackUrl: "/" })} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 10, border: "none", cursor: "pointer", background: "transparent", color: "#64748b", fontSize: 14, textAlign: "left", transition: "all 0.15s" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(239,68,68,0.08)"; (e.currentTarget as HTMLButtonElement).style.color = "#f87171"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; (e.currentTarget as HTMLButtonElement).style.color = "#64748b"; }}
          >
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <main style={{ flex: 1, overflowY: "auto", minWidth: 0 }}>

        {/* ─── OVERVIEW ─── */}
        {tab === "overview" && (
          <div style={{ padding: 32 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
              <div>
                <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#f1f5f9", letterSpacing: "-0.02em" }}>Overview</h1>
                <p style={{ color: "#64748b", fontSize: 14, marginTop: 4 }}>Real-time service stats</p>
              </div>
              <button onClick={fetchStats} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 9, border: "1px solid #1e1e2e", background: "transparent", color: "#64748b", fontSize: 13, cursor: "pointer" }}>
                <RefreshCw size={14} /> Refresh
              </button>
            </div>

            {/* Stats */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 32 }}>
              <StatCard label="Total Users" value={stats?.userCount ?? "—"} icon={<Users size={18} />} color="#7c3aed" trend={{ value: "12%", up: true }} />
              <StatCard label="Active Inboxes" value={stats?.inboxCount ?? "—"} icon={<Inbox size={18} />} color="#10b981" trend={{ value: "8%", up: true }} />
              <StatCard label="Emails Received" value={stats?.emailCount ?? "—"} icon={<Mail size={18} />} color="#5865f2" trend={{ value: "23%", up: true }} />
              <StatCard label="Total Balance" value={`$${(stats?.totalBalance ?? 0).toFixed(2)}`} icon={<CreditCard size={18} />} color="#f59e0b" />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
              {/* Recent Users */}
              <div style={{ background: "#13131f", border: "1px solid #1e1e2e", borderRadius: 16, overflow: "hidden" }}>
                <div style={{ padding: "16px 20px", borderBottom: "1px solid #1e1e2e", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <h3 style={{ fontSize: 15, fontWeight: 600, color: "#f1f5f9", display: "flex", alignItems: "center", gap: 8 }}>
                    <Users size={15} color="#7c3aed" /> Recent Users
                  </h3>
                  <button onClick={() => setTab("users")} style={{ fontSize: 12, color: "#7c3aed", background: "none", border: "none", cursor: "pointer" }}>View all →</button>
                </div>
                {recentUsers.length === 0 ? (
                  <div style={{ padding: 24, textAlign: "center", color: "#4b5563", fontSize: 14 }}>No users yet</div>
                ) : (
                  recentUsers.map((u) => (
                    <div key={u._id} style={{ padding: "12px 20px", borderBottom: "1px solid #0d0d14", display: "flex", alignItems: "center", gap: 12 }}>
                      <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg, #7c3aed44, #10b98144)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "#a78bfa", flexShrink: 0 }}>
                        {u.username[0]?.toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#f1f5f9", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.username}</div>
                        <div style={{ fontSize: 11, color: "#4b5563" }}>{timeAgo(u.createdAt)}</div>
                      </div>
                      <PlanBadge plan={u.plan} />
                    </div>
                  ))
                )}
              </div>

              {/* Recent Transactions */}
              <div style={{ background: "#13131f", border: "1px solid #1e1e2e", borderRadius: 16, overflow: "hidden" }}>
                <div style={{ padding: "16px 20px", borderBottom: "1px solid #1e1e2e" }}>
                  <h3 style={{ fontSize: 15, fontWeight: 600, color: "#f1f5f9", display: "flex", alignItems: "center", gap: 8 }}>
                    <Activity size={15} color="#10b981" /> Recent Transactions
                  </h3>
                </div>
                {recentTx.length === 0 ? (
                  <div style={{ padding: 24, textAlign: "center", color: "#4b5563", fontSize: 14 }}>No transactions yet</div>
                ) : (
                  recentTx.map((tx) => (
                    <div key={tx._id} style={{ padding: "12px 20px", borderBottom: "1px solid #0d0d14", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div style={{ fontSize: 13, color: "#94a3b8" }}>{tx.userId?.username ?? "Unknown"}</div>
                        <div style={{ fontSize: 11, color: "#4b5563" }}>{tx.description}</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontWeight: 700, fontSize: 14, color: tx.type === "deduct" ? "#f87171" : "#34d399" }}>
                          {tx.type === "deduct" ? "-" : "+"}${Math.abs(tx.amount).toFixed(2)}
                        </div>
                        <div style={{ fontSize: 11, color: "#4b5563" }}>{timeAgo(tx.createdAt)}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* ─── USERS ─── */}
        {tab === "users" && (
          <div style={{ padding: 32 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <div>
                <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#f1f5f9" }}>Users</h1>
                <p style={{ color: "#64748b", fontSize: 14, marginTop: 4 }}>{userTotal} total users</p>
              </div>
            </div>

            {/* Search */}
            <div style={{ position: "relative", marginBottom: 20 }}>
              <Search size={16} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#4b5563", pointerEvents: "none" }} />
              <input
                value={search}
                onChange={(e) => { setSearch(e.target.value); fetchUsers(1, e.target.value); }}
                placeholder="Search by username or email…"
                style={{ width: "100%", background: "#13131f", border: "1px solid #1e1e2e", borderRadius: 11, padding: "10px 14px 10px 40px", color: "#e2e8f0", fontSize: 14, outline: "none" }}
                onFocus={(e) => (e.target.style.borderColor = "#7c3aed")}
                onBlur={(e) => (e.target.style.borderColor = "#1e1e2e")}
              />
            </div>

            {/* Table */}
            <div style={{ background: "#13131f", border: "1px solid #1e1e2e", borderRadius: 16, overflow: "hidden" }}>
              {/* Header */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 100px 80px 80px 90px 80px", gap: 0, padding: "12px 20px", borderBottom: "1px solid #1e1e2e", background: "#0d0d14" }}>
                {["User", "Plan", "Balance", "Inboxes", "Status", "Actions"].map((h) => (
                  <div key={h} style={{ fontSize: 11, fontWeight: 600, color: "#4b5563", textTransform: "uppercase", letterSpacing: "0.05em" }}>{h}</div>
                ))}
              </div>

              {loadingUsers ? (
                <div style={{ padding: "40px", textAlign: "center", color: "#4b5563" }}>
                  <RefreshCw size={20} style={{ animation: "spin 0.8s linear infinite", margin: "0 auto 10px", display: "block" }} />
                  Loading…
                </div>
              ) : users.length === 0 ? (
                <div style={{ padding: "40px", textAlign: "center", color: "#4b5563" }}>No users found</div>
              ) : (
                users.map((u, i) => (
                  <div
                    key={u._id}
                    style={{ display: "grid", gridTemplateColumns: "1fr 100px 80px 80px 90px 80px", gap: 0, padding: "14px 20px", borderBottom: i < users.length - 1 ? "1px solid #0d0d14" : "none", alignItems: "center", transition: "background 0.1s" }}
                    onMouseEnter={(e) => (e.currentTarget as HTMLDivElement).style.background = "#16162a"}
                    onMouseLeave={(e) => (e.currentTarget as HTMLDivElement).style.background = "transparent"}
                  >
                    {/* User col */}
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg, #7c3aed44, #10b98144)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "#a78bfa", flexShrink: 0 }}>
                        {u.username[0]?.toUpperCase()}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "#f1f5f9", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.username}</div>
                        <div style={{ fontSize: 11, color: "#4b5563", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.email}</div>
                      </div>
                    </div>
                    {/* Plan */}
                    <div>
                      <select
                        value={u.plan}
                        onChange={(e) => changePlan(u._id, e.target.value)}
                        style={{ background: "#0d0d14", border: "1px solid #1e1e2e", borderRadius: 7, padding: "4px 6px", color: "#94a3b8", fontSize: 12, cursor: "pointer" }}
                      >
                        {["free", "starter", "pro", "enterprise"].map((p) => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>
                    {/* Balance */}
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#34d399" }}>${u.balance.toFixed(2)}</div>
                    {/* Inboxes */}
                    <div style={{ fontSize: 14, color: "#94a3b8" }}>{u.inboxCount}</div>
                    {/* Status */}
                    <div>
                      <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 9px", borderRadius: 100, background: u.isActive ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.1)", color: u.isActive ? "#34d399" : "#f87171", border: `1px solid ${u.isActive ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.2)"}` }}>
                        {u.isActive ? "Active" : "Suspended"}
                      </span>
                    </div>
                    {/* Actions */}
                    <div style={{ display: "flex", gap: 6 }}>
                      <button
                        onClick={() => toggleUserActive(u._id, u.isActive)}
                        title={u.isActive ? "Suspend" : "Activate"}
                        style={{ width: 28, height: 28, borderRadius: 7, border: "1px solid #1e1e2e", background: "transparent", cursor: "pointer", color: u.isActive ? "#f87171" : "#34d399", display: "flex", alignItems: "center", justifyContent: "center" }}
                      >
                        {u.isActive ? <X size={13} /> : <Check size={13} />}
                      </button>
                      <button
                        onClick={() => { setSelectedUser(u); setTopupEmail(u.email); setTab("topup"); }}
                        title="Top up"
                        style={{ width: 28, height: 28, borderRadius: 7, border: "1px solid #1e1e2e", background: "transparent", cursor: "pointer", color: "#34d399", display: "flex", alignItems: "center", justifyContent: "center" }}
                      >
                        <DollarSign size={13} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Pagination */}
            {userTotal > 20 && (
              <div style={{ display: "flex", gap: 8, justifyContent: "center", marginTop: 20 }}>
                {Array.from({ length: Math.ceil(userTotal / 20) }, (_, i) => i + 1).slice(0, 10).map((p) => (
                  <button key={p} onClick={() => fetchUsers(p)} style={{ width: 34, height: 34, borderRadius: 8, border: `1px solid ${p === userPage ? "#7c3aed" : "#1e1e2e"}`, background: p === userPage ? "rgba(124,58,237,0.15)" : "transparent", color: p === userPage ? "#a78bfa" : "#64748b", cursor: "pointer", fontSize: 13, fontWeight: p === userPage ? 600 : 400 }}>
                    {p}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── TOP-UP ─── */}
        {tab === "topup" && (
          <div style={{ padding: 32, maxWidth: 600 }}>
            <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#f1f5f9", marginBottom: 6 }}>Top-up Credits</h1>
            <p style={{ color: "#64748b", fontSize: 14, marginBottom: 28 }}>Add balance to a user account</p>

            <div style={{ background: "#13131f", border: "1px solid #1e1e2e", borderRadius: 16, padding: 28 }}>
              {selectedUser && (
                <div style={{ background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.2)", borderRadius: 12, padding: "12px 16px", marginBottom: 20, display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg, #7c3aed44, #10b98144)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: "#a78bfa" }}>
                    {selectedUser.username[0].toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#f1f5f9" }}>{selectedUser.username}</div>
                    <div style={{ fontSize: 12, color: "#64748b" }}>Current balance: <span style={{ color: "#34d399", fontWeight: 600 }}>${selectedUser.balance.toFixed(2)}</span></div>
                  </div>
                  <button onClick={() => { setSelectedUser(null); setTopupEmail(""); }} style={{ marginLeft: "auto", background: "none", border: "none", color: "#4b5563", cursor: "pointer" }}><X size={16} /></button>
                </div>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <label style={{ display: "block", fontSize: 13, color: "#94a3b8", marginBottom: 6, fontWeight: 500 }}>User Email</label>
                  <div style={{ position: "relative" }}>
                    <Search size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#4b5563" }} />
                    <input
                      value={topupEmail}
                      onChange={(e) => setTopupEmail(e.target.value)}
                      placeholder="user@example.com"
                      style={{ width: "100%", background: "#0d0d14", border: "1px solid #1e1e2e", borderRadius: 10, padding: "10px 14px 10px 36px", color: "#e2e8f0", fontSize: 14, outline: "none" }}
                      onFocus={(e) => (e.target.style.borderColor = "#7c3aed")}
                      onBlur={(e) => (e.target.style.borderColor = "#1e1e2e")}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 13, color: "#94a3b8", marginBottom: 6, fontWeight: 500 }}>Amount (USD)</label>
                  <div style={{ position: "relative" }}>
                    <DollarSign size={15} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#4b5563" }} />
                    <input
                      type="number" min="0.01" step="0.01"
                      value={topupAmount}
                      onChange={(e) => setTopupAmount(e.target.value)}
                      placeholder="10.00"
                      style={{ width: "100%", background: "#0d0d14", border: "1px solid #1e1e2e", borderRadius: 10, padding: "10px 14px 10px 36px", color: "#e2e8f0", fontSize: 14, outline: "none" }}
                      onFocus={(e) => (e.target.style.borderColor = "#7c3aed")}
                      onBlur={(e) => (e.target.style.borderColor = "#1e1e2e")}
                    />
                  </div>

                  {/* Quick amounts */}
                  <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                    {[5, 10, 15, 25, 50].map((v) => (
                      <button key={v} onClick={() => setTopupAmount(String(v))} style={{ padding: "4px 12px", borderRadius: 7, border: `1px solid ${topupAmount === String(v) ? "#7c3aed" : "#1e1e2e"}`, background: topupAmount === String(v) ? "rgba(124,58,237,0.15)" : "transparent", color: topupAmount === String(v) ? "#a78bfa" : "#64748b", fontSize: 13, cursor: "pointer" }}>
                        ${v}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 13, color: "#94a3b8", marginBottom: 6, fontWeight: 500 }}>Note (optional)</label>
                  <input
                    value={topupNote}
                    onChange={(e) => setTopupNote(e.target.value)}
                    placeholder="Reason for top-up…"
                    style={{ width: "100%", background: "#0d0d14", border: "1px solid #1e1e2e", borderRadius: 10, padding: "10px 14px", color: "#e2e8f0", fontSize: 14, outline: "none" }}
                    onFocus={(e) => (e.target.style.borderColor = "#7c3aed")}
                    onBlur={(e) => (e.target.style.borderColor = "#1e1e2e")}
                  />
                </div>

                <button
                  onClick={handleTopup}
                  disabled={topupLoading}
                  style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "12px", borderRadius: 12, border: "none", background: topupLoading ? "#1e1e2e" : "linear-gradient(135deg, #10b981, #059669)", color: topupLoading ? "#4b5563" : "white", fontWeight: 700, fontSize: 15, cursor: topupLoading ? "not-allowed" : "pointer", boxShadow: topupLoading ? "none" : "0 4px 14px rgba(16,185,129,0.3)" }}
                >
                  {topupLoading ? <RefreshCw size={16} style={{ animation: "spin 0.8s linear infinite" }} /> : <Send size={16} />}
                  {topupLoading ? "Processing…" : `Top Up${topupAmount ? ` $${topupAmount}` : ""}`}
                </button>
              </div>

              <div style={{ marginTop: 16, padding: "12px 14px", background: "rgba(16,185,129,0.07)", borderRadius: 10, border: "1px solid rgba(16,185,129,0.15)", display: "flex", gap: 8, alignItems: "flex-start" }}>
                <AlertCircle size={14} color="#34d399" style={{ marginTop: 1, flexShrink: 0 }} />
                <p style={{ fontSize: 12, color: "#4b5563", lineHeight: 1.5 }}>
                  The user will receive a DM notification on Discord if their account is linked. The balance is credited immediately.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ─── MAILCOW ─── */}
        {tab === "mailcow" && (
          <div style={{ padding: 32 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
              <div>
                <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#f1f5f9", letterSpacing: "-0.02em" }}>Mailcow</h1>
                <p style={{ color: "#64748b", fontSize: 14, marginTop: 4 }}>Mail server management</p>
              </div>
              <button onClick={fetchMailcow} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 9, border: "1px solid #1e1e2e", background: "transparent", color: "#64748b", fontSize: 13, cursor: "pointer" }}>
                <RefreshCw size={14} /> Refresh
              </button>
            </div>

            {mcLoading ? (
              <div style={{ textAlign: "center", padding: 60, color: "#4b5563" }}>
                <RefreshCw size={24} style={{ animation: "spin 0.8s linear infinite", margin: "0 auto 12px", display: "block" }} />
                Loading Mailcow data…
              </div>
            ) : !mailcow ? null : !mailcow.configured ? (
              <div style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 14, padding: 24, display: "flex", gap: 12, alignItems: "flex-start" }}>
                <AlertCircle size={18} color="#f87171" style={{ flexShrink: 0, marginTop: 2 }} />
                <div>
                  <div style={{ fontWeight: 600, color: "#f87171", marginBottom: 6 }}>Mailcow not configured</div>
                  <div style={{ fontSize: 13, color: "#64748b", lineHeight: 1.6 }}>
                    Set <code style={{ background: "#1e1e2e", padding: "1px 6px", borderRadius: 4 }}>MAILCOW_URL</code> and{" "}
                    <code style={{ background: "#1e1e2e", padding: "1px 6px", borderRadius: 4 }}>MAILCOW_API_KEY</code> environment variables to enable Mailcow integration.
                    Inboxes will still work via the IMAP catch-all; Mailcow aliases just won&apos;t be provisioned automatically.
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* Server status card */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 32 }}>
                  <StatCard
                    label="Server"
                    value={mailcow.serverInfo?.hostname?.replace(/^https?:\/\//, "") ?? "—"}
                    icon={<Server size={18} />}
                    color="#7c3aed"
                  />
                  <StatCard
                    label="Version"
                    value={mailcow.serverInfo?.version ?? "—"}
                    icon={<Activity size={18} />}
                    color="#10b981"
                  />
                  <StatCard
                    label="Domains"
                    value={mailcow.domains?.length ?? 0}
                    icon={<Globe size={18} />}
                    color="#5865f2"
                  />
                  <StatCard
                    label="Mailboxes"
                    value={mailcow.mailboxes?.length ?? 0}
                    icon={<Database size={18} />}
                    color="#f59e0b"
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 32 }}>
                  {/* ── Domains list ── */}
                  <div style={{ background: "#13131f", border: "1px solid #1e1e2e", borderRadius: 16, overflow: "hidden" }}>
                    <div style={{ padding: "16px 20px", borderBottom: "1px solid #1e1e2e", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <h3 style={{ fontSize: 15, fontWeight: 600, color: "#f1f5f9", display: "flex", alignItems: "center", gap: 8 }}>
                        <Globe size={15} color="#5865f2" /> Domains
                      </h3>
                    </div>
                    {(mailcow.domains ?? []).length === 0 ? (
                      <div style={{ padding: 24, textAlign: "center", color: "#4b5563", fontSize: 14 }}>No domains</div>
                    ) : (
                      (mailcow.domains ?? []).map((d) => (
                        <div key={d.domain_name} style={{ padding: "12px 20px", borderBottom: "1px solid #0d0d14", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: "#f1f5f9" }}>{d.domain_name}</div>
                            <div style={{ fontSize: 11, color: "#4b5563" }}>{d.mailboxes}/{d.max_mailboxes} mailboxes · {d.aliases}/{d.max_aliases} aliases</div>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 100, background: d.active ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.1)", color: d.active ? "#34d399" : "#f87171" }}>
                              {d.active ? "Active" : "Off"}
                            </span>
                            <button onClick={() => handleDeleteDomain(d.domain_name)} title="Delete domain" style={{ width: 26, height: 26, borderRadius: 7, border: "1px solid rgba(239,68,68,0.3)", background: "transparent", cursor: "pointer", color: "#f87171", display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* ── Mailboxes list ── */}
                  <div style={{ background: "#13131f", border: "1px solid #1e1e2e", borderRadius: 16, overflow: "hidden" }}>
                    <div style={{ padding: "16px 20px", borderBottom: "1px solid #1e1e2e" }}>
                      <h3 style={{ fontSize: 15, fontWeight: 600, color: "#f1f5f9", display: "flex", alignItems: "center", gap: 8 }}>
                        <Database size={15} color="#f59e0b" /> Mailboxes
                      </h3>
                    </div>
                    {(mailcow.mailboxes ?? []).length === 0 ? (
                      <div style={{ padding: 24, textAlign: "center", color: "#4b5563", fontSize: 14 }}>No mailboxes</div>
                    ) : (
                      (mailcow.mailboxes ?? []).map((mb) => (
                        <div key={mb.username} style={{ padding: "12px 20px", borderBottom: "1px solid #0d0d14", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: "#f1f5f9" }}>{mb.username}</div>
                            <div style={{ fontSize: 11, color: "#4b5563" }}>{mb.name} · {mb.messages} msgs · {mb.quota} MB quota</div>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 100, background: mb.active ? "rgba(16,185,129,0.12)" : "rgba(239,68,68,0.1)", color: mb.active ? "#34d399" : "#f87171" }}>
                              {mb.active ? "Active" : "Off"}
                            </span>
                            <button onClick={() => handleDeleteMailbox(mb.username)} title="Delete mailbox" style={{ width: 26, height: 26, borderRadius: 7, border: "1px solid rgba(239,68,68,0.3)", background: "transparent", cursor: "pointer", color: "#f87171", display: "flex", alignItems: "center", justifyContent: "center" }}>
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* ── Create forms ── */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
                  {/* Create domain */}
                  <div style={{ background: "#13131f", border: "1px solid #1e1e2e", borderRadius: 16, padding: 24 }}>
                    <h3 style={{ fontSize: 15, fontWeight: 600, color: "#f1f5f9", marginBottom: 18, display: "flex", alignItems: "center", gap: 8 }}>
                      <Plus size={15} color="#5865f2" /> Add Domain
                    </h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      <div>
                        <label style={{ display: "block", fontSize: 12, color: "#94a3b8", marginBottom: 5 }}>Domain name</label>
                        <input value={mcDomain} onChange={(e) => setMcDomain(e.target.value)} placeholder="example.com"
                          style={{ width: "100%", background: "#0d0d14", border: "1px solid #1e1e2e", borderRadius: 9, padding: "9px 12px", color: "#e2e8f0", fontSize: 13, outline: "none" }}
                          onFocus={(e) => (e.target.style.borderColor = "#7c3aed")} onBlur={(e) => (e.target.style.borderColor = "#1e1e2e")}
                        />
                      </div>
                      <div>
                        <label style={{ display: "block", fontSize: 12, color: "#94a3b8", marginBottom: 5 }}>Description (optional)</label>
                        <input value={mcDomainDesc} onChange={(e) => setMcDomainDesc(e.target.value)} placeholder="My mail domain"
                          style={{ width: "100%", background: "#0d0d14", border: "1px solid #1e1e2e", borderRadius: 9, padding: "9px 12px", color: "#e2e8f0", fontSize: 13, outline: "none" }}
                          onFocus={(e) => (e.target.style.borderColor = "#7c3aed")} onBlur={(e) => (e.target.style.borderColor = "#1e1e2e")}
                        />
                      </div>
                      <button onClick={handleCreateDomain} disabled={mcDomainLoading}
                        style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "10px", borderRadius: 10, border: "none", background: mcDomainLoading ? "#1e1e2e" : "linear-gradient(135deg, #5865f2, #4752c4)", color: mcDomainLoading ? "#4b5563" : "white", fontWeight: 600, fontSize: 14, cursor: mcDomainLoading ? "not-allowed" : "pointer" }}>
                        {mcDomainLoading ? <RefreshCw size={14} style={{ animation: "spin 0.8s linear infinite" }} /> : <Plus size={14} />}
                        {mcDomainLoading ? "Creating…" : "Create Domain"}
                      </button>
                    </div>
                  </div>

                  {/* Create mailbox */}
                  <div style={{ background: "#13131f", border: "1px solid #1e1e2e", borderRadius: 16, padding: 24 }}>
                    <h3 style={{ fontSize: 15, fontWeight: 600, color: "#f1f5f9", marginBottom: 18, display: "flex", alignItems: "center", gap: 8 }}>
                      <Plus size={15} color="#f59e0b" /> Add Mailbox
                    </h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                        <div>
                          <label style={{ display: "block", fontSize: 12, color: "#94a3b8", marginBottom: 5 }}>Local part</label>
                          <input value={mcMbLocal} onChange={(e) => setMcMbLocal(e.target.value)} placeholder="user"
                            style={{ width: "100%", background: "#0d0d14", border: "1px solid #1e1e2e", borderRadius: 9, padding: "9px 12px", color: "#e2e8f0", fontSize: 13, outline: "none" }}
                            onFocus={(e) => (e.target.style.borderColor = "#7c3aed")} onBlur={(e) => (e.target.style.borderColor = "#1e1e2e")}
                          />
                        </div>
                        <div>
                          <label style={{ display: "block", fontSize: 12, color: "#94a3b8", marginBottom: 5 }}>Domain</label>
                          <input value={mcMbDomain} onChange={(e) => setMcMbDomain(e.target.value)} placeholder="example.com"
                            style={{ width: "100%", background: "#0d0d14", border: "1px solid #1e1e2e", borderRadius: 9, padding: "9px 12px", color: "#e2e8f0", fontSize: 13, outline: "none" }}
                            onFocus={(e) => (e.target.style.borderColor = "#7c3aed")} onBlur={(e) => (e.target.style.borderColor = "#1e1e2e")}
                          />
                        </div>
                      </div>
                      <div>
                        <label style={{ display: "block", fontSize: 12, color: "#94a3b8", marginBottom: 5 }}>Display name</label>
                        <input value={mcMbName} onChange={(e) => setMcMbName(e.target.value)} placeholder="John Doe"
                          style={{ width: "100%", background: "#0d0d14", border: "1px solid #1e1e2e", borderRadius: 9, padding: "9px 12px", color: "#e2e8f0", fontSize: 13, outline: "none" }}
                          onFocus={(e) => (e.target.style.borderColor = "#7c3aed")} onBlur={(e) => (e.target.style.borderColor = "#1e1e2e")}
                        />
                      </div>
                      <div>
                        <label style={{ display: "block", fontSize: 12, color: "#94a3b8", marginBottom: 5 }}>Password</label>
                        <input type="password" value={mcMbPass} onChange={(e) => setMcMbPass(e.target.value)} placeholder="••••••••"
                          style={{ width: "100%", background: "#0d0d14", border: "1px solid #1e1e2e", borderRadius: 9, padding: "9px 12px", color: "#e2e8f0", fontSize: 13, outline: "none" }}
                          onFocus={(e) => (e.target.style.borderColor = "#7c3aed")} onBlur={(e) => (e.target.style.borderColor = "#1e1e2e")}
                        />
                      </div>
                      <button onClick={handleCreateMailbox} disabled={mcMbLoading}
                        style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "10px", borderRadius: 10, border: "none", background: mcMbLoading ? "#1e1e2e" : "linear-gradient(135deg, #f59e0b, #d97706)", color: mcMbLoading ? "#4b5563" : "white", fontWeight: 600, fontSize: 14, cursor: mcMbLoading ? "not-allowed" : "pointer" }}>
                        {mcMbLoading ? <RefreshCw size={14} style={{ animation: "spin 0.8s linear infinite" }} /> : <Plus size={14} />}
                        {mcMbLoading ? "Creating…" : "Create Mailbox"}
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
