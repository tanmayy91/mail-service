"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useState } from "react";
import {
  Mail, Shield, Zap, Globe, Code2, ArrowRight, Check, Bot,
  Inbox, Lock, Cpu, Sparkles, ChevronRight, Star,
  Copy, ExternalLink, MessageSquare, RefreshCw,
  BarChart3, Send, Key, Webhook, Clock, EyeOff,
} from "lucide-react";

const FEATURES = [
  {
    icon: <Inbox size={22} />, color: "#7c3aed",
    title: "Instant Inboxes",
    desc: "Spin up a disposable email address in one click — or via the API in milliseconds.",
  },
  {
    icon: <Shield size={22} />, color: "#10b981",
    title: "Privacy First",
    desc: "Keep your real inbox clean. Protect yourself from spam, leaks, and tracking.",
  },
  {
    icon: <Zap size={22} />, color: "#f59e0b",
    title: "Real-time Delivery",
    desc: "Emails arrive instantly. Webhook integrations notify your app the moment mail lands.",
  },
  {
    icon: <Code2 size={22} />, color: "#5865f2",
    title: "Developer API",
    desc: "Full REST API with API-key auth. Inboxes, emails, and webhooks — all programmable.",
  },
  {
    icon: <Bot size={22} />, color: "#ec4899",
    title: "Discord Bot",
    desc: "Register and manage your account entirely from Discord. No web forms, no friction.",
  },
  {
    icon: <Globe size={22} />, color: "#06b6d4",
    title: "Custom Domains",
    desc: "Point your own domain at MailDrop and receive emails at any address you choose.",
  },
  {
    icon: <Clock size={22} />, color: "#a78bfa",
    title: "Auto-expiry",
    desc: "Set TTL on inboxes so they vanish on schedule — perfect for one-time signups.",
  },
  {
    icon: <EyeOff size={22} />, color: "#34d399",
    title: "Zero Logging",
    desc: "We don't read your emails or sell your data. Your inbox is yours, full stop.",
  },
];

const PLANS = [
  {
    name: "Free", price: "$0", period: "forever", color: "#94a3b8",
    features: ["3 inboxes", "100 emails / month", "REST API access", "7-day retention"],
  },
  {
    name: "Starter", price: "$5", period: "/ month", color: "#7c3aed", popular: true,
    features: ["10 inboxes", "1,000 emails / month", "REST API + webhooks", "30-day retention"],
  },
  {
    name: "Pro", price: "$15", period: "/ month", color: "#10b981",
    features: ["50 inboxes", "10,000 emails / month", "Priority support", "90-day retention", "Custom domain"],
  },
  {
    name: "Enterprise", price: "$50", period: "/ month", color: "#f59e0b",
    features: ["Unlimited inboxes", "Unlimited emails", "Dedicated support", "Unlimited retention", "Multiple custom domains"],
  },
];

const BOT_STEPS = [
  { icon: <MessageSquare size={18} />, color: "#7c3aed", step: "01", title: 'Click "Create Account"', desc: "Press the button in the #register channel of our Discord server." },
  { icon: <Shield size={18} />, color: "#10b981", step: "02", title: "Accept the TOS", desc: "Read and accept our Terms of Service. Your ticket opens automatically." },
  { icon: <Key size={18} />, color: "#5865f2", step: "03", title: "Set email & password", desc: "Type your desired email and a secure password. We hash it — never stored in plain text." },
  { icon: <Send size={18} />, color: "#f59e0b", step: "04", title: "Login on the website", desc: "We DM you the details. Log in at gootephode.me and you're ready to go." },
];

const CODE_EXAMPLE = `// Create an inbox & read emails in 3 lines
const { inbox } = await maildrop.createInbox({ localPart: "hello" });
// → hello@mail.gootephode.me

const { emails } = await maildrop.listEmails(inbox._id);
console.log(emails[0].subject);  // "Welcome!"`;

