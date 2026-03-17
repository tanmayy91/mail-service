# MailDrop 📬

Disposable email service with Discord bot account creation, REST API, and admin panel.

**Live site:** https://gootephode.me

---

## Features

- **Email / password login** — accounts created exclusively via the Discord bot
- **Discord Bot** — registration ticket system, TOS acceptance, balance top-ups
- **Dashboard** — create inboxes, read emails, manage API key
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
| Database  | MongoDB (Mongoose)                |
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

