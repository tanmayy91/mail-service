# MailDrop 📬

Disposable email service with Discord bot account creation, REST API, and admin panel.

**Live site:** https://gootephode.me

---

## Features

- **Email / password login** — accounts created exclusively via the Discord bot
- **Discord Bot** — registration ticket system, TOS acceptance, balance top-ups
- **Dashboard** — create inboxes, read emails, **compose & send emails**, manage API key
- **Admin Panel** — view stats, manage users, top-up balances
- **REST API** — full programmatic access with API key auth
- **Railway-ready** — two services (web + bot) from one repo

---

## Stack

| Layer     | Tech                              |
|-----------|-----------------------------------|
| Frontend  | Next.js 15 · TailwindCSS · Lucide |
| Backend   | Next.js API Routes                |
| Auth      | NextAuth v5 (Credentials)         |
| Database  | JSON flat-file (`data/db.json`)   |
| Bot       | discord.js v14                    |
| Deploy    | Railway.com                       |

---

## Railway Deployment

### 1 — Fork & connect
Fork this repo, then in Railway create a **New Project → Deploy from GitHub repo**.

### 2 — Web service (Next.js)
Railway auto-detects `nixpacks.toml`. Set these environment variables in the Railway
dashboard for the web service:

| Variable          | Value                                  |
|-------------------|----------------------------------------|
| `NEXTAUTH_SECRET` | Long random string (32+ chars)         |
| `NEXTAUTH_URL`    | `https://<your-railway-domain>`        |
| `ADMIN_USERNAME`  | `admin` (or whatever you prefer)       |
| `ADMIN_PASSWORD`  | Strong password                        |
| `MAIL_DOMAIN`     | `mail.novacloud.tech`                  |
| `WEBHOOK_SECRET`  | Random secret shared with your MTA    |
| `WEBSITE_URL`     | `https://gootephode.me`                |
| `SMTP_HOST`       | Your SMTP server hostname              |
| `SMTP_PORT`       | `587` (STARTTLS) or `465` (SSL)        |
| `SMTP_SECURE`     | `false` for port 587, `true` for 465   |
| `SMTP_USER`       | SMTP login username                    |
| `SMTP_PASS`       | SMTP login password                    |

