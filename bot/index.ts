import {
  Client,
  GatewayIntentBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  PermissionFlagsBits,
  ChannelType,
  Message,
  ButtonInteraction,
  GuildMember,
  TextChannel,
  MessageCollector,
  StringSelectMenuBuilder,
  StringSelectMenuInteraction,
  AttachmentBuilder,
} from "discord.js";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import * as dotenv from "dotenv";
import archiver from "archiver";

dotenv.config({ path: path.join(__dirname, "../.env.local") });
dotenv.config(); // also load .env (Railway / production)

// ─────────────────────────────────────────────
//  JSON database — shared with the Next.js website
// ─────────────────────────────────────────────
const DATA_DIR = path.join(__dirname, "../data");
const DB_PATH  = path.join(DATA_DIR, "db.json");

interface UserData {
  _id: string;
  email: string;
  password: string;
  username: string;
  discordId?: string;
  avatar?: string;
  isAdmin: boolean;
  balance: number;
  apiKey: string;
  plan: string;
  inboxCount: number;
  emailsReceived: number;
  isActive: boolean;
  lastLogin: string;
  createdAt: string;
  updatedAt: string;
}
interface TransactionData {
  _id: string;
  userId: string;
  type: string;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  description: string;
  performedBy?: string;
  createdAt: string;
  updatedAt: string;
}
interface BotConfigData {
  guildId: string;
  panel1ChannelId?: string;
  panel2ChannelId?: string;
  ticketCategoryId?: string;
  panel1MessageId?: string;
  panel2MessageId?: string;
}
interface DB {
  users: UserData[];
  transactions: TransactionData[];
  inboxes: unknown[];
  emails: unknown[];
  botConfigs: BotConfigData[];
}

function readDB(): DB {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  try {
    const raw = fs.readFileSync(DB_PATH, "utf-8");
    const data = JSON.parse(raw) as Partial<DB>;
    return {
      users:        data.users        ?? [],
      transactions: data.transactions ?? [],
      inboxes:      data.inboxes      ?? [],
      emails:       data.emails       ?? [],
      botConfigs:   data.botConfigs   ?? [],
    };
  } catch {
    return { users: [], transactions: [], inboxes: [], emails: [], botConfigs: [] };
  }
}

function writeDB(db: DB): void {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), "utf-8");
}

function dbFindUser(q: Partial<UserData>): UserData | undefined {
  const db = readDB();
  const entries = Object.entries(q) as [keyof UserData, unknown][];
  return db.users.find(u => entries.every(([k, v]) => u[k] === v));
}

function dbSaveUser(user: UserData): UserData {
  const db = readDB();
  const idx = db.users.findIndex(u => u._id === user._id);
  const updated = { ...user, updatedAt: new Date().toISOString() };
  if (idx >= 0) db.users[idx] = updated; else db.users.push(updated);
  writeDB(db);
  return updated;
}

function dbCreateUser(data: Omit<UserData, "_id" | "createdAt" | "updatedAt">): UserData {
  const now = new Date().toISOString();
  const user: UserData = { ...data, _id: uuidv4(), createdAt: now, updatedAt: now };
  const db = readDB();
  db.users.push(user);
  writeDB(db);
  return user;
}

function dbUpdateUser(id: string, update: Partial<UserData>): UserData | undefined {
  const db = readDB();
  const idx = db.users.findIndex(u => u._id === id);
  if (idx < 0) return undefined;
  db.users[idx] = { ...db.users[idx], ...update, updatedAt: new Date().toISOString() };
  writeDB(db);
  return db.users[idx];
}

function dbCountUsers(): number { return readDB().users.length; }
function dbTotalBalance(): number { return readDB().users.reduce((s, u) => s + u.balance, 0); }

function dbCreateTransaction(data: Omit<TransactionData, "_id" | "createdAt" | "updatedAt">): TransactionData {
  const now = new Date().toISOString();
  const tx: TransactionData = { ...data, _id: uuidv4(), createdAt: now, updatedAt: now };
  const db = readDB();
  db.transactions.push(tx);
  writeDB(db);
  return tx;
}

function dbCountTransactions(userId: string): number {
  return readDB().transactions.filter(t => t.userId === userId).length;
}

function dbFindBotConfig(guildId: string): BotConfigData {
  return readDB().botConfigs.find(c => c.guildId === guildId) ?? { guildId };
}

