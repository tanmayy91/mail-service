"use client";

import { useState, useEffect } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Link2, Lock, User, AlertCircle, Eye, EyeOff, Shield } from "lucide-react";
import Link from "next/link";

export default function LoginPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [adminMode, setAdminMode] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", username: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (session) {
      router.push(session.user.isAdmin ? "/admin" : "/dashboard");
    }
  }, [session, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await signIn(adminMode ? "admin-login" : "credentials", {
      ...(adminMode
        ? { username: form.email, password: form.password }
        : { email: form.email, password: form.password }),
      redirect: false,
    });

    setLoading(false);
    if (result?.error) {
      setError(
        adminMode
          ? "Invalid admin credentials."
          : "Invalid email or password. Create your account via the Discord bot."
      );
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0d0d14",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1.5rem",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Background glow orbs */}
      <div style={{ position: "absolute", top: "15%", left: "25%", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle, rgba(124,58,237,0.08) 0%, transparent 70%)", filter: "blur(60px)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: "10%", right: "20%", width: 350, height: 350, borderRadius: "50%", background: "radial-gradient(circle, rgba(16,185,129,0.06) 0%, transparent 70%)", filter: "blur(60px)", pointerEvents: "none" }} />

      <div style={{ width: "100%", maxWidth: 420, position: "relative", zIndex: 1 }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          <Link href="/" style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 12, textDecoration: "none" }}>
            <div style={{ width: 56, height: 56, borderRadius: 18, background: "linear-gradient(135deg, #7c3aed, #10b981)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 8px 32px rgba(124,58,237,0.3)" }}>
              <Link2 size={28} color="white" />
            </div>
            <span style={{ fontWeight: 800, fontSize: 24, color: "#f1f5f9", letterSpacing: "-0.02em" }}>LinkDrop</span>
          </Link>
          <p style={{ color: "#64748b", marginTop: 8, fontSize: 14 }}>
            {adminMode ? "Admin panel access" : "Sign in to your account"}
          </p>
        </div>

        {/* Card */}
        <div style={{ background: "#13131f", border: "1px solid #1e1e2e", borderRadius: 24, padding: "32px 28px", boxShadow: "0 24px 64px rgba(0,0,0,0.4)" }}>
          
          {/* Mode toggle */}
          <div style={{ display: "flex", background: "#0d0d14", borderRadius: 12, padding: 4, marginBottom: 28, border: "1px solid #1e1e2e" }}>
            {[
              { label: "User Login", icon: <Link2 size={14} />, active: !adminMode, onClick: () => { setAdminMode(false); setError(""); } },
              { label: "Admin Login", icon: <Shield size={14} />, active: adminMode, onClick: () => { setAdminMode(true); setError(""); } },
            ].map((tab) => (
              <button
                key={tab.label}
                onClick={tab.onClick}
                style={{
                  flex: 1, padding: "0.55rem 0.5rem", borderRadius: 9, border: "none",
                  background: tab.active ? "#7c3aed" : "transparent",
                  color: tab.active ? "white" : "#64748b",
                  fontWeight: 600, fontSize: 13, cursor: "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                  transition: "all 0.2s",
                }}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          {/* Info banner for user mode */}
          {!adminMode && (
            <div style={{ background: "rgba(124,58,237,0.08)", border: "1px solid rgba(124,58,237,0.2)", borderRadius: 10, padding: "10px 14px", marginBottom: 20, display: "flex", gap: 10, alignItems: "flex-start" }}>
              <span style={{ fontSize: 16 }}>💬</span>
              <p style={{ color: "#a78bfa", fontSize: 13, lineHeight: 1.5, margin: 0 }}>
                Don&apos;t have an account? Join our Discord server and use the <strong>Create Account</strong> button in the registration channel.
              </p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 10, padding: "10px 14px", marginBottom: 18, color: "#f87171", fontSize: 13 }}>
              <AlertCircle size={15} style={{ flexShrink: 0 }} />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Email / Username field */}
            <div>
              <label style={{ display: "block", fontSize: 13, color: "#94a3b8", marginBottom: 6, fontWeight: 500 }}>
                {adminMode ? "Admin Username" : "Email Address"}
              </label>
              <div style={{ position: "relative" }}>
                {adminMode
                  ? <User size={15} style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", color: "#4b5563", pointerEvents: "none" }} />
                  : <Link2 size={15} style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", color: "#4b5563", pointerEvents: "none" }} />
                }
                <input
                  type={adminMode ? "text" : "email"}
                  value={form.email}
                  onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
                  placeholder={adminMode ? "admin" : "you@example.com"}
                  required
                  style={{ paddingLeft: 38, background: "#0d0d14", border: "1px solid #1e1e2e", borderRadius: 10, padding: "0.65rem 0.75rem 0.65rem 38px", color: "#e2e8f0", fontSize: 14, width: "100%", outline: "none", transition: "border-color 0.2s" }}
                  onFocus={(e) => e.target.style.borderColor = "#7c3aed"}
                  onBlur={(e) => e.target.style.borderColor = "#1e1e2e"}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label style={{ display: "block", fontSize: 13, color: "#94a3b8", marginBottom: 6, fontWeight: 500 }}>Password</label>
              <div style={{ position: "relative" }}>
                <Lock size={15} style={{ position: "absolute", left: 13, top: "50%", transform: "translateY(-50%)", color: "#4b5563", pointerEvents: "none" }} />
                <input
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="••••••••"
                  required
                  style={{ paddingLeft: 38, paddingRight: 42, background: "#0d0d14", border: "1px solid #1e1e2e", borderRadius: 10, padding: "0.65rem 42px 0.65rem 38px", color: "#e2e8f0", fontSize: 14, width: "100%", outline: "none", transition: "border-color 0.2s" }}
                  onFocus={(e) => e.target.style.borderColor = "#7c3aed"}
                  onBlur={(e) => e.target.style.borderColor = "#1e1e2e"}
                />
                <button type="button" onClick={() => setShowPassword(v => !v)} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#4b5563", cursor: "pointer", padding: 2 }}>
                  {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: 4,
                width: "100%",
                background: loading ? "#1e1e2e" : "linear-gradient(135deg, #7c3aed, #6d28d9)",
                color: loading ? "#4b5563" : "white",
                padding: "0.8rem",
                borderRadius: 12,
                fontSize: 15,
                fontWeight: 700,
                border: "none",
                cursor: loading ? "not-allowed" : "pointer",
                boxShadow: loading ? "none" : "0 4px 16px rgba(124,58,237,0.3)",
                transition: "all 0.2s",
              }}
            >
              {loading ? "Signing in…" : `Sign in${adminMode ? " as Admin" : ""}`}
            </button>
          </form>
        </div>

        <p style={{ textAlign: "center", marginTop: 20, color: "#4b5563", fontSize: 13 }}>
          <Link href="/" style={{ color: "#7c3aed", textDecoration: "none" }}>← Back to home</Link>
        </p>
      </div>
    </div>
  );
}