const STATS = [
  { icon: <Inbox size={20} />, value: "50K+", label: "Inboxes created", color: "#7c3aed" },
  { icon: <Mail size={20} />, value: "2M+", label: "Emails received", color: "#10b981" },
  { icon: <BarChart3 size={20} />, value: "99.9%", label: "Uptime", color: "#5865f2" },
  { icon: <RefreshCw size={20} />, value: "<50ms", label: "Avg delivery", color: "#f59e0b" },
];

export default function LandingPage() {
  const { data: session } = useSession();
  const [copiedCode, setCopiedCode] = useState(false);

  function copyCode() {
    navigator.clipboard.writeText(CODE_EXAMPLE);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  }

  return (
    <div style={{ background: "#0d0d14", color: "#e2e8f0", minHeight: "100vh", fontFamily: "var(--font-geist-sans), sans-serif" }}>

      {/* ── Nav ── */}
      <nav style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 50, borderBottom: "1px solid rgba(255,255,255,0.05)", background: "rgba(13,13,20,0.85)", backdropFilter: "blur(12px)", height: 62 }}>
        <div style={{ maxWidth: 1160, margin: "0 auto", height: "100%", display: "flex", alignItems: "center", padding: "0 24px", gap: 8 }}>
          {/* Logo */}
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 9, textDecoration: "none", marginRight: 28 }}>
            <div style={{ width: 33, height: 33, borderRadius: 10, background: "linear-gradient(135deg, #7c3aed, #10b981)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 14px rgba(124,58,237,0.4)" }}>
              <Mail size={17} color="white" />
            </div>
            <span style={{ fontWeight: 800, fontSize: 16, color: "#f1f5f9", letterSpacing: "-0.01em" }}>MailDrop</span>
          </Link>

          {/* Links */}
          {[
            { href: "#features", label: "Features" },
            { href: "#how-it-works", label: "How it works" },
            { href: "#pricing", label: "Pricing" },
            { href: "/docs", label: "Docs" },
          ].map((l) => (
            <a key={l.href} href={l.href} style={{ fontSize: 14, color: "#64748b", textDecoration: "none", padding: "5px 10px", borderRadius: 7, transition: "color 0.15s" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#e2e8f0")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#64748b")}
            >{l.label}</a>
          ))}

          <div style={{ flex: 1 }} />

          {session ? (
            <Link href={session.user.isAdmin ? "/admin" : "/dashboard"} style={{ display: "flex", alignItems: "center", gap: 7, padding: "7px 18px", borderRadius: 9, background: "linear-gradient(135deg, #7c3aed, #6d28d9)", color: "white", textDecoration: "none", fontSize: 14, fontWeight: 600, boxShadow: "0 4px 12px rgba(124,58,237,0.35)" }}>
              Dashboard <ArrowRight size={14} />
            </Link>
          ) : (
            <>
              <Link href="/login" style={{ fontSize: 14, color: "#94a3b8", textDecoration: "none", padding: "7px 14px", borderRadius: 9, border: "1px solid #1e1e2e", marginRight: 8, transition: "all 0.15s" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.borderColor = "#4b5563"; (e.currentTarget as HTMLAnchorElement).style.color = "#f1f5f9"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.borderColor = "#1e1e2e"; (e.currentTarget as HTMLAnchorElement).style.color = "#94a3b8"; }}
              >Log in</Link>
              <Link href="/login" style={{ display: "flex", alignItems: "center", gap: 6, padding: "7px 18px", borderRadius: 9, background: "linear-gradient(135deg, #7c3aed, #6d28d9)", color: "white", textDecoration: "none", fontSize: 14, fontWeight: 600, boxShadow: "0 4px 12px rgba(124,58,237,0.35)" }}>
                Get Started <ArrowRight size={14} />
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* ── Hero ── */}
      <section style={{ paddingTop: 130, paddingBottom: 80, textAlign: "center", position: "relative", overflow: "hidden" }}>
        {/* Orbs */}
        <div style={{ position: "absolute", top: "10%", left: "20%", width: 600, height: 600, borderRadius: "50%", background: "radial-gradient(circle, rgba(124,58,237,0.08) 0%, transparent 65%)", filter: "blur(60px)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", top: "30%", right: "15%", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(16,185,129,0.07) 0%, transparent 65%)", filter: "blur(60px)", pointerEvents: "none" }} />

        <div style={{ maxWidth: 760, margin: "0 auto", padding: "0 24px", position: "relative", zIndex: 1 }}>
          {/* Badge */}
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.25)", borderRadius: 100, padding: "6px 16px", fontSize: 13, color: "#a78bfa", marginBottom: 28, fontWeight: 500 }}>
            <Sparkles size={13} /> Register via Discord · Launch your inboxes in seconds
          </div>

          <h1 style={{ fontSize: "clamp(2.2rem, 5vw, 3.6rem)", fontWeight: 900, lineHeight: 1.1, letterSpacing: "-0.03em", color: "#f1f5f9", marginBottom: 22 }}>
            Disposable email{" "}
            <span style={{ background: "linear-gradient(135deg, #7c3aed, #10b981)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              that just works
            </span>
          </h1>

          <p style={{ fontSize: "clamp(1rem, 2vw, 1.2rem)", color: "#64748b", lineHeight: 1.7, maxWidth: 560, margin: "0 auto 36px" }}>
            Create accounts via Discord, get real inboxes, build with our API.
            MailDrop keeps your real email safe and your app inbox-ready.
          </p>

          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/login" style={{ display: "flex", alignItems: "center", gap: 8, padding: "13px 28px", borderRadius: 12, background: "linear-gradient(135deg, #7c3aed, #6d28d9)", color: "white", textDecoration: "none", fontWeight: 700, fontSize: 16, boxShadow: "0 6px 24px rgba(124,58,237,0.4)", letterSpacing: "-0.01em" }}>
              <Mail size={18} /> Start for Free
            </Link>
            <Link href="/docs" style={{ display: "flex", alignItems: "center", gap: 8, padding: "13px 24px", borderRadius: 12, background: "transparent", border: "1px solid #1e1e2e", color: "#94a3b8", textDecoration: "none", fontWeight: 600, fontSize: 15 }}>
              <Code2 size={16} /> View API Docs <ChevronRight size={14} />
            </Link>
          </div>

          {/* Social proof */}
          <div style={{ marginTop: 40, display: "flex", alignItems: "center", justifyContent: "center", gap: 16, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {[...Array(5)].map((_, i) => <Star key={i} size={14} fill="#fbbf24" color="#fbbf24" />)}
              <span style={{ fontSize: 13, color: "#64748b", marginLeft: 4 }}>Loved by developers</span>
            </div>
            <span style={{ color: "#2d2d3f" }}>·</span>
            <span style={{ fontSize: 13, color: "#64748b", display: "flex", alignItems: "center", gap: 5 }}>
              <Check size={13} color="#10b981" /> Free tier, no credit card
            </span>
            <span style={{ color: "#2d2d3f" }}>·</span>
            <span style={{ fontSize: 13, color: "#64748b", display: "flex", alignItems: "center", gap: 5 }}>
              <Lock size={13} color="#7c3aed" /> Privacy-first
            </span>
          </div>
        </div>

        {/* Code preview */}
        <div style={{ maxWidth: 680, margin: "56px auto 0", padding: "0 24px", position: "relative", zIndex: 1 }}>
          <div style={{ background: "#0a0a12", border: "1px solid #1e1e2e", borderRadius: 16, overflow: "hidden", textAlign: "left", boxShadow: "0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.03)" }}>
            {/* Title bar */}
            <div style={{ padding: "12px 18px", borderBottom: "1px solid #1e1e2e", display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ display: "flex", gap: 7 }}>
                {["#ff5f57", "#febc2e", "#28c840"].map((c) => <div key={c} style={{ width: 12, height: 12, borderRadius: "50%", background: c }} />)}
              </div>
              <span style={{ fontSize: 12, color: "#4b5563", marginLeft: 6, fontFamily: "var(--font-geist-mono)" }}>maildrop.ts</span>
              <button onClick={copyCode} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: copiedCode ? "#10b981" : "#4b5563", display: "flex", alignItems: "center", gap: 5, fontSize: 12 }}>
                {copiedCode ? <><Check size={13} /> Copied</> : <><Copy size={13} /> Copy</>}
              </button>
            </div>
            <pre style={{ margin: 0, padding: "20px 22px", fontSize: 14, lineHeight: 1.75, color: "#94a3b8", fontFamily: "var(--font-geist-mono)", overflowX: "auto", whiteSpace: "pre" }}>
              <span style={{ color: "#64748b" }}>{"// Create an inbox & read emails"}</span>{"\n"}
              <span style={{ color: "#c084fc" }}>const</span> {"{"} inbox {"}"} <span style={{ color: "#64748b" }}>=</span> <span style={{ color: "#86efac" }}>await</span> maildrop.<span style={{ color: "#38bdf8" }}>createInbox</span>{"({ localPart: "}<span style={{ color: "#fcd34d" }}>{'"hello"'}</span>{" })"}{"\n"}
              <span style={{ color: "#64748b" }}>{"// → hello@novacloud.tech"}</span>{"\n\n"}
              <span style={{ color: "#c084fc" }}>const</span> {"{"} emails {"}"} <span style={{ color: "#64748b" }}>=</span> <span style={{ color: "#86efac" }}>await</span> maildrop.<span style={{ color: "#38bdf8" }}>listEmails</span>{"(inbox._id)"}{"\n"}
              console.<span style={{ color: "#38bdf8" }}>log</span>{"(emails[0].subject)"}{"\n"}
              <span style={{ color: "#64748b" }}>{'// "Welcome to the service!"'}</span>
            </pre>
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section style={{ padding: "40px 24px", borderTop: "1px solid #1e1e2e", borderBottom: "1px solid #1e1e2e" }}>
        <div style={{ maxWidth: 900, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 24 }}>
          {STATS.map((s) => (
            <div key={s.label} style={{ textAlign: "center" }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: `${s.color}15`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 12px", color: s.color }}>
                {s.icon}
              </div>
              <div style={{ fontSize: "1.8rem", fontWeight: 800, color: "#f1f5f9", letterSpacing: "-0.03em" }}>{s.value}</div>
              <div style={{ fontSize: 13, color: "#4b5563", marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Features ── */}
      <section id="features" style={{ padding: "96px 24px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)", borderRadius: 100, padding: "5px 14px", fontSize: 12, color: "#34d399", marginBottom: 18, fontWeight: 500 }}>
              <Cpu size={13} /> Features
            </div>
            <h2 style={{ fontSize: "clamp(1.8rem, 3.5vw, 2.6rem)", fontWeight: 800, color: "#f1f5f9", letterSpacing: "-0.02em", marginBottom: 14 }}>Everything you need</h2>
            <p style={{ color: "#64748b", fontSize: 16, maxWidth: 500, margin: "0 auto" }}>Purpose-built for developers who need temp email without the headaches.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 20 }}>
            {FEATURES.map((f) => (
              <div key={f.title}
                style={{ background: "#13131f", border: "1px solid #1e1e2e", borderRadius: 16, padding: "24px 22px", transition: "all 0.2s" }}
                onMouseEnter={(e) => { const d = e.currentTarget as HTMLDivElement; d.style.borderColor = `${f.color}40`; d.style.transform = "translateY(-2px)"; d.style.boxShadow = `0 12px 30px rgba(0,0,0,0.3)`; }}
                onMouseLeave={(e) => { const d = e.currentTarget as HTMLDivElement; d.style.borderColor = "#1e1e2e"; d.style.transform = "translateY(0)"; d.style.boxShadow = "none"; }}
              >
                <div style={{ width: 44, height: 44, borderRadius: 12, background: `${f.color}15`, display: "flex", alignItems: "center", justifyContent: "center", color: f.color, marginBottom: 16 }}>
                  {f.icon}
                </div>
                <h3 style={{ fontWeight: 700, fontSize: 16, color: "#f1f5f9", marginBottom: 8 }}>{f.title}</h3>
                <p style={{ color: "#64748b", fontSize: 14, lineHeight: 1.6 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works (bot) ── */}
      <section id="how-it-works" style={{ padding: "80px 24px", background: "#0a0a12", borderTop: "1px solid #1e1e2e", borderBottom: "1px solid #1e1e2e" }}>
        <div style={{ maxWidth: 960, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "rgba(88,101,242,0.1)", border: "1px solid rgba(88,101,242,0.2)", borderRadius: 100, padding: "5px 14px", fontSize: 12, color: "#818cf8", marginBottom: 18, fontWeight: 500 }}>
              <Bot size={13} /> Discord Bot
            </div>
            <h2 style={{ fontSize: "clamp(1.8rem, 3.5vw, 2.6rem)", fontWeight: 800, color: "#f1f5f9", letterSpacing: "-0.02em", marginBottom: 14 }}>Account creation via Discord</h2>
            <p style={{ color: "#64748b", fontSize: 16, maxWidth: 520, margin: "0 auto" }}>No email signups. No OAuth popups. A private Discord ticket creates your account in under a minute.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 20 }}>
            {BOT_STEPS.map((s) => (
              <div key={s.step} style={{ background: "#13131f", border: "1px solid #1e1e2e", borderRadius: 16, padding: "24px 20px", position: "relative" }}>
                <div style={{ position: "absolute", top: 18, right: 20, fontSize: 28, fontWeight: 900, color: "#1e1e2e", letterSpacing: "-0.04em", fontFamily: "var(--font-geist-mono)" }}>{s.step}</div>
                <div style={{ width: 40, height: 40, borderRadius: 11, background: `${s.color}15`, display: "flex", alignItems: "center", justifyContent: "center", color: s.color, marginBottom: 14 }}>
                  {s.icon}
                </div>
                <h3 style={{ fontWeight: 700, fontSize: 15, color: "#f1f5f9", marginBottom: 8 }}>{s.title}</h3>
                <p style={{ color: "#64748b", fontSize: 13, lineHeight: 1.6 }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing ── */}
      <section id="pricing" style={{ padding: "96px 24px" }}>
        <div style={{ maxWidth: 1060, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 56 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 7, background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.2)", borderRadius: 100, padding: "5px 14px", fontSize: 12, color: "#a78bfa", marginBottom: 18, fontWeight: 500 }}>
              <Sparkles size={13} /> Pricing
            </div>
            <h2 style={{ fontSize: "clamp(1.8rem, 3.5vw, 2.6rem)", fontWeight: 800, color: "#f1f5f9", letterSpacing: "-0.02em", marginBottom: 14 }}>Simple, transparent pricing</h2>
            <p style={{ color: "#64748b", fontSize: 16, maxWidth: 440, margin: "0 auto" }}>Top up credits via the Discord bot. No subscriptions, no surprise bills.</p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 20 }}>
            {PLANS.map((plan) => (
              <div key={plan.name} style={{ background: "#13131f", border: `1px solid ${plan.popular ? plan.color + "50" : "#1e1e2e"}`, borderRadius: 18, padding: "28px 24px", position: "relative", boxShadow: plan.popular ? `0 8px 30px ${plan.color}20` : "none" }}>
                {plan.popular && (
                  <div style={{ position: "absolute", top: -12, left: "50%", transform: "translateX(-50%)", background: plan.color, color: "white", fontSize: 11, fontWeight: 700, padding: "3px 14px", borderRadius: 100, whiteSpace: "nowrap", boxShadow: `0 4px 12px ${plan.color}50` }}>
                    Most Popular
                  </div>
                )}
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: plan.color, marginBottom: 14, boxShadow: `0 0 10px ${plan.color}` }} />
                <h3 style={{ fontWeight: 800, fontSize: 18, color: "#f1f5f9", marginBottom: 6 }}>{plan.name}</h3>
                <div style={{ marginBottom: 20 }}>
                  <span style={{ fontSize: "2.2rem", fontWeight: 900, color: "#f1f5f9", letterSpacing: "-0.03em" }}>{plan.price}</span>
                  <span style={{ color: "#4b5563", fontSize: 14, marginLeft: 6 }}>{plan.period}</span>
                </div>
                <ul style={{ listStyle: "none", padding: 0, margin: "0 0 24px", display: "flex", flexDirection: "column", gap: 9 }}>
                  {plan.features.map((f) => (
                    <li key={f} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, color: "#94a3b8" }}>
                      <Check size={14} color={plan.color} style={{ flexShrink: 0 }} /> {f}
                    </li>
                  ))}
                </ul>
                <Link href="/login" style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px", borderRadius: 10, background: plan.popular ? `linear-gradient(135deg, ${plan.color}, #6d28d9)` : "transparent", border: plan.popular ? "none" : `1px solid ${plan.color}40`, color: plan.popular ? "white" : plan.color, textDecoration: "none", fontWeight: 600, fontSize: 14, transition: "all 0.15s" }}>
                  Get Started <ArrowRight size={14} />
                </Link>
              </div>
            ))}
          </div>
          <p style={{ textAlign: "center", marginTop: 24, fontSize: 13, color: "#4b5563" }}>
            Top up via Discord · Instant activation · No credit card required for Free tier
          </p>
        </div>
      </section>

      {/* ── CTA ── */}
      <section style={{ padding: "80px 24px", background: "#0a0a12", borderTop: "1px solid #1e1e2e" }}>
        <div style={{ maxWidth: 680, margin: "0 auto", textAlign: "center" }}>
          <div style={{ width: 60, height: 60, borderRadius: 18, background: "linear-gradient(135deg, #7c3aed, #10b981)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px", boxShadow: "0 8px 30px rgba(124,58,237,0.4)" }}>
            <Mail size={28} color="white" />
          </div>
          <h2 style={{ fontSize: "clamp(1.8rem, 3.5vw, 2.4rem)", fontWeight: 800, color: "#f1f5f9", letterSpacing: "-0.02em", marginBottom: 14 }}>Ready to get started?</h2>
          <p style={{ color: "#64748b", fontSize: 16, lineHeight: 1.7, marginBottom: 32 }}>
            Join our Discord server, click <strong style={{ color: "#94a3b8" }}>Create Account</strong>, and you&apos;re up and running in under a minute.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
            <Link href="/login" style={{ display: "flex", alignItems: "center", gap: 8, padding: "13px 28px", borderRadius: 12, background: "linear-gradient(135deg, #7c3aed, #6d28d9)", color: "white", textDecoration: "none", fontWeight: 700, fontSize: 16, boxShadow: "0 6px 24px rgba(124,58,237,0.4)" }}>
              <Mail size={17} /> Create Free Account
            </Link>
            <Link href="/docs" style={{ display: "flex", alignItems: "center", gap: 7, padding: "13px 22px", borderRadius: 12, background: "transparent", border: "1px solid #1e1e2e", color: "#94a3b8", textDecoration: "none", fontWeight: 600, fontSize: 15 }}>
              <ExternalLink size={15} /> Read the Docs
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{ borderTop: "1px solid #1e1e2e", padding: "32px 24px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 26, height: 26, borderRadius: 7, background: "linear-gradient(135deg, #7c3aed, #10b981)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Mail size={13} color="white" />
            </div>
            <span style={{ fontWeight: 700, color: "#64748b", fontSize: 14 }}>MailDrop</span>
          </div>
          <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
            {[
              { href: "/docs", label: "API Docs", icon: <Webhook size={13} /> },
              { href: "/dashboard", label: "Dashboard", icon: <Inbox size={13} /> },
              { href: "/login", label: "Login", icon: <Lock size={13} /> },
            ].map((l) => (
              <Link key={l.href} href={l.href} style={{ fontSize: 13, color: "#4b5563", textDecoration: "none", display: "flex", alignItems: "center", gap: 5, transition: "color 0.15s" }}
                onMouseEnter={(e) => (e.currentTarget.style.color = "#94a3b8")}
                onMouseLeave={(e) => (e.currentTarget.style.color = "#4b5563")}
              >
                {l.icon} {l.label}
              </Link>
            ))}
          </div>
          <p style={{ fontSize: 12, color: "#2d2d3f" }}>© {new Date().getFullYear()} MailDrop · gootephode.me</p>
        </div>
      </footer>
    </div>
  );
}