function dbSaveBotConfig(config: BotConfigData): void {
  const db = readDB();
  const idx = db.botConfigs.findIndex(c => c.guildId === config.guildId);
  if (idx >= 0) db.botConfigs[idx] = config; else db.botConfigs.push(config);
  writeDB(db);
}

// ─────────────────────────────────────────────
//  Config
// ─────────────────────────────────────────────
const WEBSITE_URL       = process.env.WEBSITE_URL || "https://gootephode.me";
const BOT_TOKEN         = process.env.DISCORD_BOT_TOKEN!;
const PREFIX            = process.env.DISCORD_BOT_PREFIX || ".";
const OWNER_IDS         = (process.env.DISCORD_OWNER_IDS || "").split(",").filter(Boolean);
const BACKUP_CHANNEL_ID = process.env.BACKUP_CHANNEL_ID || "1483398610828922891";

// ─────────────────────────────────────────────
//  Plan definitions
// ─────────────────────────────────────────────
interface PlanInfo {
  key: string;
  label: string;
  emoji: string;
  price: number | null;
  inboxes: number | null;
  emailsPerMonth: number | null;
}

const PLANS: PlanInfo[] = [
  { key: "starter",    label: "Starter",    emoji: "⚡", price: 5,  inboxes: 10,   emailsPerMonth: 1_000  },
  { key: "pro",        label: "Pro",        emoji: "🚀", price: 15, inboxes: 50,   emailsPerMonth: 10_000 },
  { key: "enterprise", label: "Enterprise", emoji: "🏢", price: 50, inboxes: null, emailsPerMonth: null   },
  { key: "custom",     label: "Custom",     emoji: "🎨", price: null, inboxes: null, emailsPerMonth: null  },
];
const VALID_PLANS = ["none", ...PLANS.map(p => p.key)];

if (!BOT_TOKEN) {
  console.error("❌  DISCORD_BOT_TOKEN is not set");
  process.exit(1);
}

// ─────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────
function generateApiKey(): string { return "ms_" + uuidv4().replace(/-/g, ""); }
function isEmail(s: string): boolean { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s); }

async function sendBackup(): Promise<void> {
  if (!fs.existsSync(DB_PATH)) {
    console.warn("⚠️  db.json not found — skipping backup");
    return;
  }
  const channel = client.channels.cache.get(BACKUP_CHANNEL_ID) as TextChannel | undefined;
  if (!channel) {
    console.warn(`⚠️  Backup channel ${BACKUP_CHANNEL_ID} not found`);
    return;
  }
  const stamp   = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const zipPath = path.join(os.tmpdir(), `db-backup-${stamp}.zip`);

  await new Promise<void>((resolve, reject) => {
    const output  = fs.createWriteStream(zipPath);
    const archive = archiver("zip", { zlib: { level: 9 } });
    output.on("close", resolve);
    archive.on("error", reject);
    archive.pipe(output);
    archive.file(DB_PATH, { name: "db.json" });
    archive.finalize();
  });

  const attachment = new AttachmentBuilder(zipPath, { name: `backup-${stamp}.zip` });
  await channel.send({
    content: `📦 **Database Backup** — ${new Date().toUTCString()}`,
    files: [attachment],
  });
  fs.unlinkSync(zipPath);
  console.log("✅  Backup sent to channel", BACKUP_CHANNEL_ID);
}

// ─────────────────────────────────────────────
//  Bot client
// ─────────────────────────────────────────────
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
    GatewayIntentBits.GuildMembers,
  ],
});

// Track active ticket sessions  discordUserId → ticketChannelId
const activeSessions = new Map<string, string>();

// ─────────────────────────────────────────────
//  Embeds & rows
// ─────────────────────────────────────────────
function buildPanel1Embed(): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(0x7c3aed)
    .setTitle("📬  Create Your MailDrop Account")
    .setDescription(
      "Get instant access to disposable email inboxes.\n\n" +
      "**How it works:**\n" +
      "1️⃣  Click **Create Account** below\n" +
      "2️⃣  Accept our Terms of Service\n" +
      "3️⃣  Choose your email & password in a private ticket\n" +
      "4️⃣  Log in at **" + WEBSITE_URL + "** and start using your inboxes!\n\n" +
      "> 🔒 Your credentials are **never** stored in plain text.\n" +
      "> 🕐 The ticket auto-deletes after **5 minutes**."
    )
    .setThumbnail("https://cdn.discordapp.com/embed/avatars/0.png")
    .setFooter({ text: "MailDrop · " + WEBSITE_URL })
    .setTimestamp();
}

