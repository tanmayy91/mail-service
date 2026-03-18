# MailDrop 📬

Disposable email service with Discord bot account creation, REST API, admin panel, and Mailcow integration.

**Live site:** https://gootephode.me

---

## Features

- **Email / password login** — accounts created exclusively via the Discord bot
- **Discord Bot** — registration ticket system, TOS acceptance, balance top-ups
- **Dashboard** — create inboxes, read emails, manage API key
- **Admin Panel** — view stats, manage users, top-up balances, manage Mailcow server
- **Mailcow Integration** — auto-provision email aliases on your Mailcow server when inboxes are created; manage domains and mailboxes from the admin panel
- **REST API** — full programmatic access with API key auth
- **Railway-ready** — two services (web + bot) from one repo

---

## Stack

| Layer     | Tech                                      |
|-----------|-------------------------------------------|
| Frontend  | Next.js 16 · TailwindCSS · Lucide         |
| Backend   | Next.js API Routes                        |
| Auth      | NextAuth v5 (Credentials)                 |
| Database  | JSON file (`data/db.json`)                |
| Mail      | Mailcow (self-hosted) + IMAP catch-all    |
| Bot       | discord.js v14                            |
| Deploy    | Railway.com                               |

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
| `MONGODB_URI`     | Your MongoDB Atlas / Railway Mongo URI |
| `MAIL_DOMAIN`     | `mail.gootephode.me`                   |
| `WEBSITE_URL`     | `https://gootephode.me`                |

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
| `MONGODB_URI`        | Same URI as web service       |
| `WEBSITE_URL`        | `https://gootephode.me`       |

### 5 — Bot first-time setup
In your Discord server run:
```
!setup panel1    ← in the #register channel
!setup panel2    ← in the #credits channel
!setcategory <category-id>   ← optional, sets where tickets are created
```

---

## Bot Commands

| Command | Who | Description |
|---------|-----|-------------|
| `!setup panel1` | Owner | Deploy account-creation panel |
| `!setup panel2` | Owner | Deploy credits/top-up panel |
| `!setcategory <id>` | Owner | Set ticket category |
| `!topup @user <amount>` | Owner | Top up by Discord mention |
| `!topupbyemail <email> <amount>` | Owner | Top up by email address |
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
| GET | `/mail/:id/emails/:eid` | Read email |
| DELETE | `/mail/:id/emails/:eid` | Delete email |
| GET | `/user/me` | Your profile |
| POST | `/webhook/receive` | Receive inbound email |

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

To receive actual emails on `mail.gootephode.me`:
1. Add an **MX record** pointing to your mail server / Cloudflare Email Routing
2. Configure your mail server to forward to `POST /api/webhook/receive` with the
   JSON payload `{ to, from, subject, text, html }`
3. Secure the webhook with the `WEBHOOK_SECRET` env var (add to the route handler)

---

## Mailcow Integration

[Mailcow](https://mailcow.email) is a Dockerized mail-server suite with a built-in admin UI and REST API.
MailDrop integrates with it so that **every inbox you create automatically gets a Mailcow alias**, routing
incoming mail to the catch-all mailbox that the IMAP service polls.

### Setup

1. Deploy Mailcow on your server following [the official docs](https://docs.mailcow.email/).
2. In Mailcow → **Configuration → Access → API**, create a read/write API key.
3. Set environment variables:

| Variable           | Value                                      |
|--------------------|--------------------------------------------|
| `MAILCOW_URL`      | Base URL of your instance, e.g. `https://mail.example.com` |
| `MAILCOW_API_KEY`  | API key from Mailcow Configuration → Access → API |

Both variables must be set; if either is missing MailDrop degrades gracefully (inboxes still work via the IMAP catch-all, aliases just aren't auto-provisioned).

### Admin Panel — Mailcow Tab

Navigate to `/admin` and click **Mailcow** in the left sidebar.  You'll see:

- **Server info** — Mailcow version & hostname
- **Domains** — list with alias/mailbox counts; delete button
- **Mailboxes** — list with quota/message count; delete button
- **Add Domain** — create a new domain on your Mailcow instance
- **Add Mailbox** — create a new mailbox (local part, domain, display name, password)

### Admin API Routes

All routes require an admin session.

| Method | Endpoint              | Description                  |
|--------|-----------------------|------------------------------|
| GET    | `/api/admin/mailcow`  | Server info, domains, mailboxes |
| POST   | `/api/admin/mailcow`  | Manage Mailcow (see body actions below) |

**POST body actions:**

```json
// Create a domain
{ "action": "create_domain", "domain": "example.com", "description": "optional" }

// Delete a domain
{ "action": "delete_domain", "domain": "example.com" }

// Create a mailbox
{ "action": "create_mailbox", "localPart": "user", "domain": "example.com", "name": "Display Name", "password": "secret", "quotaMb": 1024 }

// Delete a mailbox
{ "action": "delete_mailbox", "address": "user@example.com" }
```

### Self-signed TLS

If your Mailcow instance uses a self-signed certificate, set `NODE_TLS_REJECT_UNAUTHORIZED=0` in your environment. Do **not** do this in production with a public-facing service.

