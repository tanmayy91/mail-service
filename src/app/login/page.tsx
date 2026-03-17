"use client";

import { useState } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Mail, Lock, User, AlertCircle } from "lucide-react";
import Link from "next/link";

export default function LoginPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [adminMode, setAdminMode] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (session) {
      if (session.user.isAdmin) {
        router.push("/admin");
      } else {
        router.push("/dashboard");
      }
    }
  }, [session, router]);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const result = await signIn("admin-login", {
        username,
        password,
        redirect: false,
      });
      if (result?.error) {
        setError("Invalid credentials. Please try again.");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
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
      {/* Background orbs */}
      <div
        style={{
          position: "absolute",
          top: "20%",
          left: "30%",
          width: 400,
          height: 400,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(124,58,237,0.1) 0%, transparent 70%)",
          filter: "blur(60px)",
          pointerEvents: "none",
        }}
      />

      <div style={{ width: "100%", maxWidth: 420, position: "relative" }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                background: "linear-gradient(135deg, #7c3aed, #10b981)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Mail size={26} color="white" />
            </div>
            <span style={{ fontWeight: 800, fontSize: 22, color: "#f1f5f9" }}>MailDrop</span>
          </Link>
          <p style={{ color: "#64748b", marginTop: 12, fontSize: 14 }}>
            Sign in to manage your inboxes
          </p>
        </div>

        {/* Card */}
        <div
          style={{
            background: "#13131f",
            border: "1px solid #1e1e2e",
            borderRadius: 20,
            padding: 32,
          }}
        >
          {/* Tabs */}
          <div
            style={{
              display: "flex",
              background: "#0d0d14",
              borderRadius: 12,
              padding: 4,
              marginBottom: 28,
              border: "1px solid #1e1e2e",
            }}
          >
            <button
              onClick={() => setAdminMode(false)}
              style={{
                flex: 1,
                padding: "0.5rem",
                borderRadius: 9,
                border: "none",
                background: !adminMode ? "#7c3aed" : "transparent",
                color: !adminMode ? "white" : "#64748b",
                fontWeight: 600,
                fontSize: 14,
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              User Login
            </button>
            <button
              onClick={() => setAdminMode(true)}
              style={{
                flex: 1,
                padding: "0.5rem",
                borderRadius: 9,
                border: "none",
                background: adminMode ? "#7c3aed" : "transparent",
                color: adminMode ? "white" : "#64748b",
                fontWeight: 600,
                fontSize: 14,
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              Admin Login
            </button>
          </div>

          {!adminMode ? (
            <div>
              <p style={{ color: "#94a3b8", fontSize: 14, textAlign: "center", marginBottom: 24 }}>
                Connect your Discord account to get started
              </p>
              <button
                onClick={() => signIn("discord", { callbackUrl: "/dashboard" })}
                style={{
                  width: "100%",
                  background: "#5865f2",
                  color: "white",
                  padding: "0.85rem",
                  borderRadius: 12,
                  fontSize: 15,
                  fontWeight: 700,
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 10,
                  boxShadow: "0 4px 16px rgba(88,101,242,0.3)",
                  transition: "opacity 0.2s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.9")}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
              >
                <svg width="22" height="22" viewBox="0 0 71 55" fill="white">
                  <path d="M60.1 4.9C55.5 2.8 50.6 1.2 45.5.4c-.6 1.1-1.3 2.5-1.8 3.7C38.5 3.4 32.7 3.4 27 4.1c-.5-1.2-1.2-2.6-1.8-3.7C20.1 1.2 15.2 2.8 10.6 4.9 1.5 18.5-.9 31.7.3 44.7 6.5 49.2 12.4 51.9 18.3 53.6c1.5-2 2.8-4.1 3.9-6.3-2.2-.8-4.2-1.8-6.1-3 .5-.4 1-.7 1.5-1.1 11.8 5.4 24.6 5.4 36.2 0 .5.4 1 .7 1.5 1.1-1.9 1.2-4 2.2-6.1 3 1.1 2.2 2.4 4.3 3.9 6.3 5.9-1.7 11.8-4.4 18.1-8.9 1.4-14.5-2.4-27.6-11.1-39.8zM23.7 37.1c-3.2 0-5.8-2.9-5.8-6.5s2.6-6.5 5.8-6.5c3.2 0 5.9 2.9 5.8 6.5.1 3.5-2.5 6.5-5.8 6.5zm23.6 0c-3.2 0-5.8-2.9-5.8-6.5s2.6-6.5 5.8-6.5c3.2 0 5.9 2.9 5.8 6.5.1 3.5-2.5 6.5-5.8 6.5z" />
                </svg>
                Continue with Discord
              </button>
              <div style={{ marginTop: 20, padding: "14px 16px", background: "rgba(124,58,237,0.08)", borderRadius: 10, border: "1px solid rgba(124,58,237,0.15)" }}>
                <p style={{ color: "#a78bfa", fontSize: 13, textAlign: "center" }}>
                  🔒 We only request your basic Discord profile info — no messages access
                </p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleAdminLogin}>
              <p style={{ color: "#94a3b8", fontSize: 14, textAlign: "center", marginBottom: 24 }}>
                Admin access only
              </p>

              {error && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    background: "rgba(239,68,68,0.1)",
                    border: "1px solid rgba(239,68,68,0.3)",
                    borderRadius: 10,
                    padding: "10px 14px",
                    marginBottom: 16,
                    color: "#f87171",
                    fontSize: 14,
                  }}
                >
                  <AlertCircle size={16} />
                  {error}
                </div>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div>
                  <label style={{ display: "block", fontSize: 13, color: "#94a3b8", marginBottom: 6, fontWeight: 500 }}>
                    Username
                  </label>
                  <div style={{ position: "relative" }}>
                    <User size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#4b5563" }} />
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="admin"
                      required
                      style={{ paddingLeft: 36 }}
                    />
                  </div>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 13, color: "#94a3b8", marginBottom: 6, fontWeight: 500 }}>
                    Password
                  </label>
                  <div style={{ position: "relative" }}>
                    <Lock size={16} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "#4b5563" }} />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      style={{ paddingLeft: 36 }}
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    width: "100%",
                    background: loading ? "#4b5563" : "linear-gradient(135deg, #7c3aed, #6d28d9)",
                    color: "white",
                    padding: "0.85rem",
                    borderRadius: 12,
                    fontSize: 15,
                    fontWeight: 700,
                    border: "none",
                    cursor: loading ? "not-allowed" : "pointer",
                    marginTop: 4,
                  }}
                >
                  {loading ? "Signing in..." : "Sign in as Admin"}
                </button>
              </div>
            </form>
          )}
        </div>

        <p style={{ textAlign: "center", marginTop: 20, color: "#4b5563", fontSize: 13 }}>
          <Link href="/" style={{ color: "#7c3aed", textDecoration: "none" }}>← Back to home</Link>
        </p>
      </div>
    </div>
  );
}