function buildPanel1Row(): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId("create_account").setLabel("Create Account").setStyle(ButtonStyle.Primary).setEmoji("✉️"),
    new ButtonBuilder().setCustomId("view_tos").setLabel("View TOS").setStyle(ButtonStyle.Secondary).setEmoji("📄")
  );
}

function buildPanel2Embed(): EmbedBuilder {
  const planLines = PLANS.map(p =>
    p.price !== null
      ? `${p.emoji}  **${p.label}** ($${p.price}/mo) — ${p.inboxes !== null ? `${p.inboxes} inboxes · ${p.emailsPerMonth!.toLocaleString()} emails/mo` : "Unlimited"}`
      : `${p.emoji}  **${p.label}** — Contact staff for a tailored plan`
  ).join("\n");

  return new EmbedBuilder()
    .setColor(0x10b981)
    .setTitle("💰  Credits")
    .setDescription(
      "Add credits to unlock higher plans and more inboxes.\n\n" +
      "**Plans:**\n" + planLines + "\n\n" +
      "New accounts start with **no plan** — purchase one to unlock inboxes.\n" +
      `Use \`${PREFIX}balance\` to check your current balance.`
    )
    .setFooter({ text: "MailDrop · " + WEBSITE_URL })
    .setTimestamp();
}

function buildPanel2Row(): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId("check_balance").setLabel("Check My Balance").setStyle(ButtonStyle.Success).setEmoji("💳"),
    new ButtonBuilder().setCustomId("view_plans").setLabel("View Plans").setStyle(ButtonStyle.Secondary).setEmoji("📊")
  );
}

function buildTosRow(): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder().setCustomId("accept_tos").setLabel("✅ Accept TOS").setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId("decline_tos").setLabel("❌ Decline").setStyle(ButtonStyle.Danger)
  );
}

function buildTosEmbed(): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle("📄  Terms of Service")
    .setDescription(
      "By using MailDrop you agree to:\n\n" +
      "• Not use the service for spam or illegal activity\n" +
      "• Not share your credentials with others\n" +
      "• Accept that temporary inboxes may expire\n" +
      "• Understand that the service is provided as-is\n\n" +
      "Do you **accept** these terms?"
    );
}

// ─────────────────────────────────────────────
//  READY
// ─────────────────────────────────────────────
client.once("ready", () => {
  console.log(`✅  Logged in as ${client.user!.tag}`);
  console.log(`📁  Database: ${DB_PATH}`);

  // Send backup every 6 hours
  setInterval(() => sendBackup().catch(console.error), 6 * 60 * 60 * 1_000);
  // Initial backup 30 s after startup (give channels time to cache)
  setTimeout(() => sendBackup().catch(console.error), 30_000);
});

