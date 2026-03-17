"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Mail, Code, Key, Inbox, ArrowRight, Copy, Check,
  ChevronDown, ChevronRight, Globe, Zap, Lock, Send,
  BookOpen, Terminal, Database, Webhook,
} from "lucide-react";

const BASE = "https://gootephode.me/api";

const ENDPOINTS = [
  {
    category: "Inboxes",
    icon: <Inbox size={15} />,
    color: "#7c3aed",
    items: [
      {
        method: "GET", path: "/mail", label: "List inboxes",
        desc: "Returns all active inboxes for the authenticated user.",
        response: `{\n  "inboxes": [\n    {\n      "_id": "64a1b2c3d4e5f6...",\n      "address": "hello@mail.gootephode.me",\n      "localPart": "hello",\n      "domain": "mail.gootephode.me",\n      "emailCount": 3,\n      "createdAt": "2024-01-15T10:00:00Z"\n    }\n  ]\n}`,
      },
      {
        method: "POST", path: "/mail", label: "Create inbox",
        desc: "Creates a new inbox. Omit `localPart` for a random address.",
        body: `{\n  "localPart": "myinbox"  // optional\n}`,
        response: `{\n  "inbox": {\n    "_id": "64a1b2c3d4e5f6...",\n    "address": "myinbox@mail.gootephode.me",\n    "localPart": "myinbox",\n    "domain": "mail.gootephode.me",\n    "emailCount": 0,\n    "createdAt": "2024-01-15T10:00:00Z"\n  }\n}`,
      },
      {
        method: "DELETE", path: "/mail/:id", label: "Delete inbox",
        desc: "Permanently deletes an inbox and all its emails.",
        response: `{\n  "message": "Inbox deleted"\n}`,
      },
    ],
  },
  {
    category: "Emails",
    icon: <Mail size={15} />,
    color: "#10b981",
    items: [
      {
        method: "GET", path: "/mail/:id", label: "List emails",
        desc: "Returns all emails in an inbox, newest first.",
        response: `{\n  "emails": [\n    {\n      "_id": "64a1b2c3d4e5f6...",\n      "from": "sender@example.com",\n      "fromName": "John Doe",\n      "subject": "Hello!",\n      "isRead": false,\n      "receivedAt": "2024-01-15T10:05:00Z"\n    }\n  ]\n}`,
      },
      {
        method: "GET", path: "/mail/:id/emails/:eid", label: "Read email",
        desc: "Returns the full email including HTML and plain-text body.",
        response: `{\n  "email": {\n    "_id": "64a1b2c3d4e5f6...",\n    "from": "sender@example.com",\n    "subject": "Hello!",\n    "html": "<p>Hello world</p>",\n    "text": "Hello world",\n    "receivedAt": "2024-01-15T10:05:00Z"\n  }\n}`,
      },
      {
        method: "DELETE", path: "/mail/:id/emails/:eid", label: "Delete email",
        desc: "Permanently deletes a single email.",
        response: `{\n  "message": "Email deleted"\n}`,
      },
    ],
  },
  {
    category: "Account",
    icon: <Key size={15} />,
    color: "#5865f2",
    items: [
      {
        method: "GET", path: "/user/me", label: "Get profile",
        desc: "Returns your account details, balance, and plan.",
        response: `{\n  "user": {\n    "email": "you@example.com",\n    "username": "YourName",\n    "balance": 15.00,\n    "plan": "starter",\n    "apiKey": "ms_abc123...",\n    "inboxCount": 4,\n    "emailsReceived": 87\n  }\n}`,
      },
      {
        method: "POST", path: "/user/me", label: "Regenerate API key",
        desc: "Generates a new API key. The old key is immediately invalidated.",
        body: `{\n  "action": "regenerate-api-key"\n}`,
        response: `{\n  "apiKey": "ms_new_key_here"\n}`,
      },
    ],
  },
  {
    category: "Webhook",
    icon: <Webhook size={15} />,
    color: "#f59e0b",
    items: [
      {
        method: "POST", path: "/webhook/receive", label: "Receive email",
        desc: "Called by your mail server when a new email arrives. Requires WEBHOOK_SECRET header.",
        body: `{\n  "to": "inbox@mail.gootephode.me",\n  "from": "sender@example.com",\n  "fromName": "John Doe",\n  "subject": "Hello!",\n  "text": "Plain text body",\n  "html": "<p>HTML body</p>"\n}`,
        response: `{\n  "message": "Email received"\n}`,
      },
    ],
  },
];

