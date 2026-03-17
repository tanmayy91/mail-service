"use client";

import Link from "next/link";
import { useSession, signIn } from "next-auth/react";
import {
  Mail,
  Shield,
  Zap,
  Globe,
  Code,
  ArrowRight,
  Check,
  Bot,
  Key,
  Inbox,
} from "lucide-react";

const FEATURES = [
  {
    icon: <Inbox size={22} />,
    title: "Instant Inboxes",
    desc: "Create unlimited disposable email addresses in seconds. No credit card required.",
  },
  {
    icon: <Shield size={22} />,
    title: "Privacy First",
    desc: "Keep your real inbox clean. Use temporary addresses for signups, forms, and testing.",
  },
  {
    icon: <Zap size={22} />,
    title: "Real-time Delivery",
    desc: "Receive emails instantly via webhooks or check your inbox through our dashboard.",
  },
  {
    icon: <Code size={22} />,
    title: "Developer API",
    desc: "Full REST API with API key authentication. Integrate mail into any application.",
  },
  {
    icon: <Bot size={22} />,
    title: "Discord Bot",
    desc: "Manage your balance and get notifications right inside your Discord server.",
  },
  {
    icon: <Globe size={22} />,
    title: "Custom Domains",
    desc: "Use your own domain or choose from our selection of available mail domains.",
  },
];

const PLANS = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    color: "#94a3b8",
    features: ["3 inboxes", "100 emails/month", "API access", "7-day retention"],
    cta: "Get Started",
  },
  {
    name: "Starter",
    price: "$5",
    period: "/ month",
    color: "#7c3aed",
    popular: true,
    features: [
      "10 inboxes",
      "1,000 emails/month",
      "API access",
      "30-day retention",
      "Webhook support",
    ],
    cta: "Get Started",
  },
  {
    name: "Pro",
    price: "$15",
    period: "/ month",
    color: "#10b981",
    features: [
      "50 inboxes",
      "10,000 emails/month",
      "API access",
      "90-day retention",
      "Priority support",
      "Custom domain",
    ],
    cta: "Get Started",
  },
  {
    name: "Enterprise",
    price: "$50",
    period: "/ month",
    color: "#f59e0b",
    features: [
      "Unlimited inboxes",
      "Unlimited emails",
      "Full API access",
      "Unlimited retention",
      "Dedicated support",
      "Multiple custom domains",
    ],
    cta: "Contact Us",
  },
];

const CODE_EXAMPLE = `// Create a new inbox
const res = await fetch('https://yourdomain.com/api/mail', {
  method: 'POST',
  headers: {
    'x-api-key': 'ms_your_api_key',
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ localPart: 'myinbox' }),
});

const { inbox } = await res.json();
// { address: 'myinbox@mail.yourdomain.com', ... }`;