// ─────────────────────────────────────────────
//  MESSAGE commands
// ─────────────────────────────────────────────
client.on("messageCreate", async (message: Message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith(PREFIX)) return;

  const args    = message.content.slice(PREFIX.length).trim().split(/\s+/);
  const command = args.shift()!.toLowerCase();
  const isOwner = OWNER_IDS.includes(message.author.id) ||
    (message.member?.permissions.has(PermissionFlagsBits.Administrator) ?? false);

  // ── .setup ────────────────────────────────
  if (command === "setup") {
    if (!isOwner) return message.reply("❌ Owner only.");
    if (!message.guild) return;

    const sub = args[0]?.toLowerCase();
    if (!sub || (sub !== "panel1" && sub !== "panel2")) {
      return void message.reply(`Usage: \`${PREFIX}setup panel1\` or \`${PREFIX}setup panel2\``);
    }

    const config = dbFindBotConfig(message.guild.id);

    if (sub === "panel1") {
      const sent = await (message.channel as TextChannel).send({ embeds: [buildPanel1Embed()], components: [buildPanel1Row()] });
      dbSaveBotConfig({ ...config, panel1ChannelId: message.channel.id, panel1MessageId: sent.id });
      await message.reply("✅ Panel 1 (Account Creation) deployed!");
    } else {
      const sent = await (message.channel as TextChannel).send({ embeds: [buildPanel2Embed()], components: [buildPanel2Row()] });
      dbSaveBotConfig({ ...config, panel2ChannelId: message.channel.id, panel2MessageId: sent.id });
      await message.reply("✅ Panel 2 (Credits) deployed!");
    }
    return;
  }

  // ── .setcat / .setcategory — dropdown picker ──
  if (command === "setcategory" || command === "setcat") {
    if (!isOwner) return message.reply("❌ Owner only.");
    if (!message.guild) return;

    const categories = message.guild.channels.cache
      .filter(c => c.type === ChannelType.GuildCategory)
      .map(c => ({ id: c.id, name: c.name }))
      .slice(0, 25); // Discord select-menu limit

    if (categories.length === 0) {
      return void message.reply("❌ No categories found in this server. Create one first.");
    }

    const select = new StringSelectMenuBuilder()
      .setCustomId(`select_category:${message.guild.id}`)
      .setPlaceholder("Choose a ticket category…")
      .addOptions(categories.map(c => ({ label: c.name, value: c.id })));

    const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);
    await message.reply({
      content: "📂 Select the category to use for registration ticket channels:",
      components: [row],
    });
    return;
  }

  // ── .credit ───────────────────────────────
  if (command === "credit") {
    if (!isOwner) return message.reply("❌ Owner only.");
    const mention = message.mentions.users.first();
    const amount  = parseFloat(args[1] ?? "");
    if (!mention || isNaN(amount) || amount <= 0) {
      return void message.reply("Usage: `.credit @user <amount>`");
    }
    const user = dbFindUser({ discordId: mention.id });
    if (!user) return void message.reply("❌ That user doesn't have a MailDrop account. Use `.creditbyemail <email> <amount>` instead.");
    const before = user.balance;
    const updated = dbUpdateUser(user._id, { balance: before + amount })!;
    dbCreateTransaction({ userId: user._id, type: "topup", amount, balanceBefore: before, balanceAfter: updated.balance, description: `Admin credit: $${amount}`, performedBy: message.author.tag });

    try {
      await mention.send({ embeds: [
        new EmbedBuilder().setColor(0x10b981).setTitle("💰 Balance Credited")
          .setDescription(`Your MailDrop balance has been credited **$${amount}**!\n\nNew balance: **$${updated.balance.toFixed(2)}**\n\n[Visit Dashboard](${WEBSITE_URL}/dashboard)`)
          .setFooter({ text: "MailDrop · " + WEBSITE_URL }).setTimestamp()
      ]});
    } catch { /* DMs disabled */ }

    return void message.reply(`✅ Credited **$${amount}** to ${mention.tag}. New balance: **$${updated.balance.toFixed(2)}**`);
  }

  // ── .creditbyemail ────────────────────────
  if (command === "creditbyemail") {
    if (!isOwner) return message.reply("❌ Owner only.");
    const email  = args[0];
    const amount = parseFloat(args[1] ?? "");
    if (!email || isNaN(amount) || amount <= 0) {
      return void message.reply("Usage: `.creditbyemail <email> <amount>`");
    }
    const user = dbFindUser({ email: email.toLowerCase() });
    if (!user) return void message.reply("❌ No account found with that email.");
    const before  = user.balance;
    const updated = dbUpdateUser(user._id, { balance: before + amount })!;
    dbCreateTransaction({ userId: user._id, type: "topup", amount, balanceBefore: before, balanceAfter: updated.balance, description: `Admin credit: $${amount}`, performedBy: message.author.tag });
    return void message.reply(`✅ Credited **$${amount}** to \`${email}\`. New balance: **$${updated.balance.toFixed(2)}**`);
  }

  // ── .deduct ───────────────────────────────
  if (command === "deduct") {
    if (!isOwner) return message.reply("❌ Owner only.");
    const mention = message.mentions.users.first();
    const amount  = parseFloat(args[1] ?? "");
    if (!mention || isNaN(amount) || amount <= 0) {
      return void message.reply("Usage: `.deduct @user <amount>`");
    }
    const user = dbFindUser({ discordId: mention.id });
    if (!user) return void message.reply("❌ That user doesn't have a MailDrop account linked.");
    const before   = user.balance;
    const newBal   = Math.max(0, before - amount);
    const deducted = before - newBal;
    const updated  = dbUpdateUser(user._id, { balance: newBal })!;
    dbCreateTransaction({ userId: user._id, type: "deduct", amount: deducted, balanceBefore: before, balanceAfter: updated.balance, description: `Admin deduct: $${deducted}`, performedBy: message.author.tag });

    try {
      await mention.send({ embeds: [
        new EmbedBuilder().setColor(0xef4444).setTitle("💸 Balance Deducted")
          .setDescription(`**$${deducted.toFixed(2)}** has been deducted from your MailDrop balance.\n\nNew balance: **$${updated.balance.toFixed(2)}**\n\n[Visit Dashboard](${WEBSITE_URL}/dashboard)`)
          .setFooter({ text: "MailDrop · " + WEBSITE_URL }).setTimestamp()
      ]});
    } catch { /* DMs disabled */ }

    return void message.reply(`✅ Deducted **$${deducted.toFixed(2)}** from ${mention.tag}. New balance: **$${updated.balance.toFixed(2)}**`);
  }

  // ── .deductbyemail ────────────────────────
  if (command === "deductbyemail") {
    if (!isOwner) return message.reply("❌ Owner only.");
    const email  = args[0];
    const amount = parseFloat(args[1] ?? "");
    if (!email || isNaN(amount) || amount <= 0) {
      return void message.reply("Usage: `.deductbyemail <email> <amount>`");
    }
    const user = dbFindUser({ email: email.toLowerCase() });
    if (!user) return void message.reply("❌ No account found with that email.");
    const before   = user.balance;
    const newBal   = Math.max(0, before - amount);
    const deducted = before - newBal;
    const updated  = dbUpdateUser(user._id, { balance: newBal })!;
    dbCreateTransaction({ userId: user._id, type: "deduct", amount: deducted, balanceBefore: before, balanceAfter: updated.balance, description: `Admin deduct: $${deducted}`, performedBy: message.author.tag });
    return void message.reply(`✅ Deducted **$${deducted.toFixed(2)}** from \`${email}\`. New balance: **$${updated.balance.toFixed(2)}**`);
  }

  // ── .lookup ───────────────────────────────
  if (command === "lookup") {
    if (!isOwner) return message.reply("❌ Owner only.");
    let user: UserData | undefined;
    const mention = message.mentions.users.first();
    if (mention)       user = dbFindUser({ discordId: mention.id });
    else if (args[0])  user = dbFindUser({ email: args[0].toLowerCase() });
    else return void message.reply("Usage: `.lookup @user` or `.lookup <email>`");

    if (!user) return void message.reply("❌ No MailDrop account found.");
    const txCount = dbCountTransactions(user._id);
    const embed = new EmbedBuilder()
      .setColor(0x7c3aed)
      .setTitle("🔍 Account Lookup")
      .addFields(
        { name: "👤 Username",        value: user.username,                         inline: true  },
        { name: "📧 Email",           value: user.email,                            inline: true  },
        { name: "💰 Balance",         value: `$${user.balance.toFixed(2)}`,         inline: true  },
        { name: "📋 Plan",            value: user.plan,                             inline: true  },
        { name: "📬 Inboxes",         value: user.inboxCount.toString(),            inline: true  },
        { name: "📩 Emails Received", value: user.emailsReceived.toString(),        inline: true  },
        { name: "🔑 API Key",         value: `\`${user.apiKey}\``,                  inline: false },
        { name: "🏦 Transactions",    value: txCount.toString(),                    inline: true  },
        { name: "✅ Active",          value: user.isActive ? "Yes" : "No",          inline: true  },
        { name: "🛡️ Admin",          value: user.isAdmin  ? "Yes" : "No",          inline: true  },
        { name: "📅 Joined",          value: new Date(user.createdAt).toUTCString(), inline: false },
      )
      .setFooter({ text: "MailDrop · " + WEBSITE_URL })
      .setTimestamp();
    return void message.reply({ embeds: [embed] });
  }

  // ── .balance ──────────────────────────────
  if (command === "balance") {
    const target = message.mentions.users.first() ?? message.author;
    const user   = dbFindUser({ discordId: target.id });
    if (!user) return void message.reply(`❌ No MailDrop account linked to ${target.tag}.`);
    return void message.reply(`💳 **${user.username}** (${user.email}) — Balance: **$${user.balance.toFixed(2)}** | Plan: **${user.plan}**`);
  }

  // ── .stats ────────────────────────────────
  if (command === "stats") {
    if (!isOwner) return message.reply("❌ Owner only.");
    const db         = readDB();
    const users      = dbCountUsers();
    const inboxes    = (db.inboxes as Array<{ isActive?: boolean }>).filter(i => i.isActive).length;
    const emails     = (db.emails as unknown[]).length;
    const bal        = dbTotalBalance();
    const embed = new EmbedBuilder()
      .setColor(0x7c3aed)
      .setTitle("📊 MailDrop Stats")
      .addFields(
        { name: "👥 Users",           value: users.toString(),          inline: true },
        { name: "📬 Active Inboxes",  value: inboxes.toString(),        inline: true },
        { name: "📧 Emails Received", value: emails.toString(),         inline: true },
        { name: "💰 Total Balance",   value: `$${bal.toFixed(2)}`,      inline: true },
      )
      .setFooter({ text: "MailDrop · " + WEBSITE_URL })
      .setTimestamp();
    return void message.reply({ embeds: [embed] });
  }

  // ── .setplan ──────────────────────────────
  if (command === "setplan") {
    if (!isOwner) return message.reply("❌ Owner only.");
    const mention = message.mentions.users.first();
    const plan    = args[1]?.toLowerCase();
    if (!mention || !VALID_PLANS.includes(plan ?? "")) {
      return void message.reply(`Usage: \`${PREFIX}setplan @user <${VALID_PLANS.join("|")}>\``);
    }
    const user = dbFindUser({ discordId: mention.id });
    if (!user) return void message.reply("❌ No account found.");
    dbUpdateUser(user._id, { plan });
    return void message.reply(`✅ Set ${mention.tag}'s plan to **${plan}**.`);
  }

  // ── .backup ───────────────────────────────
  if (command === "backup") {
    if (!isOwner) return message.reply("❌ Owner only.");
    await message.reply("📦 Generating backup…");
    try {
      await sendBackup();
      await message.reply(`✅ Backup sent to <#${BACKUP_CHANNEL_ID}>.`);
    } catch (err) {
      console.error("Backup error:", err);
      await message.reply("❌ Backup failed. Check the console for details.");
    }
    return;
  }

  // ── .help ─────────────────────────────────
  if (command === "help") {
    const embed = new EmbedBuilder()
      .setColor(0x7c3aed)
      .setTitle("🤖 MailDrop Bot Commands")
      .setDescription(`Prefix: \`${PREFIX}\``)
      .addFields(
        { name: "User Commands", value:
            `\`${PREFIX}balance [@user]\` — Check balance\n` +
            `\`${PREFIX}help\` — Show this message` },
        { name: "Owner Commands", value:
            `\`${PREFIX}setup panel1\` — Deploy registration panel\n` +
            `\`${PREFIX}setup panel2\` — Deploy credits panel\n` +
            `\`${PREFIX}setcat\` — Set ticket category (dropdown)\n` +
            `\`${PREFIX}credit @user <amount>\` — Add credits by Discord user\n` +
            `\`${PREFIX}creditbyemail <email> <amount>\` — Add credits by email\n` +
            `\`${PREFIX}deduct @user <amount>\` — Remove credits by Discord user\n` +
            `\`${PREFIX}deductbyemail <email> <amount>\` — Remove credits by email\n` +
            `\`${PREFIX}lookup @user|<email>\` — Look up account details\n` +
            `\`${PREFIX}setplan @user <plan>\` — Change user plan\n` +
            `\`${PREFIX}stats\` — View statistics\n` +
            `\`${PREFIX}backup\` — Send DB backup to backup channel` },
      )
      .setFooter({ text: "MailDrop · " + WEBSITE_URL });
    return void message.reply({ embeds: [embed] });
  }
});