> SMTP variables are **optional** — if omitted, the Compose button in the dashboard
> will return a "not configured" error.  See [SMTP Setup](#smtp-setup) below for
> how to obtain credentials.

### 3 — Custom domain
1. In Railway → your web service → **Settings → Domains → Add Custom Domain**
2. Enter `gootephode.me` (or your domain)
3. Railway shows a `CNAME` target — add it in your DNS provider
4. Wait for DNS propagation (usually < 5 min on Cloudflare)
5. Railway auto-provisions a Let's Encrypt TLS certificate
6. Update `NEXTAUTH_URL` to `https://gootephode.me`

> **Why it works without extra config:** `auth.ts` sets `trustHost: true`,
> so NextAuth reads the host from Railway's `x-forwarded-host` header and
> automatically constructs correct callback / redirect URLs for any domain.

### 4 — Discord Bot service
Create a **second Railway service** in the same project:
1. New Service → GitHub repo (same repo)
2. Override the **Start Command** to: `npm run bot:start`
3. Set these additional env vars:

| Variable             | Value                         |
|----------------------|-------------------------------|
| `DISCORD_BOT_TOKEN`  | Bot token from Discord portal |
| `DISCORD_BOT_PREFIX` | `!`                           |
| `DISCORD_OWNER_IDS`  | Your Discord user ID          |
| `WEBSITE_URL`        | `https://gootephode.me`       |

### 5 — Bot first-time setup
In your Discord server run:
```
!setup panel1    ← in the #register channel
!setup panel2    ← in the #credits channel
!setcategory <category-id>   ← optional, sets where tickets are created
```

---

## SMTP Setup

SMTP credentials allow users to **send emails** from the dashboard.  
Any SMTP-capable provider works — below are the most common free options.

### Option A — Brevo (formerly Sendinblue) ✅ recommended free tier
1. Sign up at <https://app.brevo.com>
2. Go to **Settings → SMTP & API → SMTP**
3. Copy the values into your env:

   | Variable      | Value                      |
   |---------------|----------------------------|
   | `SMTP_HOST`   | `smtp-relay.brevo.com`     |
   | `SMTP_PORT`   | `587`                      |
   | `SMTP_SECURE` | `false`                    |
   | `SMTP_USER`   | Your Brevo account email   |
   | `SMTP_PASS`   | The **SMTP key** shown on the SMTP page (not your login password) |

> Free tier: 300 emails/day, no credit card required.

### Option B — Mailgun
1. Sign up at <https://mailgun.com> and add / verify your sending domain
2. Go to **Sending → Domains → your domain → SMTP credentials**
3. Create an SMTP user and note the password shown

   | Variable      | Value                          |
   |---------------|--------------------------------|
   | `SMTP_HOST`   | `smtp.mailgun.org`             |
   | `SMTP_PORT`   | `587`                          |
   | `SMTP_SECURE` | `false`                        |
   | `SMTP_USER`   | `postmaster@your-domain.com`   |
   | `SMTP_PASS`   | The generated SMTP password    |

### Option C — Gmail (personal / workspace)
> ⚠️ Requires a Google account with **2-Step Verification** enabled.

1. Enable 2FA on your Google account
2. Go to <https://myaccount.google.com/apppasswords>
3. Generate an App Password for "Mail"

   | Variable      | Value                     |
   |---------------|---------------------------|
   | `SMTP_HOST`   | `smtp.gmail.com`          |
   | `SMTP_PORT`   | `587`                     |
   | `SMTP_SECURE` | `false`                   |
   | `SMTP_USER`   | `you@gmail.com`           |
   | `SMTP_PASS`   | The 16-character app password |

### Option D — Self-hosted (Postfix / Haraka / etc.)
Point `SMTP_HOST` at your own mail server.  Use port `587` with STARTTLS
(`SMTP_SECURE=false`) or port `465` with implicit TLS (`SMTP_SECURE=true`).
`SMTP_USER` / `SMTP_PASS` are whatever credentials your server requires.

> **Tip:** For Railway deployments, set SMTP_* in the same service's
> environment variable panel as the other web-service variables above.

---

## Bot Commands

| Command | Who | Description |
|---------|-----|-------------|
| `!setup panel1` | Owner | Deploy account-creation panel |
| `!setup panel2` | Owner | Deploy credits/top-up panel |
| `!setcategory <id>` | Owner | Set ticket category |
| `!credit @user <amount>` | Owner | Top up by Discord mention |
| `!creditbyemail <email> <amount>` | Owner | Top up by email address |
| `!setplan @user <plan>` | Owner | Change user plan |
| `!stats` | Owner | View global stats |
| `!balance [@user]` | All | Check balance |
| `!help` | All | Show command list |

---

## API Reference

Base URL: `https://gootephode.me/api`
Authentication: `x-api-key: ms_your_key` header

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/mail` | List your inboxes |
| POST | `/mail` | Create inbox |
| GET | `/mail/:id` | List emails in inbox |
| DELETE | `/mail/:id` | Delete inbox |
| POST | `/mail/:id/send` | Send an email from an inbox |
| GET | `/mail/:id/emails/:eid` | Read email |
| DELETE | `/mail/:id/emails/:eid` | Delete email |
| GET | `/user/me` | Your profile |
| POST | `/webhook/receive` | Receive inbound email (MTA → service) |

### POST `/mail/:id/send`

Send an email from one of your inboxes.  Requires SMTP to be configured on the server.

```json
{
  "to": "recipient@example.com",
  "subject": "Hello!",
  "text": "Plain-text body",
  "html": "<p>Optional HTML body</p>"
}
```

Either `text` or `html` (or both) must be provided.

---

## Local Development

```bash
cp .env.example .env.local
# fill in .env.local

npm install
npm run dev          # Next.js on http://localhost:3000
npm run bot:start    # Discord bot (separate terminal)
```

---

## DNS / MX Setup (for receiving real emails)

To receive actual emails on `mail.novacloud.tech`:
1. Add an **MX record** pointing to your mail server / Cloudflare Email Routing
2. Configure your mail server to forward to `POST /api/webhook/receive` with the
   JSON payload `{ to, from, subject, text, html }`
3. Set `WEBHOOK_SECRET` and pass it as the `x-webhook-secret` request header