export default function LandingPage() {
  const { data: session } = useSession();

  return (
    <div
      style={{
        background: "#0d0d14",
        color: "#e2e8f0",
        minHeight: "100vh",
        fontFamily: "var(--font-geist-sans), sans-serif",
      }}
    >
      {/* Navbar */}
      <nav
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          zIndex: 50,
          borderBottom: "1px solid rgba(255,255,255,0.05)",
          background: "rgba(13,13,20,0.85)",
          backdropFilter: "blur(12px)",
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            padding: "0 1.5rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            height: 64,
          }}
        >
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                background: "linear-gradient(135deg, #7c3aed, #10b981)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Mail size={20} color="white" />
            </div>
            <span style={{ fontWeight: 700, fontSize: 18, color: "#e2e8f0" }}>
              MailDrop
            </span>
          </Link>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Link
              href="/docs"
              style={{
                color: "#94a3b8",
                textDecoration: "none",
                padding: "0.4rem 0.75rem",
                borderRadius: 8,
                fontSize: 14,
                transition: "color 0.2s",
              }}
            >
              Docs
            </Link>
            {session ? (
              <Link
                href="/dashboard"
                style={{
                  background: "linear-gradient(135deg, #7c3aed, #6d28d9)",
                  color: "white",
                  padding: "0.45rem 1rem",
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 600,
                  textDecoration: "none",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                Dashboard <ArrowRight size={14} />
              </Link>
            ) : (
              <button
                onClick={() => signIn("discord")}
                style={{
                  background: "#5865f2",
                  color: "white",
                  padding: "0.45rem 1rem",
                  borderRadius: 8,
                  fontSize: 14,
                  fontWeight: 600,
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                }}
              >
                <svg width="16" height="16" viewBox="0 0 71 55" fill="white">
                  <path d="M60.1 4.9C55.5 2.8 50.6 1.2 45.5.4c-.6 1.1-1.3 2.5-1.8 3.7C38.5 3.4 32.7 3.4 27 4.1c-.5-1.2-1.2-2.6-1.8-3.7C20.1 1.2 15.2 2.8 10.6 4.9 1.5 18.5-.9 31.7.3 44.7 6.5 49.2 12.4 51.9 18.3 53.6c1.5-2 2.8-4.1 3.9-6.3-2.2-.8-4.2-1.8-6.1-3 .5-.4 1-.7 1.5-1.1 11.8 5.4 24.6 5.4 36.2 0 .5.4 1 .7 1.5 1.1-1.9 1.2-4 2.2-6.1 3 1.1 2.2 2.4 4.3 3.9 6.3 5.9-1.7 11.8-4.4 18.1-8.9 1.4-14.5-2.4-27.6-11.1-39.8zM23.7 37.1c-3.2 0-5.8-2.9-5.8-6.5s2.6-6.5 5.8-6.5c3.2 0 5.9 2.9 5.8 6.5.1 3.5-2.5 6.5-5.8 6.5zm23.6 0c-3.2 0-5.8-2.9-5.8-6.5s2.6-6.5 5.8-6.5c3.2 0 5.9 2.9 5.8 6.5.1 3.5-2.5 6.5-5.8 6.5z" />
                </svg>
                Login with Discord
              </button>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section
        style={{
          paddingTop: 160,
          paddingBottom: 100,
          paddingLeft: "1.5rem",
          paddingRight: "1.5rem",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Background gradient orbs */}
        <div
          style={{
            position: "absolute",
            top: 80,
            left: "20%",
            width: 500,
            height: 500,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(124,58,237,0.12) 0%, transparent 70%)",
            filter: "blur(40px)",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 200,
            right: "10%",
            width: 400,
            height: 400,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(16,185,129,0.08) 0%, transparent 70%)",
            filter: "blur(40px)",
            pointerEvents: "none",
          }}
        />

        <div style={{ maxWidth: 900, margin: "0 auto", textAlign: "center", position: "relative" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: "rgba(124,58,237,0.1)",
              border: "1px solid rgba(124,58,237,0.3)",
              borderRadius: 100,
              padding: "0.35rem 1rem",
              fontSize: 13,
              color: "#a78bfa",
              marginBottom: 28,
              fontWeight: 500,
            }}
          >
            <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#7c3aed", display: "inline-block" }} />
            Now with Discord Bot Integration
          </div>
          <h1
            style={{
              fontSize: "clamp(2.5rem, 6vw, 4.5rem)",
              fontWeight: 800,
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
              marginBottom: 24,
              color: "#f1f5f9",
            }}
          >
            Disposable Email,{" "}
            <span
              style={{
                background: "linear-gradient(135deg, #7c3aed 0%, #10b981 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Endless Privacy
            </span>
          </h1>
          <p
            style={{
              fontSize: "clamp(1rem, 2vw, 1.2rem)",
              color: "#94a3b8",
              lineHeight: 1.7,
              maxWidth: 650,
              margin: "0 auto 40px",
            }}
          >
            Create temporary email addresses instantly. Perfect for developers, testers, and
            anyone who values their privacy. No signup spam, just clean, private inboxes.
          </p>

          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            {session ? (
              <Link
                href="/dashboard"
                style={{
                  background: "linear-gradient(135deg, #7c3aed, #6d28d9)",
                  color: "white",
                  padding: "0.8rem 2rem",
                  borderRadius: 12,
                  fontSize: 16,
                  fontWeight: 600,
                  textDecoration: "none",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  boxShadow: "0 4px 20px rgba(124,58,237,0.35)",
                }}
              >
                Open Dashboard <ArrowRight size={18} />
              </Link>
            ) : (
              <button
                onClick={() => signIn("discord")}
                style={{
                  background: "#5865f2",
                  color: "white",
                  padding: "0.8rem 2rem",
                  borderRadius: 12,
                  fontSize: 16,
                  fontWeight: 600,
                  border: "none",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  boxShadow: "0 4px 20px rgba(88,101,242,0.35)",
                }}
              >
                <svg width="20" height="20" viewBox="0 0 71 55" fill="white">
                  <path d="M60.1 4.9C55.5 2.8 50.6 1.2 45.5.4c-.6 1.1-1.3 2.5-1.8 3.7C38.5 3.4 32.7 3.4 27 4.1c-.5-1.2-1.2-2.6-1.8-3.7C20.1 1.2 15.2 2.8 10.6 4.9 1.5 18.5-.9 31.7.3 44.7 6.5 49.2 12.4 51.9 18.3 53.6c1.5-2 2.8-4.1 3.9-6.3-2.2-.8-4.2-1.8-6.1-3 .5-.4 1-.7 1.5-1.1 11.8 5.4 24.6 5.4 36.2 0 .5.4 1 .7 1.5 1.1-1.9 1.2-4 2.2-6.1 3 1.1 2.2 2.4 4.3 3.9 6.3 5.9-1.7 11.8-4.4 18.1-8.9 1.4-14.5-2.4-27.6-11.1-39.8zM23.7 37.1c-3.2 0-5.8-2.9-5.8-6.5s2.6-6.5 5.8-6.5c3.2 0 5.9 2.9 5.8 6.5.1 3.5-2.5 6.5-5.8 6.5zm23.6 0c-3.2 0-5.8-2.9-5.8-6.5s2.6-6.5 5.8-6.5c3.2 0 5.9 2.9 5.8 6.5.1 3.5-2.5 6.5-5.8 6.5z" />
                </svg>
                Get Started Free
              </button>
            )}
            <Link
              href="/docs"
              style={{
                background: "rgba(255,255,255,0.04)",
                color: "#e2e8f0",
                padding: "0.8rem 2rem",
                borderRadius: 12,
                fontSize: 16,
                fontWeight: 600,
                textDecoration: "none",
                border: "1px solid rgba(255,255,255,0.08)",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <Code size={18} /> View Docs
            </Link>
          </div>

          {/* Stats */}
          <div
            style={{
              display: "flex",
              justifyContent: "center",
              gap: "2rem",
              marginTop: 64,
              flexWrap: "wrap",
            }}
          >
            {[
              { value: "100K+", label: "Emails Delivered" },
              { value: "10K+", label: "Active Users" },
              { value: "99.9%", label: "Uptime" },
              { value: "<1s", label: "Delivery Time" },
            ].map((stat) => (
              <div key={stat.label} style={{ textAlign: "center" }}>
                <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "#f1f5f9" }}>
                  {stat.value}
                </div>
                <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section
        style={{
          padding: "80px 1.5rem",
          borderTop: "1px solid rgba(255,255,255,0.04)",
        }}
      >
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 60 }}>
            <h2 style={{ fontSize: "2rem", fontWeight: 700, color: "#f1f5f9", marginBottom: 12 }}>
              Everything you need
            </h2>
            <p style={{ color: "#64748b", fontSize: 16 }}>
              Powerful features for developers and privacy-conscious users alike
            </p>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
              gap: 24,
            }}
          >
            {FEATURES.map((f) => (
              <div
                key={f.title}
                style={{
                  background: "#13131f",
                  border: "1px solid #1e1e2e",
                  borderRadius: 16,
                  padding: 28,
                  transition: "all 0.2s",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLDivElement).style.borderColor = "rgba(124,58,237,0.4)";
                  (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLDivElement).style.borderColor = "#1e1e2e";
                  (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)";
                }}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    background: "rgba(124,58,237,0.15)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#a78bfa",
                    marginBottom: 16,
                  }}
                >
                  {f.icon}
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 600, color: "#f1f5f9", marginBottom: 8 }}>
                  {f.title}
                </h3>
                <p style={{ color: "#64748b", fontSize: 14, lineHeight: 1.6 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* API Code Example */}
      <section
        style={{
          padding: "80px 1.5rem",
          borderTop: "1px solid rgba(255,255,255,0.04)",
        }}
      >
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 60, alignItems: "center" }}>
          <div>
            <div className="badge-purple" style={{ marginBottom: 20, display: "inline-block" }}>
              Developer API
            </div>
            <h2 style={{ fontSize: "2rem", fontWeight: 700, color: "#f1f5f9", marginBottom: 16, lineHeight: 1.3 }}>
              Build with our powerful REST API
            </h2>
            <p style={{ color: "#64748b", lineHeight: 1.7, marginBottom: 24 }}>
              Full programmatic access to create inboxes, receive emails, and manage your account.
              Authenticate with your API key in seconds.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {[
                "Create & delete inboxes programmatically",
                "Receive emails via webhook callbacks",
                "List and read emails with pagination",
                "API key management & regeneration",
              ].map((item) => (
                <div key={item} style={{ display: "flex", alignItems: "center", gap: 10, color: "#94a3b8", fontSize: 14 }}>
                  <div style={{ width: 20, height: 20, borderRadius: "50%", background: "rgba(16,185,129,0.15)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Check size={12} color="#10b981" />
                  </div>
                  {item}
                </div>
              ))}
            </div>
            <Link
              href="/docs"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                marginTop: 28,
                color: "#a78bfa",
                textDecoration: "none",
                fontWeight: 600,
                fontSize: 14,
              }}
            >
              Read Documentation <ArrowRight size={16} />
            </Link>
          </div>
          <div>
            <div
              style={{
                background: "#0a0a12",
                border: "1px solid #1e1e2e",
                borderRadius: 16,
                padding: 24,
                fontFamily: "var(--font-geist-mono), monospace",
                fontSize: 13,
                lineHeight: 1.7,
                overflow: "auto",
              }}
            >
              <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
                <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#ef4444" }} />
                <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#f59e0b" }} />
                <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#10b981" }} />
              </div>
              <pre style={{ margin: 0, background: "transparent", border: "none", padding: 0, color: "#e2e8f0", whiteSpace: "pre-wrap", wordBreak: "break-all" }}>
                {CODE_EXAMPLE.split("\n").map((line, i) => (
                  <div key={i}>
                    {line
                      .replace(/(\/\/.*)/g, '<span style="color:#4b5563">$1</span>')
                      .replace(/('.*?')/g, '<span style="color:#10b981">$1</span>')
                      .replace(/(const|await|fetch|JSON\.stringify|headers|method|body)/g, '<span style="color:#7c3aed">$1</span>')}
                  </div>
                ))}
              </pre>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section
        id="pricing"
        style={{
          padding: "80px 1.5rem",
          borderTop: "1px solid rgba(255,255,255,0.04)",
        }}
      >
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 60 }}>
            <h2 style={{ fontSize: "2rem", fontWeight: 700, color: "#f1f5f9", marginBottom: 12 }}>
              Simple, transparent pricing
            </h2>
            <p style={{ color: "#64748b", fontSize: 16 }}>
              Fund your account and choose the plan that fits your needs
            </p>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: 20,
            }}
          >
            {PLANS.map((plan) => (
              <div
                key={plan.name}
                style={{
                  background: "#13131f",
                  border: `1px solid ${plan.popular ? "rgba(124,58,237,0.5)" : "#1e1e2e"}`,
                  borderRadius: 16,
                  padding: 28,
                  position: "relative",
                  boxShadow: plan.popular ? "0 0 30px rgba(124,58,237,0.15)" : "none",
                }}
              >
                {plan.popular && (
                  <div
                    style={{
                      position: "absolute",
                      top: -12,
                      left: "50%",
                      transform: "translateX(-50%)",
                      background: "linear-gradient(135deg, #7c3aed, #6d28d9)",
                      color: "white",
                      fontSize: 11,
                      fontWeight: 700,
                      padding: "4px 14px",
                      borderRadius: 100,
                      letterSpacing: "0.05em",
                      textTransform: "uppercase",
                    }}
                  >
                    Most Popular
                  </div>
                )}
                <div
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    background: plan.color,
                    marginBottom: 16,
                    boxShadow: `0 0 10px ${plan.color}`,
                  }}
                />
                <div style={{ fontSize: 16, fontWeight: 700, color: "#f1f5f9", marginBottom: 8 }}>
                  {plan.name}
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginBottom: 20 }}>
                  <span style={{ fontSize: "2rem", fontWeight: 800, color: "#f1f5f9" }}>
                    {plan.price}
                  </span>
                  <span style={{ color: "#64748b", fontSize: 14 }}>{plan.period}</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
                  {plan.features.map((f) => (
                    <div key={f} style={{ display: "flex", alignItems: "center", gap: 8, color: "#94a3b8", fontSize: 14 }}>
                      <Check size={14} color={plan.color} />
                      {f}
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => signIn("discord")}
                  style={{
                    width: "100%",
                    padding: "0.65rem",
                    borderRadius: 10,
                    fontWeight: 600,
                    fontSize: 14,
                    border: "none",
                    cursor: "pointer",
                    background: plan.popular
                      ? "linear-gradient(135deg, #7c3aed, #6d28d9)"
                      : "rgba(255,255,255,0.06)",
                    color: "white",
                    transition: "opacity 0.2s",
                  }}
                >
                  {plan.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Discord Bot Section */}
      <section
        style={{
          padding: "80px 1.5rem",
          borderTop: "1px solid rgba(255,255,255,0.04)",
        }}
      >
        <div
          style={{
            maxWidth: 800,
            margin: "0 auto",
            background: "linear-gradient(135deg, rgba(88,101,242,0.15), rgba(124,58,237,0.1))",
            border: "1px solid rgba(88,101,242,0.3)",
            borderRadius: 24,
            padding: "48px",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 48, marginBottom: 16 }}>🤖</div>
          <h2 style={{ fontSize: "1.75rem", fontWeight: 700, color: "#f1f5f9", marginBottom: 12 }}>
            Manage with Discord Bot
          </h2>
          <p style={{ color: "#94a3b8", lineHeight: 1.7, maxWidth: 500, margin: "0 auto 32px" }}>
            The owner can top up user balances directly from Discord. Users get real-time
            notifications when their balance is updated.
          </p>
          <div
            style={{
              background: "#0a0a12",
              borderRadius: 12,
              padding: "16px 20px",
              fontFamily: "var(--font-geist-mono), monospace",
              fontSize: 14,
              color: "#e2e8f0",
              display: "inline-block",
              border: "1px solid #1e1e2e",
              textAlign: "left",
            }}
          >
            <div><span style={{ color: "#7c3aed" }}>!</span>topup <span style={{ color: "#10b981" }}>@user 10</span> <span style={{ color: "#64748b" }}>// Top up $10 to user</span></div>
            <div><span style={{ color: "#7c3aed" }}>!</span>balance <span style={{ color: "#10b981" }}>@user</span> <span style={{ color: "#64748b" }}>// Check user balance</span></div>
            <div><span style={{ color: "#7c3aed" }}>!</span>stats <span style={{ color: "#64748b" }}>// View service stats</span></div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section style={{ padding: "80px 1.5rem", borderTop: "1px solid rgba(255,255,255,0.04)" }}>
        <div style={{ maxWidth: 700, margin: "0 auto", textAlign: "center" }}>
          <h2 style={{ fontSize: "2.25rem", fontWeight: 800, color: "#f1f5f9", marginBottom: 16, lineHeight: 1.3 }}>
            Ready to protect your privacy?
          </h2>
          <p style={{ color: "#64748b", fontSize: 16, marginBottom: 36 }}>
            Join thousands of users who trust MailDrop for their disposable email needs.
          </p>
          <button
            onClick={() => signIn("discord")}
            style={{
              background: "#5865f2",
              color: "white",
              padding: "1rem 2.5rem",
              borderRadius: 12,
              fontSize: 16,
              fontWeight: 700,
              border: "none",
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              boxShadow: "0 4px 24px rgba(88,101,242,0.4)",
            }}
          >
            <svg width="22" height="22" viewBox="0 0 71 55" fill="white">
              <path d="M60.1 4.9C55.5 2.8 50.6 1.2 45.5.4c-.6 1.1-1.3 2.5-1.8 3.7C38.5 3.4 32.7 3.4 27 4.1c-.5-1.2-1.2-2.6-1.8-3.7C20.1 1.2 15.2 2.8 10.6 4.9 1.5 18.5-.9 31.7.3 44.7 6.5 49.2 12.4 51.9 18.3 53.6c1.5-2 2.8-4.1 3.9-6.3-2.2-.8-4.2-1.8-6.1-3 .5-.4 1-.7 1.5-1.1 11.8 5.4 24.6 5.4 36.2 0 .5.4 1 .7 1.5 1.1-1.9 1.2-4 2.2-6.1 3 1.1 2.2 2.4 4.3 3.9 6.3 5.9-1.7 11.8-4.4 18.1-8.9 1.4-14.5-2.4-27.6-11.1-39.8zM23.7 37.1c-3.2 0-5.8-2.9-5.8-6.5s2.6-6.5 5.8-6.5c3.2 0 5.9 2.9 5.8 6.5.1 3.5-2.5 6.5-5.8 6.5zm23.6 0c-3.2 0-5.8-2.9-5.8-6.5s2.6-6.5 5.8-6.5c3.2 0 5.9 2.9 5.8 6.5.1 3.5-2.5 6.5-5.8 6.5z" />
            </svg>
            Start for Free with Discord
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer
        style={{
          borderTop: "1px solid rgba(255,255,255,0.05)",
          padding: "32px 1.5rem",
          color: "#4b5563",
          fontSize: 14,
        }}
      >
        <div
          style={{
            maxWidth: 1100,
            margin: "0 auto",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 16,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                background: "linear-gradient(135deg, #7c3aed, #10b981)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Mail size={14} color="white" />
            </div>
            <span style={{ color: "#94a3b8", fontWeight: 600 }}>MailDrop</span>
          </div>
          <div style={{ display: "flex", gap: 24 }}>
            <Link href="/docs" style={{ color: "#4b5563", textDecoration: "none" }}>Docs</Link>
            <Link href="/dashboard" style={{ color: "#4b5563", textDecoration: "none" }}>Dashboard</Link>
            <Link href="/login" style={{ color: "#4b5563", textDecoration: "none" }}>Login</Link>
          </div>
          <div>© {new Date().getFullYear()} MailDrop. All rights reserved.</div>
        </div>
      </footer>
    </div>
  );
}
