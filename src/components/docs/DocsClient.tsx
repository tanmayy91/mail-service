"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Link2, Code, Key, ArrowRight, Copy, Check,
  ChevronDown, ChevronRight, Globe, Zap, Lock,
  BookOpen, Terminal, MousePointer2,
} from "lucide-react";

const BASE = "https://your-domain.com/api";

const ENDPOINTS = [
  {
    category: "Links",
    icon: <Link2 size={15} />,
    color: "#7c3aed",
    items: [
      {
        method: "GET", path: "/links", label: "List links",
        desc: "Returns all active short links for the authenticated user.",
        response: `{
  "links": [
    {
      "_id": "64a1b2c3d4e5f6...",
      "slug": "my-link",
      "url": "https://very-long-url.com/path",
      "title": "My Link",
      "clicks": 42,
      "isActive": true,
      "createdAt": "2024-01-15T10:00:00Z"
    }
  ]
}`,
      },
      {
        method: "POST", path: "/links", label: "Create link",
        desc: "Shortens a URL. Omit `slug` for a random one.",
        body: `{
  "url": "https://very-long-url.com/path",
  "slug": "my-link",   // optional
  "title": "My Link",  // optional
  "expiresAt": "2025-12-31T23:59:59Z"  // optional
}`,
        response: `{
  "link": {
    "_id": "64a1b2c3d4e5f6...",
    "slug": "my-link",
    "url": "https://very-long-url.com/path",
    "clicks": 0,
    "isActive": true,
    "createdAt": "2024-01-15T10:00:00Z"
  }
}`,
      },
      {
        method: "PATCH", path: "/links/:id", label: "Update link",
        desc: "Update a link\'s title or active state.",
        body: `{
  "title": "New Title",  // optional
  "isActive": false      // optional
}`,
        response: `{
  "link": { ... }
}`,
      },
      {
        method: "DELETE", path: "/links/:id", label: "Delete link",
        desc: "Permanently removes a short link.",
        response: `{
  "success": true
}`,
      },
    ],
  },
  {
    category: "Redirect",
    icon: <MousePointer2 size={15} />,
    color: "#10b981",
    items: [
      {
        method: "GET", path: "/r/:slug", label: "Follow short link",
        desc: "Redirects to the destination URL and increments the click counter. No auth required.",
        response: "HTTP 302 redirect to the destination URL.",
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
        desc: "Returns your account details, balance, plan, and link stats.",
        response: `{
  "user": {
    "email": "you@example.com",
    "username": "YourName",
    "balance": 15.00,
    "plan": "starter",
    "apiKey": "ld_abc123...",
    "linkCount": 12,
    "totalClicks": 3400
  }
}`,
      },
      {
        method: "POST", path: "/user/me", label: "Regenerate API key",
        desc: "Generates a new API key. The old key is immediately invalidated.",
        body: `{
  "action": "regenerate-api-key"
}`,
        response: `{
  "apiKey": "ld_new_key_here"
}`,
      },
    ],
  },
];

const METHOD_COLORS: Record<string, string> = {
  GET: "#34d399", POST: "#60a5fa", DELETE: "#f87171", PATCH: "#fbbf24",
};