const METHOD_COLORS: Record<string, { bg: string; color: string }> = {
  GET:    { bg: "rgba(16,185,129,0.12)",  color: "#34d399" },
  POST:   { bg: "rgba(124,58,237,0.12)",  color: "#a78bfa" },
  DELETE: { bg: "rgba(239,68,68,0.12)",   color: "#f87171" },
  PATCH:  { bg: "rgba(245,158,11,0.12)",  color: "#fbbf24" },
};

function CodeBlock({ code, lang = "json" }: { code: string; lang?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div style={{ position: "relative", background: "#0a0a12", borderRadius: 10, border: "1px solid #1e1e2e", overflow: "hidden" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 14px", borderBottom: "1px solid #1e1e2e" }}>
        <span style={{ fontSize: 11, color: "#4b5563", fontFamily: "var(--font-geist-mono)", textTransform: "uppercase" }}>{lang}</span>
        <button
          onClick={() => { navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
          style={{ background: "none", border: "none", color: copied ? "#10b981" : "#4b5563", cursor: "pointer", display: "flex", alignItems: "center", gap: 5, fontSize: 12 }}
        >
          {copied ? <Check size={13} /> : <Copy size={13} />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre style={{ margin: 0, padding: "14px 16px", fontSize: 13, lineHeight: 1.7, color: "#94a3b8", fontFamily: "var(--font-geist-mono)", overflowX: "auto", whiteSpace: "pre" }}>
        {code}
      </pre>
    </div>
  );
}

function EndpointRow({ item }: { item: typeof ENDPOINTS[0]["items"][0] }) {
  const [open, setOpen] = useState(false);
  const m = METHOD_COLORS[item.method];
  return (
    <div style={{ border: "1px solid #1e1e2e", borderRadius: 12, overflow: "hidden", marginBottom: 10 }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "14px 18px", background: open ? "#13131f" : "#0d0d14", border: "none", cursor: "pointer", textAlign: "left", transition: "background 0.15s" }}
        onMouseEnter={(e) => { if (!open) (e.currentTarget as HTMLButtonElement).style.background = "#13131f"; }}
        onMouseLeave={(e) => { if (!open) (e.currentTarget as HTMLButtonElement).style.background = "#0d0d14"; }}
      >
        <span style={{ fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 6, background: m.bg, color: m.color, fontFamily: "var(--font-geist-mono)", flexShrink: 0, letterSpacing: "0.05em" }}>
          {item.method}
        </span>
        <code style={{ fontSize: 14, color: "#e2e8f0", fontFamily: "var(--font-geist-mono)", flex: 1 }}>
          {item.path}
        </code>
        <span style={{ fontSize: 13, color: "#64748b", marginRight: 8 }}>{item.label}</span>
        {open ? <ChevronDown size={16} color="#4b5563" /> : <ChevronRight size={16} color="#4b5563" />}
      </button>

      {open && (
        <div style={{ padding: "18px 20px", borderTop: "1px solid #1e1e2e", background: "#13131f", display: "flex", flexDirection: "column", gap: 16 }}>
          <p style={{ color: "#94a3b8", fontSize: 14, lineHeight: 1.6 }}>{item.desc}</p>
          {item.body && (
            <div>
              <p style={{ fontSize: 12, fontWeight: 600, color: "#64748b", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>Request Body</p>
              <CodeBlock code={item.body} lang="json" />
            </div>
          )}
          <div>
            <p style={{ fontSize: 12, fontWeight: 600, color: "#64748b", marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>Response</p>
            <CodeBlock code={item.response} lang="json" />
          </div>
        </div>
      )}
    </div>
  );
}

export default function DocsClient() {
  const [activeSection, setActiveSection] = useState("quickstart");

  const SECTIONS = [
    { id: "quickstart",    icon: <Zap size={14} />,      label: "Quick Start"     },
    { id: "authentication",icon: <Lock size={14} />,     label: "Authentication"  },
    { id: "inboxes",       icon: <Inbox size={14} />,    label: "Inboxes"         },
    { id: "emails",        icon: <Mail size={14} />,     label: "Emails"          },
    { id: "account",       icon: <Key size={14} />,      label: "Account"         },
    { id: "webhook",       icon: <Webhook size={14} />,  label: "Webhook"         },
    { id: "errors",        icon: <Terminal size={14} />, label: "Errors"          },
    { id: "ratelimits",    icon: <Database size={14} />, label: "Rate Limits"     },
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#0d0d14", color: "#e2e8f0" }}>
      {/* Navbar */}
      <nav style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 50, borderBottom: "1px solid rgba(255,255,255,0.05)", background: "rgba(13,13,20,0.9)", backdropFilter: "blur(12px)", height: 60, display: "flex", alignItems: "center", padding: "0 24px", gap: 20 }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
          <div style={{ width: 30, height: 30, borderRadius: 8, background: "linear-gradient(135deg, #7c3aed, #10b981)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Mail size={16} color="white" />
          </div>
          <span style={{ fontWeight: 700, color: "#e2e8f0", fontSize: 15 }}>MailDrop</span>
        </Link>
        <span style={{ color: "#2d2d3f" }}>›</span>
        <span style={{ color: "#64748b", fontSize: 14, display: "flex", alignItems: "center", gap: 6 }}>
          <BookOpen size={14} /> API Docs
        </span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 10 }}>
          <Link href="/dashboard" style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 14px", borderRadius: 8, background: "rgba(124,58,237,0.12)", border: "1px solid rgba(124,58,237,0.25)", color: "#a78bfa", fontSize: 13, textDecoration: "none", fontWeight: 500 }}>
            Dashboard <ArrowRight size={13} />
          </Link>
        </div>
      </nav>

      <div style={{ display: "flex", paddingTop: 60 }}>
        {/* Sidebar */}
        <aside style={{ width: 220, flexShrink: 0, position: "sticky", top: 60, height: "calc(100vh - 60px)", overflowY: "auto", borderRight: "1px solid #1e1e2e", padding: "24px 12px" }}>
          <p style={{ fontSize: 11, fontWeight: 600, color: "#4b5563", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10, padding: "0 10px" }}>Reference</p>
          {SECTIONS.map((s) => (
            <a
              key={s.id}
              href={`#${s.id}`}
              onClick={() => setActiveSection(s.id)}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "8px 10px", borderRadius: 8, marginBottom: 2,
                background: activeSection === s.id ? "rgba(124,58,237,0.12)" : "transparent",
                color: activeSection === s.id ? "#a78bfa" : "#64748b",
                textDecoration: "none", fontSize: 13,
                fontWeight: activeSection === s.id ? 600 : 400,
                transition: "all 0.15s",
              }}
            >
              {s.icon} {s.label}
            </a>
          ))}
        </aside>

        {/* Content */}
        <div style={{ flex: 1, maxWidth: 860, padding: "40px 40px 80px", minWidth: 0 }}>

          {/* Header */}
          <div style={{ marginBottom: 48 }}>
            <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(124,58,237,0.1)", border: "1px solid rgba(124,58,237,0.25)", borderRadius: 100, padding: "4px 14px", fontSize: 12, color: "#a78bfa", marginBottom: 20, fontWeight: 500 }}>
              <Code size={13} /> REST API · v1
            </div>
            <h1 style={{ fontSize: "2.25rem", fontWeight: 800, color: "#f1f5f9", marginBottom: 14, letterSpacing: "-0.02em" }}>API Documentation</h1>
            <p style={{ color: "#64748b", fontSize: 16, lineHeight: 1.7, maxWidth: 600 }}>
              Full programmatic access to MailDrop inboxes, emails, and account management.
              All requests use HTTPS and return JSON.
            </p>
            <div style={{ display: "flex", gap: 12, marginTop: 20, flexWrap: "wrap" }}>
              {[
                { icon: <Globe size={14} />, text: `Base URL: ${BASE}` },
                { icon: <Code size={14} />, text: "JSON API" },
                { icon: <Lock size={14} />, text: "API Key Auth" },
              ].map((item) => (
                <div key={item.text} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#64748b", background: "#13131f", border: "1px solid #1e1e2e", borderRadius: 8, padding: "5px 12px" }}>
                  <span style={{ color: "#4b5563" }}>{item.icon}</span>
                  <code style={{ fontFamily: "var(--font-geist-mono)" }}>{item.text}</code>
                </div>
              ))}
            </div>
          </div>

          {/* ── Quick Start ── */}
          <section id="quickstart" style={{ marginBottom: 56 }}>
            <h2 style={{ fontSize: "1.4rem", fontWeight: 700, color: "#f1f5f9", marginBottom: 6, display: "flex", alignItems: "center", gap: 10 }}>
              <Zap size={20} color="#7c3aed" /> Quick Start
            </h2>
            <div style={{ height: 1, background: "#1e1e2e", marginBottom: 24 }} />
            <p style={{ color: "#64748b", lineHeight: 1.7, marginBottom: 20 }}>
              Get an API key from your dashboard, then make your first request:
            </p>
            <CodeBlock lang="bash" code={`# 1. Create an inbox
curl -X POST ${BASE}/mail \\
  -H "x-api-key: ms_your_key_here" \\
  -H "Content-Type: application/json" \\
  -d '{"localPart": "myinbox"}'

# 2. List emails
curl ${BASE}/mail/<inbox_id> \\
  -H "x-api-key: ms_your_key_here"

# 3. Read an email
curl ${BASE}/mail/<inbox_id>/emails/<email_id> \\
  -H "x-api-key: ms_your_key_here"`} />
            <div style={{ marginTop: 16 }}>
              <CodeBlock lang="javascript" code={`// Node.js / Browser fetch
const res = await fetch("${BASE}/mail", {
  method: "POST",
  headers: {
    "x-api-key": "ms_your_key_here",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ localPart: "myinbox" }),
});
const { inbox } = await res.json();
// inbox.address → "myinbox@mail.gootephode.me"`} />
            </div>
          </section>

          {/* ── Authentication ── */}
          <section id="authentication" style={{ marginBottom: 56 }}>
            <h2 style={{ fontSize: "1.4rem", fontWeight: 700, color: "#f1f5f9", marginBottom: 6, display: "flex", alignItems: "center", gap: 10 }}>
              <Lock size={20} color="#7c3aed" /> Authentication
            </h2>
            <div style={{ height: 1, background: "#1e1e2e", marginBottom: 24 }} />
            <p style={{ color: "#64748b", lineHeight: 1.7, marginBottom: 16 }}>
              All API endpoints require an API key passed in the <code style={{ background: "#1e1e2e", padding: "1px 6px", borderRadius: 4, fontSize: 13, color: "#a78bfa" }}>x-api-key</code> request header.
              Find your API key in the dashboard under <strong style={{ color: "#94a3b8" }}>Settings → API Key</strong>.
            </p>
            <CodeBlock lang="bash" code={`# Include this header in every request
x-api-key: ms_your_key_here`} />
            <div style={{ marginTop: 16, padding: "14px 18px", background: "rgba(245,158,11,0.08)", borderRadius: 10, border: "1px solid rgba(245,158,11,0.2)", color: "#fbbf24", fontSize: 13, lineHeight: 1.6 }}>
              ⚠️ Keep your API key secret. If compromised, regenerate it immediately from the dashboard — the old key is invalidated instantly.
            </div>
          </section>

          {/* ── Endpoint sections ── */}
          {ENDPOINTS.map((group) => (
            <section
              key={group.category}
              id={group.category.toLowerCase()}
              style={{ marginBottom: 56 }}
            >
              <h2 style={{ fontSize: "1.4rem", fontWeight: 700, color: "#f1f5f9", marginBottom: 6, display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ color: group.color }}>{group.icon}</span> {group.category}
              </h2>
              <div style={{ height: 1, background: "#1e1e2e", marginBottom: 24 }} />
              {group.items.map((item) => (
                <EndpointRow key={item.path + item.method} item={item} />
              ))}
            </section>
          ))}

          {/* ── Errors ── */}
          <section id="errors" style={{ marginBottom: 56 }}>
            <h2 style={{ fontSize: "1.4rem", fontWeight: 700, color: "#f1f5f9", marginBottom: 6, display: "flex", alignItems: "center", gap: 10 }}>
              <Terminal size={20} color="#7c3aed" /> Error Codes
            </h2>
            <div style={{ height: 1, background: "#1e1e2e", marginBottom: 24 }} />
            <div style={{ background: "#13131f", border: "1px solid #1e1e2e", borderRadius: 14, overflow: "hidden" }}>
              {[
                { code: "400", label: "Bad Request",    desc: "Missing or invalid parameters in the request body."   },
                { code: "401", label: "Unauthorized",   desc: "No API key provided or the key is invalid."            },
                { code: "403", label: "Forbidden",      desc: "You don't have access to this resource."              },
                { code: "404", label: "Not Found",      desc: "The inbox or email does not exist."                   },
                { code: "429", label: "Too Many Req.",  desc: "Rate limit exceeded. Back off and retry."             },
                { code: "500", label: "Server Error",   desc: "An unexpected server error occurred."                 },
              ].map((e, i, arr) => (
                <div key={e.code} style={{ display: "grid", gridTemplateColumns: "72px 140px 1fr", gap: 16, padding: "13px 20px", borderBottom: i < arr.length - 1 ? "1px solid #0d0d14" : "none", alignItems: "center" }}>
                  <code style={{ fontFamily: "var(--font-geist-mono)", fontSize: 13, fontWeight: 700, color: e.code.startsWith("4") || e.code.startsWith("5") ? "#f87171" : "#34d399" }}>{e.code}</code>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#94a3b8" }}>{e.label}</span>
                  <span style={{ fontSize: 13, color: "#64748b" }}>{e.desc}</span>
                </div>
              ))}
            </div>
          </section>

          {/* ── Rate limits ── */}
          <section id="ratelimits" style={{ marginBottom: 56 }}>
            <h2 style={{ fontSize: "1.4rem", fontWeight: 700, color: "#f1f5f9", marginBottom: 6, display: "flex", alignItems: "center", gap: 10 }}>
              <Database size={20} color="#7c3aed" /> Rate Limits
            </h2>
            <div style={{ height: 1, background: "#1e1e2e", marginBottom: 24 }} />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
              {[
                { plan: "Free", requests: "60 / min", inboxes: 3, color: "#94a3b8" },
                { plan: "Starter", requests: "300 / min", inboxes: 10, color: "#a78bfa" },
                { plan: "Pro", requests: "1 000 / min", inboxes: 50, color: "#34d399" },
                { plan: "Enterprise", requests: "Unlimited", inboxes: "∞", color: "#fbbf24" },
              ].map((p) => (
                <div key={p.plan} style={{ background: "#13131f", border: "1px solid #1e1e2e", borderRadius: 12, padding: 18 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: p.color, marginBottom: 10 }} />
                  <div style={{ fontWeight: 700, color: "#f1f5f9", marginBottom: 8 }}>{p.plan}</div>
                  <div style={{ fontSize: 13, color: "#64748b" }}><Send size={12} style={{ display: "inline", marginRight: 5 }} />{p.requests}</div>
                  <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}><Inbox size={12} style={{ display: "inline", marginRight: 5 }} />{p.inboxes} inboxes</div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
