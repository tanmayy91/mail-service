"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Link2, LogOut, Settings, Copy, Check, RefreshCw, Trash2,
  Plus, AlertCircle, ExternalLink, Key, EyeOff, Eye,
  TrendingUp, CreditCard, MousePointer2, BarChart3, Scissors,
  ShieldCheck, Clock,
} from "lucide-react";
import { StatCard } from "@/components/ui/StatCard";
import { PlanBadge } from "@/components/ui/PlanBadge";
import { toast } from "sonner";
import { timeAgo } from "@/lib/utils";

interface LinkDoc {
  _id: string;
  slug: string;
  url: string;
  title?: string;
  clicks: number;
  isActive: boolean;
  expiresAt?: string;
  createdAt: string;
}

interface UserProfile {
  _id: string;
  email: string;
  username: string;
  balance: number;
  plan: "none" | "free" | "starter" | "pro" | "enterprise" | "custom";
  apiKey: string;
  linkCount: number;
  totalClicks: number;
  createdAt: string;
  recentTransactions: { type: string; amount: number; description: string; createdAt: string }[];
}

const PLAN_LIMITS: Record<string, number> = {
  none: 0, free: 10, starter: 100, pro: 500, enterprise: Infinity, custom: Infinity,
};
const SIDEBAR_W = 240;