export default function DocsClient() {
  const [openCats, setOpenCats] = useState<string[]>(["Links"]);
  const [openItems, setOpenItems] = useState<string[]>([]);
  const [copied, setCopied] = useState<string | null>(null);

  function toggleCat(cat: string) {
    setOpenCats((prev) => prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]);
  }
  function toggleItem(key: string) {
    setOpenItems((prev) => prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]);
  }
  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div style={{ background: "#0d0d14", color: "#e2e8f0", minHeight: "100vh", fontFamily: "var(--font-geist-sans), sans-serif" }}>
      {/* Nav */}
      <nav style={{ position: "sticky", top: 0, zIndex: 40, borderBottom: "1px solid #1e1e2e", background: "rgba(13,13,20,0.9)", backdropFilter: "blur(12px)", height: 58, display: "flex", alignItems: "center", padding: "0 28px", gap: 12 }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
          <div style={{ width: 29, height: 29, borderRadius: 8, background: "linear-gradient(135deg, #7c3aed, #10b981)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Link2 size={14} color="white" />
          </div>
          <span style={{ fontWeight: 800, fontSize: 14, color: "#f1f5f9" }}>LinkDrop</span>
        </Link>
        <span style={{ color: "#2d2d3f" }}>·</span>
        <span style={{ fontSize: 14, color: "#64748b" }}>API Reference</span>
        <div style={{ flex: 1 }} />
        <Link href="/dashboard" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, padding: "6px 14px", borderRadius: 8, background: "rgba(124,58,237,0.15)", color: "#a78bfa", textDecoration: "none", fontWeight: 500 }}>
          Dashboard <ArrowRight size={13} />
        </Link>
      </nav>

      <div style={{ display: "flex", maxWidth: 1100, margin: "0 auto", padding: "40px 24px", gap: 36 }}>
        {/* Sidebar */}
        <aside style={{ width: 210, flexShrink: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#4b5563", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 12 }}>Navigation</div>
          {[
            { href: "#authentication", icon: <Lock size={14} />, label: "Authentication" },
            { href: "#base-url",       icon: <Globe size={14} />, label: "Base URL"       },
            { href: "#rate-limits",    icon: <Zap size={14} />,   label: "Rate Limits"    },
            { href: "#endpoints",      icon: <BookOpen size={14} />, label: "Endpoints"    },
          ].map((item) => (
            <a key={item.href} href={item.href}
              style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#64748b", textDecoration: "none", padding: "6px 10px", borderRadius: 7, marginBottom: 2, transition: "color 0.15s" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#e2e8f0")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#64748b")}
            >
              {item.icon} {item.label}
            </a>
          ))}
          <div style={{ borderTop: "1px solid #1e1e2e", margin: "12px 0 12px" }} />
          <div style={{ fontSize: 11, fontWeight: 700, color: "#4b5563", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 10 }}>Endpoints</div>
          {ENDPOINTS.map((cat) => (
            <a key={cat.category} href={`#cat-${cat.category.toLowerCase()}`}
              style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: cat.color + "cc", textDecoration: "none", padding: "5px 10px", borderRadius: 7, marginBottom: 2 }}
            >
              {cat.icon} {cat.category}
            </a>
          ))}
        </aside>

        {/* Main content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <h1 style={{ fontSize: "1.8rem", fontWeight: 900, color: "#f1f5f9", letterSpacing: "-0.03em", marginBottom: 8 }}>API Reference</h1>
          <p style={{ fontSize: 15, color: "#64748b", marginBottom: 40 }}>
            Integrate LinkDrop into your apps. All endpoints return JSON.
          </p>

          {/* Authentication */}
          <section id="authentication" style={{ marginBottom: 36 }}>
            <h2 style={{ fontSize: "1.1rem", fontWeight: 800, color: "#f1f5f9", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}><Lock size={17} /> Authentication</h2>
            <div style={{ background: "#13131f", border: "1px solid #1e1e2e", borderRadius: 12, padding: "18px 20px" }}>
              <p style={{ fontSize: 14, color: "#94a3b8", lineHeight: 1.7, marginBottom: 12 }}>
                All protected endpoints require an API key passed in the <code style={{ color: "#a78bfa", background: "rgba(124,58,237,0.1)", padding: "1px 6px", borderRadius: 4 }}>x-api-key</code> header.
                Find your key on the <Link href="/dashboard" style={{ color: "#7c3aed" }}>Dashboard → Settings</Link> page.
              </p>
              <div style={{ background: "#0a0a12", borderRadius: 8, padding: "12px 16px", fontFamily: "var(--font-geist-mono)", fontSize: 13 }}>
                <span style={{ color: "#64748b" }}>curl </span>
                <span style={{ color: "#fcd34d" }}>-H </span>
                <span style={{ color: "#86efac" }}>&quot;x-api-key: ld_your_api_key&quot;</span>
                <span style={{ color: "#94a3b8" }}> {BASE}/links</span>
              </div>
            </div>
          </section>

          {/* Base URL */}
          <section id="base-url" style={{ marginBottom: 36 }}>
            <h2 style={{ fontSize: "1.1rem", fontWeight: 800, color: "#f1f5f9", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}><Globe size={17} /> Base URL</h2>
            <div style={{ background: "#13131f", border: "1px solid #1e1e2e", borderRadius: 12, padding: "18px 20px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#0a0a12", borderRadius: 8, padding: "12px 16px", fontFamily: "var(--font-geist-mono)", fontSize: 14 }}>
                <span style={{ color: "#94a3b8" }}>{BASE}</span>
                <button onClick={() => copy(BASE, "base")} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", color: copied === "base" ? "#10b981" : "#4b5563", display: "flex", alignItems: "center", gap: 4, fontSize: 12 }}>
                  {copied === "base" ? <><Check size={13} /> Copied</> : <><Copy size={13} /> Copy</>}
                </button>
              </div>
            </div>
          </section>

          {/* Rate limits */}
          <section id="rate-limits" style={{ marginBottom: 40 }}>
            <h2 style={{ fontSize: "1.1rem", fontWeight: 800, color: "#f1f5f9", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}><Zap size={17} /> Rate Limits</h2>
            <div style={{ background: "#13131f", border: "1px solid #1e1e2e", borderRadius: 12, padding: "18px 20px" }}>
              <p style={{ fontSize: 14, color: "#94a3b8", lineHeight: 1.7 }}>
                Requests are limited to <strong style={{ color: "#f1f5f9" }}>120 requests / minute</strong> per API key.
                Exceeding this returns a <code style={{ color: "#f87171" }}>429 Too Many Requests</code> response.
              </p>
            </div>
          </section>

          {/* Endpoints */}
          <section id="endpoints">
            <h2 style={{ fontSize: "1.1rem", fontWeight: 800, color: "#f1f5f9", marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
              <Terminal size={17} /> Endpoints
            </h2>

            {ENDPOINTS.map((cat) => (
              <div key={cat.category} id={`cat-${cat.category.toLowerCase()}`} style={{ marginBottom: 28 }}>
                <button onClick={() => toggleCat(cat.category)}
                  style={{ display: "flex", alignItems: "center", gap: 9, width: "100%", background: "none", border: "none", cursor: "pointer", textAlign: "left", padding: "10px 14px", borderRadius: 10, marginBottom: 10, color: cat.color }}
                >
                  {cat.icon}
                  <span style={{ fontWeight: 700, fontSize: 15 }}>{cat.category}</span>
                  <span style={{ marginLeft: "auto" }}>{openCats.includes(cat.category) ? <ChevronDown size={15} /> : <ChevronRight size={15} />}</span>
                </button>

                {openCats.includes(cat.category) && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingLeft: 8 }}>
                    {cat.items.map((item) => {
                      const key = `${cat.category}:${item.path}:${item.method}`;
                      const isOpen = openItems.includes(key);
                      return (
                        <div key={key} style={{ border: "1px solid #1e1e2e", borderRadius: 12, overflow: "hidden" }}>
                          <button onClick={() => toggleItem(key)}
                            style={{ display: "flex", alignItems: "center", gap: 12, width: "100%", padding: "13px 16px", background: "#13131f", border: "none", cursor: "pointer", textAlign: "left" }}
                          >
                            <span style={{ fontFamily: "var(--font-geist-mono)", fontSize: 12, fontWeight: 700, color: METHOD_COLORS[item.method] ?? "#94a3b8", background: `${METHOD_COLORS[item.method] ?? "#94a3b8"}18`, padding: "3px 8px", borderRadius: 5, minWidth: 52, textAlign: "center" }}>{item.method}</span>
                            <span style={{ fontFamily: "var(--font-geist-mono)", fontSize: 13, color: "#94a3b8" }}>{item.path}</span>
                            <span style={{ fontSize: 13, color: "#64748b", marginLeft: 8 }}>{item.label}</span>
                            <span style={{ marginLeft: "auto", color: "#4b5563" }}>{isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}</span>
                          </button>

                          {isOpen && (
                            <div style={{ padding: "16px 18px", background: "#0d0d14", borderTop: "1px solid #1e1e2e" }}>
                              <p style={{ fontSize: 14, color: "#94a3b8", marginBottom: 14 }}>{item.desc}</p>
                              {"body" in item && item.body && (
                                <div style={{ marginBottom: 14 }}>
                                  <div style={{ fontSize: 11, color: "#4b5563", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Request Body</div>
                                  <div style={{ position: "relative" }}>
                                    <pre style={{ background: "#0a0a12", border: "1px solid #1e1e2e", borderRadius: 8, padding: "12px 14px", margin: 0, fontSize: 13, color: "#94a3b8", fontFamily: "var(--font-geist-mono)", overflowX: "auto", whiteSpace: "pre" }}>{item.body}</pre>
                                    <button onClick={() => copy(item.body ?? "", key + ":body")} style={{ position: "absolute", top: 8, right: 8, background: "none", border: "none", cursor: "pointer", color: copied === key + ":body" ? "#10b981" : "#4b5563", display: "flex", alignItems: "center", gap: 4, fontSize: 11 }}>
                                      {copied === key + ":body" ? <><Check size={11} /> Copied</> : <><Copy size={11} /> Copy</>}
                                    </button>
                                  </div>
                                </div>
                              )}
                              <div>
                                <div style={{ fontSize: 11, color: "#4b5563", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>Response</div>
                                <div style={{ position: "relative" }}>
                                  <pre style={{ background: "#0a0a12", border: "1px solid #1e1e2e", borderRadius: 8, padding: "12px 14px", margin: 0, fontSize: 13, color: "#94a3b8", fontFamily: "var(--font-geist-mono)", overflowX: "auto", whiteSpace: "pre" }}>{item.response}</pre>
                                  <button onClick={() => copy(item.response, key + ":res")} style={{ position: "absolute", top: 8, right: 8, background: "none", border: "none", cursor: "pointer", color: copied === key + ":res" ? "#10b981" : "#4b5563", display: "flex", alignItems: "center", gap: 4, fontSize: 11 }}>
                                    {copied === key + ":res" ? <><Check size={11} /> Copied</> : <><Copy size={11} /> Copy</>}
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ))}
          </section>

          {/* SDK note */}
          <section style={{ marginTop: 40, background: "linear-gradient(135deg, rgba(124,58,237,0.08), rgba(16,185,129,0.06))", border: "1px solid rgba(124,58,237,0.2)", borderRadius: 16, padding: "24px 26px" }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: "#f1f5f9", marginBottom: 8, display: "flex", alignItems: "center", gap: 8 }}><Code size={16} /> Quick Start</h3>
            <p style={{ fontSize: 14, color: "#94a3b8", marginBottom: 14 }}>
              Get your API key from the Dashboard, then create your first short link:
            </p>
            <pre style={{ background: "#0a0a12", border: "1px solid #1e1e2e", borderRadius: 10, padding: "14px 16px", fontSize: 13, color: "#94a3b8", fontFamily: "var(--font-geist-mono)", overflowX: "auto", marginBottom: 16 }}>
{`curl -X POST ${BASE}/links \
  -H "x-api-key: ld_your_key" \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com/very-long-path","slug":"short"}'`}
            </pre>
            <Link href="/dashboard" style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "9px 18px", borderRadius: 9, background: "linear-gradient(135deg, #7c3aed, #6d28d9)", color: "white", textDecoration: "none", fontSize: 13, fontWeight: 600 }}>
              Go to Dashboard <ArrowRight size={13} />
            </Link>
          </section>
        </div>
      </div>
    </div>
  );
}