// ─────────────────────────────────────────────
//  INTERACTIONS  (buttons + select menus)
// ─────────────────────────────────────────────
client.on("interactionCreate", async (interaction) => {

  // ── Select-menu: pick ticket category ─────
  if (interaction.isStringSelectMenu() && interaction.customId.startsWith("select_category:")) {
    const sel = interaction as StringSelectMenuInteraction;
    const isOwner = OWNER_IDS.includes(sel.user.id) ||
      (sel.member instanceof GuildMember && sel.member.permissions.has(PermissionFlagsBits.Administrator));
    if (!isOwner) {
      await sel.reply({ content: "❌ Owner only.", ephemeral: true });
      return;
    }
    const guildId = sel.customId.split(":")[1];
    const catId   = sel.values[0];
    const config  = dbFindBotConfig(guildId);
    dbSaveBotConfig({ ...config, ticketCategoryId: catId });
    const catName = sel.guild?.channels.cache.get(catId)?.name ?? catId;
    await sel.update({
      content:    `✅ Ticket category set to **${catName}** (\`${catId}\`).`,
      components: [],
    });
    return;
  }

  if (!interaction.isButton()) return;
  const btn = interaction as ButtonInteraction;

  // ── View TOS ─────────────────────────────
  if (btn.customId === "view_tos") {
    await btn.reply({ embeds: [buildTosEmbed()], ephemeral: true });
    return;
  }

  // ── Create Account ────────────────────────
  if (btn.customId === "create_account") {
    if (!btn.guild) return;

    if (activeSessions.has(btn.user.id)) {
      await btn.reply({ content: "⚠️ You already have an open registration ticket. Please complete it first.", ephemeral: true });
      return;
    }

    const existingUser = dbFindUser({ discordId: btn.user.id });
    if (existingUser) {
      await btn.reply({ content: `✅ You already have a MailDrop account!\n📧 Email: \`${existingUser.email}\`\n🌐 Login at ${WEBSITE_URL}`, ephemeral: true });
      return;
    }

    await btn.reply({ embeds: [buildTosEmbed()], components: [buildTosRow()], ephemeral: true });
    return;
  }

  // ── Decline TOS ───────────────────────────
  if (btn.customId === "decline_tos") {
    await btn.update({ content: "❌ You declined the TOS. You cannot create an account.", embeds: [], components: [] });
    return;
  }

  // ── Accept TOS → open ticket ──────────────
  if (btn.customId === "accept_tos") {
    if (!btn.guild) return;
    await btn.update({ content: "✅ TOS accepted! Opening your private registration ticket…", embeds: [], components: [] });

    const config = dbFindBotConfig(btn.guild.id);

    let ticketChannel: TextChannel;
    try {
      ticketChannel = await btn.guild.channels.create({
        name: `register-${btn.user.username.toLowerCase().replace(/[^a-z0-9]/g, "")}`,
        type: ChannelType.GuildText,
        parent: config.ticketCategoryId ?? undefined,
        permissionOverwrites: [
          { id: btn.guild.roles.everyone, deny: [PermissionFlagsBits.ViewChannel] },
          { id: btn.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
          { id: btn.client.user!.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ManageChannels] },
        ],
      }) as TextChannel;
    } catch (err) {
      console.error("Failed to create ticket channel:", err);
      await btn.followUp({ content: "❌ Could not create a ticket channel. Please contact an admin.", ephemeral: true });
      return;
    }

    activeSessions.set(btn.user.id, ticketChannel.id);

    await ticketChannel.send({
      content: `<@${btn.user.id}>`,
      embeds: [
        new EmbedBuilder()
          .setColor(0x7c3aed)
          .setTitle("📝 Account Registration")
          .setDescription("Welcome! Let's set up your MailDrop account.\n\n**Step 1 of 2:** Please type the **email address** you want to use for your account.")
          .setFooter({ text: "This ticket will be deleted automatically in 5 minutes after account creation." }),
      ],
    });

    let step: "email" | "password" = "email";
    let collectedEmail = "";
    let collectedPassword = "";

    const emailCollector: MessageCollector = ticketChannel.createMessageCollector({
      filter: (m: Message) => m.author.id === btn.user.id,
      max: 5,
      time: 5 * 60 * 1000,
    });

    emailCollector.on("collect", async (msg: Message) => {
      const content = msg.content.trim();

      if (step === "email") {
        if (!isEmail(content)) {
          await ticketChannel.send("⚠️ That doesn't look like a valid email. Please try again:");
          return;
        }
        const exists = dbFindUser({ email: content.toLowerCase() });
        if (exists) {
          await ticketChannel.send("⚠️ An account with that email already exists. Please use a different email:");
          return;
        }
        collectedEmail = content.toLowerCase();
        step = "password";
        await ticketChannel.send({
          embeds: [
            new EmbedBuilder().setColor(0x7c3aed)
              .setDescription(`✅ Email accepted: \`${collectedEmail}\`\n\n**Step 2 of 2:** Please type a **password** (minimum 8 characters).`)
          ],
        });
        return;
      }

      if (step === "password") {
        if (content.length < 8) {
          await ticketChannel.send("⚠️ Password must be at least 8 characters. Try again:");
          return;
        }
        collectedPassword = content;
        emailCollector.stop("done");

        try { await msg.delete(); } catch { /* ignore */ }

        const hashedPassword = await bcrypt.hash(collectedPassword, 12);
        const apiKey         = generateApiKey();
        const member         = btn.member as GuildMember;
        const newUser        = dbCreateUser({
          email:          collectedEmail,
          password:       hashedPassword,
          username:       member?.displayName ?? btn.user.username,
          discordId:      btn.user.id,
          avatar:         btn.user.displayAvatarURL(),
          apiKey,
          balance:        0,
          plan:           "none",
          isAdmin:        false,
          inboxCount:     0,
          emailsReceived: 0,
          isActive:       true,
          lastLogin:      new Date().toISOString(),
        });

        const welcomeEmbed = new EmbedBuilder()
          .setColor(0x7c3aed)
          .setTitle("🎉 Welcome to MailDrop!")
          .setDescription(
            `Your account has been created successfully!\n\n` +
            `**Login at:** ${WEBSITE_URL}\n\n` +
            `�� **Email:** \`${collectedEmail}\`\n` +
            `🔑 **Your API Key:** \`${apiKey}\`\n` +
            `💰 **Credits:** $${newUser.balance.toFixed(2)}\n` +
            `📋 **Plan:** ${newUser.plan}\n\n` +
            `> 🔒 Keep your credentials safe. Never share them.\n` +
            `> ⚠️ Your plan is currently **none** — use \`${PREFIX}calc\` to see what you can buy, then ask staff to assign a plan.`
          )
          .setThumbnail(btn.user.displayAvatarURL())
          .setFooter({ text: "MailDrop · " + WEBSITE_URL })
          .setTimestamp();

        try {
          await btn.user.send({ embeds: [welcomeEmbed] });
        } catch {
          await ticketChannel.send("⚠️ Could not send DM. Please enable DMs from server members to receive your credentials.");
          await ticketChannel.send({
            embeds: [
              new EmbedBuilder().setColor(0x10b981).setTitle("📋 Your Credentials")
                .setDescription(`📧 **Email:** \`${collectedEmail}\`\n🔑 **API Key:** \`${apiKey}\`\n\n**Login at:** ${WEBSITE_URL}\n\n⚠️ Screenshot this — it will be gone in 5 minutes!`)
            ],
          });
        }

        await ticketChannel.send({
          embeds: [
            new EmbedBuilder().setColor(0x10b981).setTitle("✅ Account Created!")
              .setDescription(`Your account is ready!\n\n📬 Check your DMs for login details.\n🌐 Log in at: ${WEBSITE_URL}\n\n⏰ This ticket will be **deleted in 5 minutes**.`)
              .setFooter({ text: "MailDrop Registration" }),
          ],
        });

        activeSessions.delete(btn.user.id);
        setTimeout(async () => { try { await ticketChannel.delete(); } catch { /* ignore */ } }, 5 * 60 * 1000);
      }
    });

    emailCollector.on("end", async (_collected, reason: string) => {
      if (reason === "done") return;
      activeSessions.delete(btn.user.id);
      try {
        await ticketChannel.send("⏰ Registration timed out. This ticket will be deleted in 1 minute.");
        setTimeout(async () => { try { await ticketChannel.delete(); } catch { /* ignore */ } }, 60_000);
      } catch { /* ignore */ }
    });

    return;
  }

  // ── Check Balance (Panel 2) ───────────────
  if (btn.customId === "check_balance") {
    const user = dbFindUser({ discordId: btn.user.id });
    if (!user) {
      await btn.reply({ content: `❌ No MailDrop account found. Create one using the registration panel!\n🌐 ${WEBSITE_URL}`, ephemeral: true });
      return;
    }
    await btn.reply({
      embeds: [
        new EmbedBuilder().setColor(0x10b981).setTitle("💳 Your Balance")
          .addFields(
            { name: "Balance", value: `$${user.balance.toFixed(2)}`, inline: true },
            { name: "Plan",    value: user.plan,                     inline: true },
            { name: "Email",   value: user.email,                    inline: true },
            { name: "API Key", value: `\`${user.apiKey}\``,          inline: false },
          )
          .setFooter({ text: "MailDrop · " + WEBSITE_URL })
      ],
      ephemeral: true,
    });
    return;
  }

  // ── View Plans (Panel 2) ──────────────────
  if (btn.customId === "view_plans") {
    await btn.reply({
      embeds: [
        new EmbedBuilder().setColor(0x7c3aed).setTitle("📊 MailDrop Plans")
          .addFields(
            { name: "🆓 Free",       value: "3 inboxes · 100 emails/mo · $0",        inline: false },
            { name: "⚡ Starter",    value: "10 inboxes · 1 000 emails/mo · $5/mo",  inline: false },
            { name: "🚀 Pro",        value: "50 inboxes · 10 000 emails/mo · $15/mo", inline: false },
            { name: "🏢 Enterprise", value: "Unlimited · $50/mo",                    inline: false },
          )
          .setFooter({ text: "Top up via the owner or contact staff" }),
      ],
      ephemeral: true,
    });
    return;
  }
});

// ─────────────────────────────────────────────
//  Start
// ─────────────────────────────────────────────
client.login(BOT_TOKEN).catch((err) => {
  console.error("❌  Failed to login:", err);
  process.exit(1);
});