export default function DashboardClient() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"links" | "settings" | "billing">("links");
  const [links, setLinks] = useState<LinkDoc[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [newUrl, setNewUrl] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [copiedKey, setCopiedKey] = useState(false);
  const [showNewLink, setShowNewLink] = useState(false);
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  async function fetchProfile() {
    const res = await fetch("/api/user/me");
    if (res.ok) { const d = await res.json(); setProfile(d.user); }
  }

  async function fetchLinks() {
    setLoading(true);
    const res = await fetch("/api/links");
    if (res.ok) { const d = await res.json(); setLinks(d.links); }
    setLoading(false);
  }

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated") { fetchProfile(); fetchLinks(); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  async function createLink() {
    if (!newUrl) return;
    try { new URL(newUrl); } catch { toast.error("Invalid URL"); return; }
    setCreating(true);
    try {
      const body: Record<string, string> = { url: newUrl };
      if (newSlug.trim()) body.slug = newSlug.trim();
      if (newTitle.trim()) body.title = newTitle.trim();
      const res = await fetch("/api/links", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || "Failed to create link"); return; }
      setLinks((prev) => [data.link, ...prev]);
      setNewUrl(""); setNewSlug(""); setNewTitle("");
      setShowNewLink(false);
      toast.success("Short link created!");
      fetchProfile();
    } finally { setCreating(false); }
  }

  async function deleteLink(id: string) {
    if (!confirm("Delete this link?")) return;
    const res = await fetch(`/api/links/${id}`, { method: "DELETE" });
    if (res.ok) {
      setLinks((prev) => prev.filter((l) => l._id !== id));
      toast.success("Link deleted");
      fetchProfile();
    } else { toast.error("Failed to delete"); }
  }

  function copyShortUrl(slug: string) {
    navigator.clipboard.writeText(`${window.location.origin}/api/r/${slug}`);
    setCopiedSlug(slug);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopiedSlug(null), 2000);
  }

  async function regenerateApiKey() {
    if (!confirm("Regenerate API key? The old key will stop working immediately.")) return;
    const res = await fetch("/api/user/me", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "regenerate-api-key" }),
    });
    if (res.ok) { toast.success("API key regenerated"); fetchProfile(); }
    else toast.error("Failed to regenerate");
  }

  const planLimit = PLAN_LIMITS[profile?.plan ?? "none"];
  const atLimit   = links.length >= planLimit;

  if (status === "loading" || !session) {
    return (
      <div style={{ minHeight: "100vh", background: "#0d0d14", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: "#64748b", fontSize: 15 }}>Loading…</div>
      </div>
    );
  }

  const NAV_ITEMS = [
    { id: "links",    icon: <Link2 size={18} />,      label: "My Links" },
    { id: "billing",  icon: <CreditCard size={18} />, label: "Billing" },
    { id: "settings", icon: <Settings size={18} />,   label: "Settings" },
  ] as const;

  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#0d0d14", color: "#e2e8f0", fontFamily: "var(--font-geist-sans), sans-serif" }}>

      {/* ── Sidebar ── */}
      <aside style={{ width: SIDEBAR_W, flexShrink: 0, borderRight: "1px solid #1e1e2e", display: "flex", flexDirection: "column", position: "fixed", top: 0, bottom: 0, left: 0, background: "#0a0a12", zIndex: 20, padding: "0 0 20px" }}>
        {/* Brand */}
        <div style={{ padding: "20px 20px 16px", borderBottom: "1px solid #1e1e2e" }}>
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 9, textDecoration: "none" }}>
            <div style={{ width: 32, height: 32, borderRadius: 9, background: "linear-gradient(135deg, #7c3aed, #10b981)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Link2 size={15} color="white" />
            </div>
            <span style={{ fontWeight: 800, fontSize: 15, color: "#f1f5f9" }}>LinkDrop</span>
          </Link>
        </div>

        {/* Profile */}
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #1e1e2e" }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#f1f5f9", marginBottom: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{profile?.username ?? session.user?.name}</div>
          <div style={{ fontSize: 12, color: "#64748b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: 8 }}>{profile?.email ?? session.user?.email}</div>
          {profile && <PlanBadge plan={profile.plan} />}
        </div>

        {/* Nav */}
        <nav style={{ padding: "12px 12px", flex: 1 }}>
          {NAV_ITEMS.map((item) => (
            <button key={item.id}
              onClick={() => setActiveTab(item.id)}
              style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "9px 12px", borderRadius: 9, border: "none", cursor: "pointer", fontSize: 14, fontWeight: 500, marginBottom: 4, background: activeTab === item.id ? "rgba(124,58,237,0.15)" : "transparent", color: activeTab === item.id ? "#a78bfa" : "#64748b", transition: "all 0.15s", textAlign: "left" }}
            >
              {item.icon} {item.label}
            </button>
          ))}
        </nav>

        {/* Sign out */}
        <div style={{ padding: "0 12px" }}>
          <button onClick={() => signOut({ callbackUrl: "/login" })}
            style={{ display: "flex", alignItems: "center", gap: 9, width: "100%", padding: "9px 12px", borderRadius: 9, border: "none", cursor: "pointer", fontSize: 14, color: "#64748b", background: "transparent", transition: "color 0.15s" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#f87171")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#64748b")}
          >
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <main style={{ marginLeft: SIDEBAR_W, flex: 1, padding: "32px 36px", maxWidth: 1100 }}>

        {/* ── Stats row ── */}
        {profile && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16, marginBottom: 28 }}>
            <StatCard icon={<Link2 size={20} />}     label="Total Links"    value={links.length.toString()}               color="#7c3aed" />
            <StatCard icon={<MousePointer2 size={20} />} label="Total Clicks" value={links.reduce((s, l) => s + l.clicks, 0).toString()} color="#10b981" />
            <StatCard icon={<CreditCard size={20} />} label="Balance"       value={`$${profile.balance.toFixed(2)}`}      color="#f59e0b" />
            <StatCard icon={<TrendingUp size={20} />} label="Plan"          value={profile.plan}                          color="#5865f2" />
          </div>
        )}

        {/* ── LINKS TAB ── */}
        {activeTab === "links" && (
          <div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
              <div>
                <h1 style={{ fontSize: "1.4rem", fontWeight: 800, color: "#f1f5f9", marginBottom: 4 }}>My Links</h1>
                <p style={{ fontSize: 13, color: "#64748b" }}>
                  {links.length} of {planLimit === Infinity ? "∞" : planLimit} links used
                </p>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={fetchLinks} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 9, border: "1px solid #1e1e2e", background: "transparent", color: "#64748b", cursor: "pointer", fontSize: 13 }}>
                  <RefreshCw size={14} /> Refresh
                </button>
                <button
                  onClick={() => { if (atLimit) { toast.error(`Upgrade your plan to create more than ${planLimit} links`); return; } setShowNewLink(true); }}
                  style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", borderRadius: 9, border: "none", background: "linear-gradient(135deg, #7c3aed, #6d28d9)", color: "white", cursor: "pointer", fontSize: 13, fontWeight: 600 }}
                >
                  <Plus size={14} /> New Link
                </button>
              </div>
            </div>

            {/* New link form */}
            {showNewLink && (
              <div style={{ background: "#13131f", border: "1px solid #1e1e2e", borderRadius: 14, padding: 20, marginBottom: 20 }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: "#f1f5f9", marginBottom: 16 }}>Create Short Link</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <input
                    type="url"
                    placeholder="Destination URL (required)"
                    value={newUrl}
                    onChange={(e) => setNewUrl(e.target.value)}
                    style={{ padding: "10px 14px", borderRadius: 9, border: "1px solid #1e1e2e", background: "#0a0a12", color: "#e2e8f0", fontSize: 14, outline: "none", width: "100%", boxSizing: "border-box" }}
                  />
                  <div style={{ display: "flex", gap: 10 }}>
                    <input
                      type="text"
                      placeholder="Custom slug (optional)"
                      value={newSlug}
                      onChange={(e) => setNewSlug(e.target.value)}
                      style={{ flex: 1, padding: "10px 14px", borderRadius: 9, border: "1px solid #1e1e2e", background: "#0a0a12", color: "#e2e8f0", fontSize: 14, outline: "none" }}
                    />
                    <input
                      type="text"
                      placeholder="Title (optional)"
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      style={{ flex: 1, padding: "10px 14px", borderRadius: 9, border: "1px solid #1e1e2e", background: "#0a0a12", color: "#e2e8f0", fontSize: 14, outline: "none" }}
                    />
                  </div>
                  <div style={{ display: "flex", gap: 10 }}>
                    <button onClick={createLink} disabled={creating || !newUrl}
                      style={{ padding: "9px 20px", borderRadius: 9, border: "none", background: creating ? "#4b5563" : "linear-gradient(135deg, #7c3aed, #6d28d9)", color: "white", cursor: creating ? "not-allowed" : "pointer", fontSize: 14, fontWeight: 600 }}
                    >
                      {creating ? "Creating…" : "Create Link"}
                    </button>
                    <button onClick={() => { setShowNewLink(false); setNewUrl(""); setNewSlug(""); setNewTitle(""); }}
                      style={{ padding: "9px 16px", borderRadius: 9, border: "1px solid #1e1e2e", background: "transparent", color: "#64748b", cursor: "pointer", fontSize: 14 }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Links list */}
            {loading ? (
              <div style={{ textAlign: "center", padding: "48px 0", color: "#64748b" }}>Loading…</div>
            ) : links.length === 0 ? (
              <div style={{ textAlign: "center", padding: "64px 0", background: "#13131f", borderRadius: 16, border: "1px solid #1e1e2e" }}>
                <Scissors size={36} color="#4b5563" style={{ marginBottom: 14 }} />
                <p style={{ color: "#64748b", marginBottom: 16 }}>No short links yet. Create your first one!</p>
                <button onClick={() => setShowNewLink(true)}
                  style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "10px 20px", borderRadius: 10, border: "none", background: "linear-gradient(135deg, #7c3aed, #6d28d9)", color: "white", cursor: "pointer", fontSize: 14, fontWeight: 600 }}
                >
                  <Plus size={15} /> Create your first link
                </button>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {links.map((link) => {
                  const shortUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/api/r/${link.slug}`;
                  return (
                    <div key={link._id}
                      style={{ background: "#13131f", border: "1px solid #1e1e2e", borderRadius: 14, padding: "16px 18px", display: "flex", alignItems: "center", gap: 14, transition: "border-color 0.15s" }}
                      onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#2d2d3f")}
                      onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#1e1e2e")}
                    >
                      <div style={{ width: 38, height: 38, borderRadius: 10, background: "rgba(124,58,237,0.12)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <Link2 size={17} color="#a78bfa" />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                          <span style={{ fontSize: 14, fontWeight: 700, color: "#f1f5f9" }}>{link.title || link.slug}</span>
                          {link.expiresAt && new Date(link.expiresAt) < new Date() && (
                            <span style={{ fontSize: 11, background: "rgba(239,68,68,0.15)", color: "#f87171", borderRadius: 6, padding: "2px 7px" }}>Expired</span>
                          )}
                        </div>
                        <div style={{ fontSize: 12, color: "#4b5563", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{link.url}</div>
                        <div style={{ fontSize: 12, color: "#7c3aed", marginTop: 2 }}>/{link.slug}</div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 13, color: "#64748b" }}>
                          <MousePointer2 size={13} /> {link.clicks}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "#4b5563", marginLeft: 6 }}>
                          <Clock size={11} /> {timeAgo(link.createdAt)}
                        </div>
                        <button onClick={() => copyShortUrl(link.slug)}
                          style={{ padding: "6px 10px", borderRadius: 7, border: "1px solid #1e1e2e", background: "transparent", color: copiedSlug === link.slug ? "#10b981" : "#64748b", cursor: "pointer", display: "flex", alignItems: "center", gap: 5, fontSize: 12 }}
                        >
                          {copiedSlug === link.slug ? <Check size={12} /> : <Copy size={12} />}
                          {copiedSlug === link.slug ? "Copied" : "Copy"}
                        </button>
                        <a href={shortUrl} target="_blank" rel="noreferrer"
                          style={{ padding: "6px 8px", borderRadius: 7, border: "1px solid #1e1e2e", background: "transparent", color: "#64748b", cursor: "pointer", display: "flex", alignItems: "center" }}
                        >
                          <ExternalLink size={13} />
                        </a>
                        <button onClick={() => deleteLink(link._id)}
                          style={{ padding: "6px 8px", borderRadius: 7, border: "1px solid rgba(239,68,68,0.2)", background: "transparent", color: "#ef4444", cursor: "pointer", display: "flex", alignItems: "center" }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {atLimit && profile && (
              <div style={{ marginTop: 20, background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: 12, padding: "14px 18px", display: "flex", alignItems: "center", gap: 10 }}>
                <AlertCircle size={16} color="#ef4444" />
                <span style={{ fontSize: 14, color: "#fca5a5" }}>
                  You&apos;ve reached the limit for your plan ({planLimit} links).{" "}
                  Contact staff via Discord to upgrade.
                </span>
              </div>
            )}
          </div>
        )}

        {/* ── BILLING TAB ── */}
        {activeTab === "billing" && profile && (
          <div>
            <h1 style={{ fontSize: "1.4rem", fontWeight: 800, color: "#f1f5f9", marginBottom: 24 }}>Billing & Plan</h1>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 28 }}>
              <div style={{ background: "#13131f", border: "1px solid #1e1e2e", borderRadius: 14, padding: 22 }}>
                <div style={{ fontSize: 13, color: "#64748b", marginBottom: 10 }}>Current Plan</div>
                <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "#f1f5f9", letterSpacing: "-0.02em", marginBottom: 8 }}>
                  <PlanBadge plan={profile.plan} />
                </div>
                <div style={{ fontSize: 13, color: "#64748b" }}>
                  {planLimit === Infinity ? "Unlimited" : `${links.length} / ${planLimit}`} links used
                </div>
              </div>
              <div style={{ background: "#13131f", border: "1px solid #1e1e2e", borderRadius: 14, padding: 22 }}>
                <div style={{ fontSize: 13, color: "#64748b", marginBottom: 10 }}>Balance</div>
                <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "#10b981", letterSpacing: "-0.02em", marginBottom: 8 }}>${profile.balance.toFixed(2)}</div>
                <div style={{ fontSize: 13, color: "#64748b" }}>Contact staff on Discord to top up</div>
              </div>
            </div>

            {profile.recentTransactions?.length > 0 && (
              <div style={{ background: "#13131f", border: "1px solid #1e1e2e", borderRadius: 14, overflow: "hidden" }}>
                <div style={{ padding: "16px 20px", borderBottom: "1px solid #1e1e2e", fontSize: 14, fontWeight: 600, color: "#f1f5f9" }}>Recent Transactions</div>
                {profile.recentTransactions.map((tx, i) => (
                  <div key={i} style={{ padding: "14px 20px", borderBottom: "1px solid #0d0d14", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: 14, color: "#e2e8f0" }}>{tx.description}</div>
                      <div style={{ fontSize: 12, color: "#4b5563" }}>{timeAgo(tx.createdAt)}</div>
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: tx.type === "topup" ? "#10b981" : "#ef4444" }}>
                      {tx.type === "topup" ? "+" : "-"}${tx.amount.toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── SETTINGS TAB ── */}
        {activeTab === "settings" && profile && (
          <div>
            <h1 style={{ fontSize: "1.4rem", fontWeight: 800, color: "#f1f5f9", marginBottom: 24 }}>Settings</h1>

            {/* API Key */}
            <div style={{ background: "#13131f", border: "1px solid #1e1e2e", borderRadius: 14, padding: 22, marginBottom: 20 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: "#f1f5f9", marginBottom: 6, display: "flex", alignItems: "center", gap: 8 }}><Key size={16} /> API Key</h3>
              <p style={{ fontSize: 13, color: "#64748b", marginBottom: 14 }}>Use this key in the <code style={{ color: "#a78bfa" }}>x-api-key</code> header to authenticate API requests.</p>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <input readOnly value={showApiKey ? profile.apiKey : "•".repeat(40)}
                  style={{ flex: 1, padding: "10px 14px", borderRadius: 9, border: "1px solid #1e1e2e", background: "#0a0a12", color: "#94a3b8", fontFamily: "var(--font-geist-mono)", fontSize: 13, outline: "none" }}
                />
                <button onClick={() => setShowApiKey(!showApiKey)}
                  style={{ padding: "10px 12px", borderRadius: 9, border: "1px solid #1e1e2e", background: "transparent", color: "#64748b", cursor: "pointer" }}
                >
                  {showApiKey ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
                <button onClick={() => { navigator.clipboard.writeText(profile.apiKey); setCopiedKey(true); setTimeout(() => setCopiedKey(false), 2000); }}
                  style={{ padding: "10px 14px", borderRadius: 9, border: "1px solid #1e1e2e", background: "transparent", color: copiedKey ? "#10b981" : "#64748b", cursor: "pointer", display: "flex", alignItems: "center", gap: 5, fontSize: 13 }}
                >
                  {copiedKey ? <><Check size={13} /> Copied</> : <><Copy size={13} /> Copy</>}
                </button>
                <button onClick={regenerateApiKey}
                  style={{ padding: "10px 14px", borderRadius: 9, border: "1px solid rgba(239,68,68,0.25)", background: "transparent", color: "#ef4444", cursor: "pointer", display: "flex", alignItems: "center", gap: 5, fontSize: 13 }}
                >
                  <RefreshCw size={13} /> Regenerate
                </button>
              </div>
            </div>

            {/* Account info */}
            <div style={{ background: "#13131f", border: "1px solid #1e1e2e", borderRadius: 14, padding: 22, marginBottom: 20 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: "#f1f5f9", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}><ShieldCheck size={16} /> Account Info</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                {[
                  { label: "Username", value: profile.username },
                  { label: "Email",    value: profile.email    },
                  { label: "Plan",     value: profile.plan     },
                  { label: "Member since", value: new Date(profile.createdAt).toLocaleDateString() },
                ].map((row) => (
                  <div key={row.label}>
                    <div style={{ fontSize: 12, color: "#4b5563", marginBottom: 4 }}>{row.label}</div>
                    <div style={{ fontSize: 14, color: "#e2e8f0", fontWeight: 500 }}>{row.value}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Docs link */}
            <div style={{ background: "#13131f", border: "1px solid #1e1e2e", borderRadius: 14, padding: 22 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: "#f1f5f9", marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}>
                <BarChart3 size={16} /> API Documentation
              </h3>
              <p style={{ fontSize: 13, color: "#64748b", marginBottom: 14 }}>Integrate LinkDrop into your apps with our REST API.</p>
              <Link href="/docs" style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 18px", borderRadius: 9, border: "1px solid #7c3aed40", color: "#a78bfa", textDecoration: "none", fontSize: 13, fontWeight: 500 }}>
                View API Docs <ExternalLink size={13} />
              </Link>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
