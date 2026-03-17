"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Mail, Inbox, LogOut, Settings, ChevronRight,
  Copy, Check, RefreshCw, Trash2, Eye, EyeOff,
  Plus, Clock, AlertCircle, ExternalLink, Key,
  TrendingUp, BarChart2, CreditCard, Layers,
} from "lucide-react";
import { StatCard } from "@/components/ui/StatCard";
import { PlanBadge } from "@/components/ui/PlanBadge";
import { toast } from "sonner";
import { timeAgo } from "@/lib/utils";

interface InboxDoc {
  _id: string;
  address: string;
  domain: string;
  localPart: string;
  emailCount: number;
  createdAt: string;
  isActive: boolean;
}

interface EmailPreview {
  _id: string;
  from: string;
  fromName?: string;
  subject: string;
  receivedAt: string;
  isRead: boolean;
  isStarred: boolean;
}

interface EmailFull extends EmailPreview {
  text?: string;
  html?: string;
  to: string;
}

interface UserProfile {
  _id: string;
  email: string;
  username: string;
  balance: number;
  plan: "free" | "starter" | "pro" | "enterprise";
  apiKey: string;
  inboxCount: number;
  emailsReceived: number;
  createdAt: string;
  recentTransactions: { type: string; amount: number; description: string; createdAt: string }[];
}

const PLAN_LIMITS: Record<string, number> = { free: 3, starter: 10, pro: 50, enterprise: Infinity };
const SIDEBAR_W = 240;

export default function DashboardClient() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"inboxes" | "inbox-detail" | "settings" | "billing">("inboxes");
  const [inboxes, setInboxes] = useState<InboxDoc[]>([]);
  const [selectedInbox, setSelectedInbox] = useState<InboxDoc | null>(null);
  const [emails, setEmails] = useState<EmailPreview[]>([]);
  const [selectedEmail, setSelectedEmail] = useState<EmailFull | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [customAddr, setCustomAddr] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showNewInbox, setShowNewInbox] = useState(false);

  async function fetchProfile() {
    const res = await fetch("/api/user/me");
    if (res.ok) { const d = await res.json(); setProfile(d.user); }
  }

  async function fetchInboxes() {
    setLoading(true);
    const res = await fetch("/api/mail");
    if (res.ok) { const d = await res.json(); setInboxes(d.inboxes); }
    setLoading(false);
  }

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated") {
      fetchProfile();
      fetchInboxes();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  async function fetchEmails(inboxId: string) {
    setRefreshing(true);
    const res = await fetch(`/api/mail/${inboxId}`);
    if (res.ok) { const d = await res.json(); setEmails(d.emails); }
    setRefreshing(false);
  }

  async function fetchEmail(inboxId: string, emailId: string) {
    const res = await fetch(`/api/mail/${inboxId}/emails/${emailId}`);
    if (res.ok) { const d = await res.json(); setSelectedEmail(d.email); }
  }

  async function createInbox() {
    setCreating(true);
    const body = customAddr ? { localPart: customAddr } : {};
    const res = await fetch("/api/mail", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (res.ok) {
      toast.success(`Inbox created: ${data.inbox.address}`);
      setInboxes((p) => [data.inbox, ...p]);
      setCustomAddr("");
      setShowNewInbox(false);
      fetchProfile();
    } else {
      toast.error(data.error ?? "Failed to create inbox");
    }
    setCreating(false);
  }

  async function deleteInbox(inboxId: string, addr: string) {
    if (!confirm(`Delete ${addr}? All emails will be lost.`)) return;
    const res = await fetch(`/api/mail/${inboxId}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Inbox deleted");
      setInboxes((p) => p.filter((i) => i._id !== inboxId));
      if (selectedInbox?._id === inboxId) { setSelectedInbox(null); setActiveTab("inboxes"); }
      fetchProfile();
    } else {
      toast.error("Failed to delete inbox");
    }
  }

  async function deleteEmail(emailId: string) {
    if (!selectedInbox) return;
    const res = await fetch(`/api/mail/${selectedInbox._id}/emails/${emailId}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Email deleted");
      setEmails((p) => p.filter((e) => e._id !== emailId));
      if (selectedEmail?._id === emailId) setSelectedEmail(null);
    }
  }

  async function regenerateApiKey() {
    if (!confirm("Regenerate your API key? The old key will stop working immediately.")) return;
    const res = await fetch("/api/user/me", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "regenerate-api-key" }),
    });
    const data = await res.json();
    if (res.ok) {
      toast.success("API key regenerated");
      setProfile((p) => p ? { ...p, apiKey: data.apiKey } : p);
    }
  }

  function copyToClipboard(text: string, label = "Copied!") {
    navigator.clipboard.writeText(text);
    toast.success(label);
  }

  function openInbox(inbox: InboxDoc) {
    setSelectedInbox(inbox);
    setActiveTab("inbox-detail");
    setSelectedEmail(null);
    fetchEmails(inbox._id);
  }

  if (status === "loading") {
    return (
      <div style={{ minHeight: "100vh", background: "#0d0d14", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <div style={{ width: 40, height: 40, border: "3px solid #1e1e2e", borderTopColor: "#7c3aed", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <p style={{ color: "#64748b", fontSize: 14 }}>Loading dashboard…</p>
        </div>
      </div>
    );
  }

  const planLimit = PLAN_LIMITS[profile?.plan ?? "free"];
  const usagePercent = planLimit === Infinity ? 0 : Math.min(100, ((profile?.inboxCount ?? 0) / planLimit) * 100);

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#0d0d14", color: "#e2e8f0" }}>

      {/* ── Sidebar ── */}
      <aside style={{
        width: SIDEBAR_W, flexShrink: 0,
        background: "#0d0d14", borderRight: "1px solid #1e1e2e",
        display: "flex", flexDirection: "column",
        position: "sticky", top: 0, height: "100vh", overflowY: "auto",
      }}>
        {/* Logo */}
        <div style={{ padding: "20px 20px 12px", borderBottom: "1px solid #1e1e2e" }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: "linear-gradient(135deg, #7c3aed, #10b981)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Mail size={18} color="white" />
            </div>
            <span style={{ fontWeight: 700, fontSize: 16, color: "#f1f5f9" }}>MailDrop</span>
          </Link>
        </div>

        {/* User info */}
        <div style={{ padding: "14px 16px", borderBottom: "1px solid #1e1e2e" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: "linear-gradient(135deg, #7c3aed44, #10b98144)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 700, color: "#a78bfa", flexShrink: 0 }}>
              {session?.user?.name?.[0]?.toUpperCase() ?? "?"}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#f1f5f9", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{session?.user?.name ?? "User"}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                <PlanBadge plan={(profile?.plan as "free") ?? "free"} />
              </div>
            </div>
          </div>
          {/* Balance */}
          <div style={{ marginTop: 12, background: "#13131f", borderRadius: 10, padding: "8px 12px", display: "flex", alignItems: "center", gap: 8 }}>
            <CreditCard size={14} color="#10b981" />
            <span style={{ fontSize: 12, color: "#64748b" }}>Balance</span>
            <span style={{ marginLeft: "auto", fontSize: 13, fontWeight: 700, color: "#34d399" }}>
              ${(profile?.balance ?? 0).toFixed(2)}
            </span>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: "12px 10px" }}>
          {[
            { id: "inboxes", icon: <Inbox size={16} />, label: "My Inboxes", badge: inboxes.length },
            { id: "billing", icon: <CreditCard size={16} />, label: "Billing" },
            { id: "settings", icon: <Settings size={16} />, label: "Settings" },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => { setActiveTab(item.id as "inboxes" | "settings" | "billing"); if (item.id === "inboxes") { setSelectedInbox(null); setSelectedEmail(null); } }}
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: 10,
                padding: "9px 12px", borderRadius: 10, border: "none", cursor: "pointer",
                marginBottom: 2, textAlign: "left",
                background: activeTab === item.id ? "rgba(124,58,237,0.15)" : "transparent",
                color: activeTab === item.id ? "#a78bfa" : "#64748b",
                fontWeight: activeTab === item.id ? 600 : 400,
                fontSize: 14, transition: "all 0.15s",
              }}
              onMouseEnter={(e) => { if (activeTab !== item.id) (e.currentTarget as HTMLButtonElement).style.background = "rgba(255,255,255,0.04)"; }}
              onMouseLeave={(e) => { if (activeTab !== item.id) (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
            >
              {item.icon}
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.badge !== undefined && (
                <span style={{ fontSize: 11, background: "#1e1e2e", color: "#64748b", borderRadius: 100, padding: "1px 7px", fontWeight: 600 }}>
                  {item.badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Sign out */}
        <div style={{ padding: "12px 10px", borderTop: "1px solid #1e1e2e" }}>
          <button
            onClick={() => signOut({ callbackUrl: "/" })}
            style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 10, border: "none", cursor: "pointer", background: "transparent", color: "#64748b", fontSize: 14, textAlign: "left", transition: "all 0.15s" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "rgba(239,68,68,0.08)"; (e.currentTarget as HTMLButtonElement).style.color = "#f87171"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; (e.currentTarget as HTMLButtonElement).style.color = "#64748b"; }}
          >
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      </aside>

      {/* ── Main content ── */}
      <main style={{ flex: 1, overflowY: "auto", minWidth: 0 }}>

        {/* ─── INBOXES LIST ─────────────────────── */}
        {activeTab === "inboxes" && (
          <div style={{ padding: "32px" }}>
            {/* Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 }}>
              <div>
                <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#f1f5f9", letterSpacing: "-0.02em" }}>My Inboxes</h1>
                <p style={{ color: "#64748b", fontSize: 14, marginTop: 4 }}>
                  {inboxes.length} / {planLimit === Infinity ? "∞" : planLimit} inboxes used
                </p>
              </div>
              <button
                onClick={() => setShowNewInbox((v) => !v)}
                disabled={inboxes.length >= planLimit}
                style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "9px 18px", borderRadius: 10, border: "none", cursor: "pointer",
                  background: inboxes.length >= planLimit ? "#1e1e2e" : "linear-gradient(135deg, #7c3aed, #6d28d9)",
                  color: inboxes.length >= planLimit ? "#4b5563" : "white",
                  fontWeight: 600, fontSize: 14,
                  boxShadow: inboxes.length < planLimit ? "0 4px 12px rgba(124,58,237,0.3)" : "none",
                }}
              >
                <Plus size={16} /> New Inbox
              </button>
            </div>

            {/* Usage bar */}
            {planLimit !== Infinity && (
              <div style={{ background: "#13131f", border: "1px solid #1e1e2e", borderRadius: 12, padding: "14px 18px", marginBottom: 24 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                  <span style={{ fontSize: 13, color: "#94a3b8", display: "flex", alignItems: "center", gap: 6 }}>
                    <BarChart2 size={14} color="#7c3aed" /> Plan usage
                  </span>
                  <span style={{ fontSize: 12, color: "#64748b" }}>{inboxes.length}/{planLimit}</span>
                </div>
                <div style={{ height: 6, background: "#1e1e2e", borderRadius: 99 }}>
                  <div style={{ height: 6, width: `${usagePercent}%`, background: usagePercent > 80 ? "#ef4444" : "linear-gradient(90deg, #7c3aed, #10b981)", borderRadius: 99, transition: "width 0.4s" }} />
                </div>
              </div>
            )}

            {/* New inbox form */}
            {showNewInbox && (
              <div style={{ background: "#13131f", border: "1px solid rgba(124,58,237,0.3)", borderRadius: 14, padding: 20, marginBottom: 24, boxShadow: "0 4px 20px rgba(124,58,237,0.1)" }}>
                <p style={{ fontSize: 14, color: "#94a3b8", marginBottom: 12, fontWeight: 500 }}>
                  <Plus size={14} style={{ display: "inline", marginRight: 6 }} />
                  Create new inbox
                </p>
                <div style={{ display: "flex", gap: 10 }}>
                  <input
                    value={customAddr}
                    onChange={(e) => setCustomAddr(e.target.value)}
                    placeholder="Leave blank for random address"
                    style={{ flex: 1, background: "#0d0d14", border: "1px solid #1e1e2e", borderRadius: 9, padding: "9px 14px", color: "#e2e8f0", fontSize: 14, outline: "none" }}
                    onKeyDown={(e) => e.key === "Enter" && createInbox()}
                    onFocus={(e) => (e.target.style.borderColor = "#7c3aed")}
                    onBlur={(e) => (e.target.style.borderColor = "#1e1e2e")}
                  />
                  <button
                    onClick={createInbox} disabled={creating}
                    style={{ padding: "9px 20px", borderRadius: 9, border: "none", background: "linear-gradient(135deg, #7c3aed, #6d28d9)", color: "white", fontWeight: 600, fontSize: 14, cursor: "pointer" }}
                  >
                    {creating ? "Creating…" : "Create"}
                  </button>
                  <button onClick={() => setShowNewInbox(false)} style={{ padding: "9px 14px", borderRadius: 9, border: "1px solid #1e1e2e", background: "transparent", color: "#64748b", cursor: "pointer", fontSize: 14 }}>
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Inbox list */}
            {loading ? (
              <div style={{ textAlign: "center", padding: "60px 0", color: "#4b5563" }}>
                <RefreshCw size={24} style={{ animation: "spin 0.8s linear infinite", margin: "0 auto 12px", display: "block" }} />
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                Loading inboxes…
              </div>
            ) : inboxes.length === 0 ? (
              <div style={{ textAlign: "center", padding: "80px 0" }}>
                <div style={{ width: 64, height: 64, borderRadius: 18, background: "rgba(124,58,237,0.1)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                  <Inbox size={28} color="#7c3aed" />
                </div>
                <h3 style={{ color: "#f1f5f9", fontWeight: 600, marginBottom: 8 }}>No inboxes yet</h3>
                <p style={{ color: "#64748b", fontSize: 14, marginBottom: 20 }}>Create your first disposable email inbox</p>
                <button onClick={() => setShowNewInbox(true)} style={{ padding: "9px 20px", borderRadius: 10, border: "none", background: "linear-gradient(135deg, #7c3aed, #6d28d9)", color: "white", fontWeight: 600, fontSize: 14, cursor: "pointer" }}>
                  <Plus size={14} style={{ display: "inline", marginRight: 6 }} /> Create Inbox
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {inboxes.map((inbox) => (
                  <div
                    key={inbox._id}
                    onClick={() => openInbox(inbox)}
                    style={{ background: "#13131f", border: "1px solid #1e1e2e", borderRadius: 14, padding: "16px 20px", cursor: "pointer", display: "flex", alignItems: "center", gap: 14, transition: "all 0.15s" }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(124,58,237,0.4)"; (e.currentTarget as HTMLDivElement).style.background = "#16162a"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.borderColor = "#1e1e2e"; (e.currentTarget as HTMLDivElement).style.background = "#13131f"; }}
                  >
                    <div style={{ width: 40, height: 40, borderRadius: 11, background: "rgba(124,58,237,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                      <Mail size={18} color="#a78bfa" />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: "#f1f5f9", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {inbox.address}
                      </div>
                      <div style={{ fontSize: 12, color: "#64748b", marginTop: 3, display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Clock size={11} /> {timeAgo(inbox.createdAt)}</span>
                        <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Mail size={11} /> {inbox.emailCount} emails</span>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      <button
                        onClick={(e) => { e.stopPropagation(); copyToClipboard(inbox.address, "Address copied!"); }}
                        style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid #1e1e2e", background: "transparent", cursor: "pointer", color: "#64748b", display: "flex", alignItems: "center", justifyContent: "center" }}
                        title="Copy address"
                      >
                        <Copy size={14} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteInbox(inbox._id, inbox.address); }}
                        style={{ width: 32, height: 32, borderRadius: 8, border: "1px solid #1e1e2e", background: "transparent", cursor: "pointer", color: "#64748b", display: "flex", alignItems: "center", justifyContent: "center" }}
                        title="Delete inbox"
                        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#ef4444"; (e.currentTarget as HTMLButtonElement).style.color = "#f87171"; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#1e1e2e"; (e.currentTarget as HTMLButtonElement).style.color = "#64748b"; }}
                      >
                        <Trash2 size={14} />
                      </button>
                      <ChevronRight size={16} color="#4b5563" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── INBOX DETAIL ─────────────────────── */}
        {activeTab === "inbox-detail" && selectedInbox && (
          <div style={{ display: "flex", height: "100vh", overflow: "hidden" }}>
            {/* Email list */}
            <div style={{ width: 320, borderRight: "1px solid #1e1e2e", display: "flex", flexDirection: "column", overflowY: "auto" }}>
              <div style={{ padding: "20px 16px 12px", borderBottom: "1px solid #1e1e2e", position: "sticky", top: 0, background: "#0d0d14", zIndex: 10 }}>
                <button onClick={() => setActiveTab("inboxes")} style={{ background: "none", border: "none", color: "#64748b", cursor: "pointer", fontSize: 13, marginBottom: 10, display: "flex", alignItems: "center", gap: 4 }}>
                  ← Back
                </button>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#f1f5f9", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {selectedInbox.address}
                </div>
                <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
                  <button onClick={() => { copyToClipboard(selectedInbox.address, "Address copied!"); }} style={{ flex: 1, padding: "6px 0", borderRadius: 8, border: "1px solid #1e1e2e", background: "transparent", color: "#94a3b8", fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                    <Copy size={12} /> Copy
                  </button>
                  <button onClick={() => fetchEmails(selectedInbox._id)} style={{ flex: 1, padding: "6px 0", borderRadius: 8, border: "1px solid #1e1e2e", background: "transparent", color: "#94a3b8", fontSize: 12, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                    <RefreshCw size={12} style={refreshing ? { animation: "spin 0.8s linear infinite" } : {}} /> Refresh
                  </button>
                </div>
              </div>
              <div style={{ flex: 1, padding: 8 }}>
                {emails.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "40px 16px", color: "#4b5563" }}>
                    <Mail size={24} style={{ margin: "0 auto 10px", display: "block", color: "#2d2d3f" }} />
                    <p style={{ fontSize: 13 }}>No emails yet</p>
                    <p style={{ fontSize: 12, marginTop: 4 }}>Emails sent to this address will appear here</p>
                  </div>
                ) : (
                  emails.map((email) => (
                    <div
                      key={email._id}
                      onClick={() => fetchEmail(selectedInbox._id, email._id)}
                      style={{
                        padding: "12px 14px", borderRadius: 10, cursor: "pointer", marginBottom: 4,
                        background: selectedEmail?._id === email._id ? "rgba(124,58,237,0.15)" : "transparent",
                        border: `1px solid ${selectedEmail?._id === email._id ? "rgba(124,58,237,0.3)" : "transparent"}`,
                        transition: "all 0.15s",
                      }}
                      onMouseEnter={(e) => { if (selectedEmail?._id !== email._id) (e.currentTarget as HTMLDivElement).style.background = "rgba(255,255,255,0.04)"; }}
                      onMouseLeave={(e) => { if (selectedEmail?._id !== email._id) (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                        <span style={{ fontSize: 12, fontWeight: email.isRead ? 400 : 600, color: email.isRead ? "#64748b" : "#f1f5f9", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 160 }}>
                          {email.fromName || email.from}
                        </span>
                        {!email.isRead && <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#7c3aed", flexShrink: 0 }} />}
                      </div>
                      <div style={{ fontSize: 13, color: "#94a3b8", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {email.subject}
                      </div>
                      <div style={{ fontSize: 11, color: "#4b5563", marginTop: 4 }}>{timeAgo(email.receivedAt)}</div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Email viewer */}
            <div style={{ flex: 1, overflowY: "auto", padding: 32 }}>
              {!selectedEmail ? (
                <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, color: "#4b5563" }}>
                  <Mail size={40} color="#1e1e2e" />
                  <p style={{ fontSize: 14 }}>Select an email to read</p>
                </div>
              ) : (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
                    <div>
                      <h2 style={{ fontSize: "1.25rem", fontWeight: 700, color: "#f1f5f9", marginBottom: 8 }}>{selectedEmail.subject}</h2>
                      <div style={{ fontSize: 13, color: "#64748b" }}>
                        <strong style={{ color: "#94a3b8" }}>From:</strong> {selectedEmail.fromName ? `${selectedEmail.fromName} <${selectedEmail.from}>` : selectedEmail.from}
                      </div>
                      <div style={{ fontSize: 13, color: "#64748b", marginTop: 2 }}>
                        <strong style={{ color: "#94a3b8" }}>To:</strong> {selectedEmail.to}
                      </div>
                      <div style={{ fontSize: 12, color: "#4b5563", marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>
                        <Clock size={11} /> {new Date(selectedEmail.receivedAt).toLocaleString()}
                      </div>
                    </div>
                    <button
                      onClick={() => deleteEmail(selectedEmail._id)}
                      style={{ padding: "7px 14px", borderRadius: 8, border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.08)", color: "#f87171", fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
                    >
                      <Trash2 size={14} /> Delete
                    </button>
                  </div>
                  <div style={{ height: 1, background: "#1e1e2e", marginBottom: 24 }} />
                  {selectedEmail.html ? (
                    <iframe
                      srcDoc={selectedEmail.html}
                      style={{ width: "100%", minHeight: 400, border: "1px solid #1e1e2e", borderRadius: 10, background: "#fff" }}
                      sandbox="allow-same-origin"
                      title="Email content"
                    />
                  ) : (
                    <pre style={{ whiteSpace: "pre-wrap", fontSize: 14, color: "#94a3b8", lineHeight: 1.7, background: "transparent", border: "none", padding: 0 }}>
                      {selectedEmail.text || "(No content)"}
                    </pre>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── BILLING ──────────────────────────── */}
        {activeTab === "billing" && (
          <div style={{ padding: 32 }}>
            <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#f1f5f9", marginBottom: 6 }}>Billing & Credits</h1>
            <p style={{ color: "#64748b", fontSize: 14, marginBottom: 28 }}>Manage your plan and top up via Discord</p>

            {/* Stats row */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 28 }}>
              <StatCard label="Current Balance" value={`$${(profile?.balance ?? 0).toFixed(2)}`} icon={<CreditCard size={18} />} color="#10b981" />
              <StatCard label="Current Plan" value={profile?.plan ?? "free"} icon={<Layers size={18} />} color="#7c3aed" />
              <StatCard label="Emails Received" value={profile?.emailsReceived ?? 0} icon={<Mail size={18} />} color="#5865f2" />
              <StatCard label="Inboxes Created" value={profile?.inboxCount ?? 0} icon={<Inbox size={18} />} color="#f59e0b" />
            </div>

            {/* How to top up */}
            <div style={{ background: "#13131f", border: "1px solid rgba(88,101,242,0.3)", borderRadius: 16, padding: 24, marginBottom: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(88,101,242,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <TrendingUp size={18} color="#818cf8" />
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 600, color: "#f1f5f9" }}>How to top up credits</h3>
              </div>
              <p style={{ color: "#64748b", fontSize: 14, lineHeight: 1.6 }}>
                Contact the server owner on Discord and ask them to run:<br />
                <code style={{ background: "#0a0a12", border: "1px solid #1e1e2e", borderRadius: 6, padding: "2px 8px", fontSize: 13, color: "#a78bfa", fontFamily: "var(--font-geist-mono)" }}>!topupbyemail {profile?.email ?? "your@email.com"} &lt;amount&gt;</code>
              </p>
              <p style={{ color: "#64748b", fontSize: 13, marginTop: 10 }}>
                Once topped up you&apos;ll receive a DM notification and your balance here will update automatically.
              </p>
            </div>

            {/* Plan comparison */}
            <h3 style={{ fontSize: 15, fontWeight: 600, color: "#f1f5f9", marginBottom: 16 }}>Available Plans</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
              {[
                { plan: "free", label: "Free", price: "$0", inboxes: "3", emails: "100/mo", color: "#94a3b8" },
                { plan: "starter", label: "Starter", price: "$5/mo", inboxes: "10", emails: "1K/mo", color: "#7c3aed" },
                { plan: "pro", label: "Pro", price: "$15/mo", inboxes: "50", emails: "10K/mo", color: "#10b981" },
                { plan: "enterprise", label: "Enterprise", price: "$50/mo", inboxes: "∞", emails: "∞", color: "#f59e0b" },
              ].map((p) => (
                <div key={p.plan} style={{ background: "#13131f", border: `1px solid ${profile?.plan === p.plan ? p.color + "55" : "#1e1e2e"}`, borderRadius: 14, padding: 18, position: "relative" }}>
                  {profile?.plan === p.plan && (
                    <div style={{ position: "absolute", top: -10, right: 12, background: p.color, color: p.plan === "free" ? "#000" : "white", fontSize: 10, fontWeight: 700, padding: "2px 10px", borderRadius: 100 }}>CURRENT</div>
                  )}
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: p.color, marginBottom: 10, boxShadow: `0 0 8px ${p.color}` }} />
                  <div style={{ fontWeight: 700, fontSize: 15, color: "#f1f5f9", marginBottom: 6 }}>{p.label}</div>
                  <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "#f1f5f9", marginBottom: 12 }}>{p.price}</div>
                  <div style={{ fontSize: 13, color: "#64748b" }}>📬 {p.inboxes} inboxes</div>
                  <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>📧 {p.emails} emails</div>
                </div>
              ))}
            </div>

            {/* Recent transactions */}
            {profile?.recentTransactions && profile.recentTransactions.length > 0 && (
              <div style={{ marginTop: 28 }}>
                <h3 style={{ fontSize: 15, fontWeight: 600, color: "#f1f5f9", marginBottom: 14 }}>Recent Transactions</h3>
                <div style={{ background: "#13131f", border: "1px solid #1e1e2e", borderRadius: 14, overflow: "hidden" }}>
                  {profile.recentTransactions.map((tx, i) => (
                    <div key={i} style={{ padding: "14px 18px", borderBottom: i < profile.recentTransactions.length - 1 ? "1px solid #1e1e2e" : "none", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <div style={{ fontSize: 14, color: "#f1f5f9" }}>{tx.description}</div>
                        <div style={{ fontSize: 12, color: "#4b5563", marginTop: 2 }}>{timeAgo(tx.createdAt)}</div>
                      </div>
                      <span style={{ fontWeight: 700, fontSize: 15, color: tx.type === "deduct" ? "#f87171" : "#34d399" }}>
                        {tx.type === "deduct" ? "-" : "+"}${Math.abs(tx.amount).toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── SETTINGS ─────────────────────────── */}
        {activeTab === "settings" && (
          <div style={{ padding: 32, maxWidth: 640 }}>
            <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "#f1f5f9", marginBottom: 6 }}>Account Settings</h1>
            <p style={{ color: "#64748b", fontSize: 14, marginBottom: 28 }}>Manage your account and API access</p>

            {/* Profile card */}
            <div style={{ background: "#13131f", border: "1px solid #1e1e2e", borderRadius: 16, padding: 24, marginBottom: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 20 }}>
                <div style={{ width: 56, height: 56, borderRadius: "50%", background: "linear-gradient(135deg, #7c3aed, #10b981)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 800, color: "white" }}>
                  {session?.user?.name?.[0]?.toUpperCase() ?? "?"}
                </div>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 700, color: "#f1f5f9" }}>{profile?.username ?? session?.user?.name}</div>
                  <div style={{ fontSize: 14, color: "#64748b", marginTop: 2 }}>{profile?.email ?? session?.user?.email}</div>
                  <div style={{ marginTop: 6 }}><PlanBadge plan={(profile?.plan as "free") ?? "free"} size="md" /></div>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                {[
                  { icon: <Mail size={14} />, label: "Email", value: profile?.email ?? "—" },
                  { icon: <CreditCard size={14} />, label: "Balance", value: `$${(profile?.balance ?? 0).toFixed(2)}` },
                  { icon: <Inbox size={14} />, label: "Inboxes", value: profile?.inboxCount ?? 0 },
                  { icon: <Clock size={14} />, label: "Member since", value: profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : "—" },
                ].map((item) => (
                  <div key={item.label} style={{ background: "#0d0d14", borderRadius: 10, padding: "10px 14px" }}>
                    <div style={{ fontSize: 11, color: "#4b5563", display: "flex", alignItems: "center", gap: 5, marginBottom: 4 }}>
                      {item.icon} {item.label}
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: "#94a3b8" }}>{String(item.value)}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* API Key */}
            <div style={{ background: "#13131f", border: "1px solid #1e1e2e", borderRadius: 16, padding: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(124,58,237,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Key size={16} color="#a78bfa" />
                </div>
                <div>
                  <h3 style={{ fontSize: 15, fontWeight: 600, color: "#f1f5f9" }}>API Key</h3>
                  <p style={{ fontSize: 12, color: "#64748b" }}>Use this key to authenticate API requests</p>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <div style={{ flex: 1, background: "#0d0d14", border: "1px solid #1e1e2e", borderRadius: 10, padding: "9px 14px", fontFamily: "var(--font-geist-mono), monospace", fontSize: 13, color: "#a78bfa", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {showApiKey ? (profile?.apiKey ?? "Loading…") : "ms_" + "•".repeat(28)}
                </div>
                <button onClick={() => setShowApiKey((v) => !v)} style={{ padding: "9px 12px", borderRadius: 10, border: "1px solid #1e1e2e", background: "transparent", color: "#64748b", cursor: "pointer" }} title={showApiKey ? "Hide" : "Show"}>
                  {showApiKey ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
                <button
                  onClick={() => { copyToClipboard(profile?.apiKey ?? "", "API key copied!"); setCopiedKey(true); setTimeout(() => setCopiedKey(false), 2000); }}
                  style={{ padding: "9px 12px", borderRadius: 10, border: "1px solid #1e1e2e", background: "transparent", color: copiedKey ? "#10b981" : "#64748b", cursor: "pointer" }}
                  title="Copy"
                >
                  {copiedKey ? <Check size={16} /> : <Copy size={16} />}
                </button>
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <button
                  onClick={regenerateApiKey}
                  style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 9, border: "1px solid rgba(239,68,68,0.3)", background: "rgba(239,68,68,0.06)", color: "#f87171", fontSize: 13, cursor: "pointer" }}
                >
                  <RefreshCw size={13} /> Regenerate Key
                </button>
                <Link href="/docs" style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 9, border: "1px solid #1e1e2e", background: "transparent", color: "#64748b", fontSize: 13, textDecoration: "none" }}>
                  <ExternalLink size={13} /> API Docs
                </Link>
              </div>
              <div style={{ marginTop: 14, padding: "10px 14px", background: "rgba(245,158,11,0.08)", borderRadius: 9, border: "1px solid rgba(245,158,11,0.2)" }}>
                <p style={{ fontSize: 12, color: "#fbbf24", display: "flex", alignItems: "center", gap: 6 }}>
                  <AlertCircle size={13} />
                  Keep your API key secret. Do not share it or commit it to version control.
                </p>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
