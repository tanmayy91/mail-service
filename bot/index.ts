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
  Collection,
  MessageCollector,
  ComponentType,
} from "discord.js";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import * as dotenv from "dotenv";

dotenv.config({ path: require("path").join(__dirname, "../.env.local") });
dotenv.config(); // also load .env (Railway / production)

// ─────────────────────────────────────────────
//  Mongoose models (inline, no Next.js imports)
// ─────────────────────────────────────────────
const MONGODB_URI = process.env.MONGODB_URI!;
const WEBSITE_URL = process.env.WEBSITE_URL || "https://gootephode.me";
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN!;
const PREFIX = process.env.DISCORD_BOT_PREFIX || ".";
const OWNER_IDS = (process.env.DISCORD_OWNER_IDS || "").split(",").filter(Boolean);

if (!BOT_TOKEN) {
  console.error("❌  DISCORD_BOT_TOKEN is not set");
  process.exit(1);
}

// ── User Schema ──────────────────────────────
const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    username: { type: String, required: true },
    discordId: { type: String, sparse: true },
    avatar: { type: String },
    isAdmin: { type: Boolean, default: false },
    balance: { type: Number, default: 0 },
    apiKey: { type: String, unique: true, required: true },
    plan: { type: String, enum: ["free", "starter", "pro", "enterprise"], default: "free" },
    inboxCount: { type: Number, default: 0 },
    emailsReceived: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    lastLogin: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// ── Transaction Schema ───────────────────────
const transactionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, enum: ["topup", "deduct", "bonus", "refund"], required: true },
    amount: { type: Number, required: true },
    balanceBefore: { type: Number, required: true },
    balanceAfter: { type: Number, required: true },
    description: { type: String, required: true },
    performedBy: { type: String },
  },
  { timestamps: true }
);

// ── BotConfig Schema (stores panel channel IDs) ──
const botConfigSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },
  panel1ChannelId: { type: String },
  panel2ChannelId: { type: String },
  ticketCategoryId: { type: String },
  panel1MessageId: { type: String },
  panel2MessageId: { type: String },
});

const UserModel = mongoose.models?.BotUser || mongoose.model("BotUser", userSchema, "users");
const TransactionModel = mongoose.models?.BotTransaction || mongoose.model("BotTransaction", transactionSchema, "transactions");
const BotConfigModel = mongoose.models?.BotConfig || mongoose.model("BotConfig", botConfigSchema);

// ─────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────
function generateApiKey(): string {
  return "ms_" + uuidv4().replace(/-/g, "");
}

function isEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

async function connectDB() {
  if (mongoose.connection.readyState === 1) return;
  await mongoose.connect(MONGODB_URI, { bufferCommands: false });
  console.log("✅  MongoDB connected");
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

// Track active ticket sessions (discordUserId → ticketChannelId)
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
    new ButtonBuilder()
      .setCustomId("create_account")
      .setLabel("Create Account")
      .setStyle(ButtonStyle.Primary)
      .setEmoji("✉️"),
    new ButtonBuilder()
      .setCustomId("view_tos")
      .setLabel("View TOS")
      .setStyle(ButtonStyle.Secondary)
      .setEmoji("📄")
  );
}

function buildPanel2Embed(): EmbedBuilder {
  return new EmbedBuilder()
    .setColor(0x10b981)
    .setTitle("💰  Credits")
    .setDescription(
      "Add credits to unlock higher plans and more inboxes.\n\n" +
        "**Plans:**\n" +
        "🆓  **Free** — 3 inboxes · 100 emails/mo\n" +
        "⚡  **Starter** ($5) — 10 inboxes · 1 000 emails/mo\n" +
        "🚀  **Pro** ($15) — 50 inboxes · 10 000 emails/mo\n" +
        "🏢  **Enterprise** ($50) — Unlimited\n\n" +
        "Contact a staff member or ask the owner to credit your balance.\n" +
        `Use \`${PREFIX}balance\` to check your current balance.`
    )
    .setFooter({ text: "MailDrop · " + WEBSITE_URL })
    .setTimestamp();
}

function buildPanel2Row(): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("check_balance")
      .setLabel("Check My Balance")
      .setStyle(ButtonStyle.Success)
      .setEmoji("💳"),
    new ButtonBuilder()
      .setCustomId("view_plans")
      .setLabel("View Plans")
      .setStyle(ButtonStyle.Secondary)
      .setEmoji("📊")
  );
}

function buildTosRow(): ActionRowBuilder<ButtonBuilder> {
  return new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("accept_tos")
      .setLabel("✅ Accept TOS")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId("decline_tos")
      .setLabel("❌ Decline")
      .setStyle(ButtonStyle.Danger)
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
client.once("ready", async () => {
  console.log(`✅  Logged in as ${client.user!.tag}`);
  await connectDB();
});

// ─────────────────────────────────────────────
//  MESSAGE commands
// ─────────────────────────────────────────────
client.on("messageCreate", async (message: Message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith(PREFIX)) return;

  const args = message.content.slice(PREFIX.length).trim().split(/\s+/);
  const command = args.shift()!.toLowerCase();

  const isOwner = OWNER_IDS.includes(message.author.id) || (message.member?.permissions.has(PermissionFlagsBits.Administrator) ?? false);

  // ── !setup ────────────────────────────────
  if (command === "setup") {
    if (!isOwner) return message.reply("❌ Owner only.");
    if (!message.guild) return;

    const sub = args[0]?.toLowerCase();
    if (!sub || (sub !== "panel1" && sub !== "panel2")) {
      return void message.reply("Usage: `!setup panel1` or `!setup panel2`");
    }

    await connectDB();
    let config = await BotConfigModel.findOne({ guildId: message.guild.id });
    if (!config) config = new BotConfigModel({ guildId: message.guild.id });

    if (sub === "panel1") {
      const embed = buildPanel1Embed();
      const row = buildPanel1Row();
      const sent = await (message.channel as TextChannel).send({ embeds: [embed], components: [row] });
      config.panel1ChannelId = message.channel.id;
      config.panel1MessageId = sent.id;
      await config.save();
      await message.reply("✅ Panel 1 (Account Creation) deployed!");
    } else {
      const embed = buildPanel2Embed();
      const row = buildPanel2Row();
      const sent = await (message.channel as TextChannel).send({ embeds: [embed], components: [row] });
      config.panel2ChannelId = message.channel.id;
      config.panel2MessageId = sent.id;
      await config.save();
      await message.reply("✅ Panel 2 (Credits) deployed!");
    }
    return;
  }

  // ── !setcategory ──────────────────────────
  if (command === "setcategory") {
    if (!isOwner) return message.reply("❌ Owner only.");
    if (!message.guild) return;
    const catId = args[0];
    if (!catId) return void message.reply("Usage: `!setcategory <categoryId>`");
    await connectDB();
    let config = await BotConfigModel.findOne({ guildId: message.guild.id });
    if (!config) config = new BotConfigModel({ guildId: message.guild.id });
    config.ticketCategoryId = catId;
    await config.save();
    return void message.reply(`✅ Ticket category set to \`${catId}\`.`);
  }

  // ── .credit ───────────────────────────────
  if (command === "credit") {
    if (!isOwner) return message.reply("❌ Owner only.");
    const mention = message.mentions.users.first();
    const amount = parseFloat(args[1] ?? "");
    if (!mention || isNaN(amount) || amount <= 0) {
      return void message.reply("Usage: `.credit @user <amount>`");
    }
    await connectDB();
    const user = await UserModel.findOne({ discordId: mention.id });
    if (!user) return void message.reply("❌ That user doesn't have a MailDrop account (no linked Discord ID). Use `.creditbyemail <email> <amount>` instead.");
    const before = user.balance;
    user.balance = before + amount;
    await user.save();
    await TransactionModel.create({ userId: user._id, type: "topup", amount, balanceBefore: before, balanceAfter: user.balance, description: `Admin credit: $${amount}`, performedBy: message.author.tag });

    // DM the user
    try {
      const dmEmbed = new EmbedBuilder()
        .setColor(0x10b981)
        .setTitle("💰 Balance Credited")
        .setDescription(`Your MailDrop balance has been credited **$${amount}**!\n\nNew balance: **$${user.balance.toFixed(2)}**\n\n[Visit Dashboard](${WEBSITE_URL}/dashboard)`)
        .setFooter({ text: "MailDrop · " + WEBSITE_URL })
        .setTimestamp();
      await mention.send({ embeds: [dmEmbed] });
    } catch { /* DMs disabled */ }

    return void message.reply(`✅ Credited **$${amount}** to ${mention.tag}. New balance: **$${user.balance.toFixed(2)}**`);
  }

  // ── .creditbyemail ────────────────────────
  if (command === "creditbyemail") {
    if (!isOwner) return message.reply("❌ Owner only.");
    const email = args[0];
    const amount = parseFloat(args[1] ?? "");
    if (!email || isNaN(amount) || amount <= 0) {
      return void message.reply("Usage: `.creditbyemail <email> <amount>`");
    }
    await connectDB();
    const user = await UserModel.findOne({ email: email.toLowerCase() });
    if (!user) return void message.reply("❌ No account found with that email.");
    const before = user.balance;
    user.balance = before + amount;
    await user.save();
    await TransactionModel.create({ userId: user._id, type: "topup", amount, balanceBefore: before, balanceAfter: user.balance, description: `Admin credit: $${amount}`, performedBy: message.author.tag });
    return void message.reply(`✅ Credited **$${amount}** to \`${email}\`. New balance: **$${user.balance.toFixed(2)}**`);
  }

  // ── .deduct ───────────────────────────────
  if (command === "deduct") {
    if (!isOwner) return message.reply("❌ Owner only.");
    const mention = message.mentions.users.first();
    const amount = parseFloat(args[1] ?? "");
    if (!mention || isNaN(amount) || amount <= 0) {
      return void message.reply("Usage: `.deduct @user <amount>`");
    }
    await connectDB();
    const user = await UserModel.findOne({ discordId: mention.id });
    if (!user) return void message.reply("❌ That user doesn't have a MailDrop account linked.");
    const before = user.balance;
    user.balance = Math.max(0, before - amount);
    const deducted = before - user.balance;
    await user.save();
    await TransactionModel.create({ userId: user._id, type: "deduct", amount: deducted, balanceBefore: before, balanceAfter: user.balance, description: `Admin deduct: $${deducted}`, performedBy: message.author.tag });

    try {
      const dmEmbed = new EmbedBuilder()
        .setColor(0xef4444)
        .setTitle("💸 Balance Deducted")
        .setDescription(`**$${deducted.toFixed(2)}** has been deducted from your MailDrop balance.\n\nNew balance: **$${user.balance.toFixed(2)}**\n\n[Visit Dashboard](${WEBSITE_URL}/dashboard)`)
        .setFooter({ text: "MailDrop · " + WEBSITE_URL })
        .setTimestamp();
      await mention.send({ embeds: [dmEmbed] });
    } catch { /* DMs disabled */ }

    return void message.reply(`✅ Deducted **$${deducted.toFixed(2)}** from ${mention.tag}. New balance: **$${user.balance.toFixed(2)}**`);
  }

  // ── .deductbyemail ────────────────────────
  if (command === "deductbyemail") {
    if (!isOwner) return message.reply("❌ Owner only.");
    const email = args[0];
    const amount = parseFloat(args[1] ?? "");
    if (!email || isNaN(amount) || amount <= 0) {
      return void message.reply("Usage: `.deductbyemail <email> <amount>`");
    }
    await connectDB();
    const user = await UserModel.findOne({ email: email.toLowerCase() });
    if (!user) return void message.reply("❌ No account found with that email.");
    const before = user.balance;
    user.balance = Math.max(0, before - amount);
    const deducted = before - user.balance;
    await user.save();
    await TransactionModel.create({ userId: user._id, type: "deduct", amount: deducted, balanceBefore: before, balanceAfter: user.balance, description: `Admin deduct: $${deducted}`, performedBy: message.author.tag });
    return void message.reply(`✅ Deducted **$${deducted.toFixed(2)}** from \`${email}\`. New balance: **$${user.balance.toFixed(2)}**`);
  }

  // ── .lookup ───────────────────────────────
  if (command === "lookup") {
    if (!isOwner) return message.reply("❌ Owner only.");
    await connectDB();
    let user;
    const mention = message.mentions.users.first();
    if (mention) {
      user = await UserModel.findOne({ discordId: mention.id });
    } else if (args[0]) {
      user = await UserModel.findOne({ email: args[0].toLowerCase() });
    } else {
      return void message.reply("Usage: `.lookup @user` or `.lookup <email>`");
    }
    if (!user) return void message.reply("❌ No MailDrop account found.");
    const txCount = await TransactionModel.countDocuments({ userId: user._id });
    const embed = new EmbedBuilder()
      .setColor(0x7c3aed)
      .setTitle("🔍 Account Lookup")
      .addFields(
        { name: "👤 Username", value: user.username, inline: true },
        { name: "📧 Email", value: user.email, inline: true },
        { name: "💰 Balance", value: `$${user.balance.toFixed(2)}`, inline: true },
        { name: "📋 Plan", value: user.plan, inline: true },
        { name: "📬 Inboxes", value: user.inboxCount.toString(), inline: true },
        { name: "📩 Emails Received", value: user.emailsReceived.toString(), inline: true },
        { name: "🔑 API Key", value: `\`${user.apiKey}\``, inline: false },
        { name: "🏦 Transactions", value: txCount.toString(), inline: true },
        { name: "✅ Active", value: user.isActive ? "Yes" : "No", inline: true },
        { name: "🛡️ Admin", value: user.isAdmin ? "Yes" : "No", inline: true },
        { name: "📅 Joined", value: new Date(user.createdAt).toUTCString(), inline: false },
      )
      .setFooter({ text: "MailDrop · " + WEBSITE_URL })
      .setTimestamp();
    return void message.reply({ embeds: [embed] });
  }

  // ── .balance ──────────────────────────────
  if (command === "balance") {
    await connectDB();
    const target = message.mentions.users.first() ?? message.author;
    const user = await UserModel.findOne({ discordId: target.id });
    if (!user) return void message.reply(`❌ No MailDrop account linked to ${target.tag}.`);
    return void message.reply(`💳 **${user.username}** (${user.email}) — Balance: **$${user.balance.toFixed(2)}** | Plan: **${user.plan}**`);
  }

  // ── !stats ────────────────────────────────
  if (command === "stats") {
    if (!isOwner) return message.reply("❌ Owner only.");
    await connectDB();
    const [users, inboxes, emails, balResult] = await Promise.all([
      UserModel.countDocuments(),
      mongoose.connection.db!.collection("inboxes").countDocuments({ isActive: true }),
      mongoose.connection.db!.collection("emails").countDocuments(),
      UserModel.aggregate([{ $group: { _id: null, total: { $sum: "$balance" } } }]),
    ]);
    const embed = new EmbedBuilder()
      .setColor(0x7c3aed)
      .setTitle("📊 MailDrop Stats")
      .addFields(
        { name: "👥 Users", value: users.toString(), inline: true },
        { name: "📬 Active Inboxes", value: inboxes.toString(), inline: true },
        { name: "📧 Emails Received", value: emails.toString(), inline: true },
        { name: "💰 Total Balance", value: `$${(balResult[0]?.total ?? 0).toFixed(2)}`, inline: true }
      )
      .setFooter({ text: "MailDrop · " + WEBSITE_URL })
      .setTimestamp();
    return void message.reply({ embeds: [embed] });
  }

  // ── !setplan ──────────────────────────────
  if (command === "setplan") {
    if (!isOwner) return message.reply("❌ Owner only.");
    const mention = message.mentions.users.first();
    const plan = args[1]?.toLowerCase();
    const validPlans = ["free", "starter", "pro", "enterprise"];
    if (!mention || !validPlans.includes(plan ?? "")) {
      return void message.reply(`Usage: \`${PREFIX}setplan @user <${validPlans.join("|")}>\``);
    }
    await connectDB();
    const user = await UserModel.findOneAndUpdate({ discordId: mention.id }, { plan }, { new: true });
    if (!user) return void message.reply("❌ No account found.");
    return void message.reply(`✅ Set ${mention.tag}'s plan to **${plan}**.`);
  }

  // ── .help ─────────────────────────────────
  if (command === "help") {
    const embed = new EmbedBuilder()
      .setColor(0x7c3aed)
      .setTitle("🤖 MailDrop Bot Commands")
      .setDescription(`Prefix: \`${PREFIX}\``)
      .addFields(
        { name: "User Commands", value: `\`${PREFIX}balance [@user]\` — Check balance\n\`${PREFIX}help\` — Show this message` },
        {
          name: "Owner Commands",
          value:
            `\`${PREFIX}setup panel1\` — Deploy registration panel\n` +
            `\`${PREFIX}setup panel2\` — Deploy credits panel\n` +
            `\`${PREFIX}setcategory <id>\` — Set ticket category\n` +
            `\`${PREFIX}credit @user <amount>\` — Add credits by Discord user\n` +
            `\`${PREFIX}creditbyemail <email> <amount>\` — Add credits by email\n` +
            `\`${PREFIX}deduct @user <amount>\` — Remove credits by Discord user\n` +
            `\`${PREFIX}deductbyemail <email> <amount>\` — Remove credits by email\n` +
            `\`${PREFIX}lookup @user|<email>\` — Look up account details\n` +
            `\`${PREFIX}setplan @user <plan>\` — Change user plan\n` +
            `\`${PREFIX}stats\` — View statistics`,
        }
      )
      .setFooter({ text: "MailDrop · " + WEBSITE_URL });
    return void message.reply({ embeds: [embed] });
  }
});

// ─────────────────────────────────────────────
//  BUTTON interactions
// ─────────────────────────────────────────────
client.on("interactionCreate", async (interaction) => {
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

    // Prevent duplicate sessions
    if (activeSessions.has(btn.user.id)) {
      await btn.reply({ content: "⚠️ You already have an open registration ticket. Please complete it first.", ephemeral: true });
      return;
    }

    // Check existing account
    await connectDB();
    const existingUser = await UserModel.findOne({ discordId: btn.user.id });
    if (existingUser) {
      await btn.reply({ content: `✅ You already have a MailDrop account!\n📧 Email: \`${existingUser.email}\`\n🌐 Login at ${WEBSITE_URL}`, ephemeral: true });
      return;
    }

    // Show TOS first (ephemeral)
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

    await connectDB();
    const config = await BotConfigModel.findOne({ guildId: btn.guild.id });

    // Create private ticket channel
    let ticketChannel: TextChannel;
    try {
      ticketChannel = await btn.guild.channels.create({
        name: `register-${btn.user.username.toLowerCase().replace(/[^a-z0-9]/g, "")}`,
        type: ChannelType.GuildText,
        parent: config?.ticketCategoryId ?? undefined,
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

    // ── Collect email ────────────────────────
    let email = "";
    const emailCollector: MessageCollector = ticketChannel.createMessageCollector({
      filter: (m: Message) => m.author.id === btn.user.id,
      max: 5,
      time: 5 * 60 * 1000,
    });

    let step: "email" | "password" = "email";
    let collectedEmail = "";
    let collectedPassword = "";

    emailCollector.on("collect", async (msg: Message) => {
      const content = msg.content.trim();

      if (step === "email") {
        if (!isEmail(content)) {
          await ticketChannel.send("⚠️ That doesn't look like a valid email. Please try again:");
          return;
        }
        // Check uniqueness
        const exists = await UserModel.findOne({ email: content.toLowerCase() });
        if (exists) {
          await ticketChannel.send("⚠️ An account with that email already exists. Please use a different email:");
          return;
        }
        collectedEmail = content.toLowerCase();
        step = "password";
        await ticketChannel.send({
          embeds: [
            new EmbedBuilder()
              .setColor(0x7c3aed)
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

        // Delete user's password message immediately
        try { await msg.delete(); } catch { /* ignore */ }

        // ── Create account ──────────────────
        const hashedPassword = await bcrypt.hash(collectedPassword, 12);
        const apiKey = generateApiKey();
        const member = btn.member as GuildMember;
        const newUser = await UserModel.create({
          email: collectedEmail,
          password: hashedPassword,
          username: member?.displayName ?? btn.user.username,
          discordId: btn.user.id,
          avatar: btn.user.displayAvatarURL(),
          apiKey,
          balance: 0,
          plan: "free",
        });

        // ── Send DM ─────────────────────────
        const welcomeEmbed = new EmbedBuilder()
          .setColor(0x7c3aed)
          .setTitle("🎉 Welcome to MailDrop!")
          .setDescription(
            `Your account has been created successfully!\n\n` +
            `**Login at:** ${WEBSITE_URL}\n\n` +
            `📧 **Email:** \`${collectedEmail}\`\n` +
            `🔑 **Your API Key:** \`${apiKey}\`\n` +
            `💰 **Credits:** $${newUser.balance.toFixed(2)}\n` +
            `📋 **Plan:** ${newUser.plan}\n\n` +
            `> 🔒 Keep your credentials safe. Never share them.\n` +
            `> Use \`.credit\` in our server or contact staff to add credits.`
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
              new EmbedBuilder()
                .setColor(0x10b981)
                .setTitle("📋 Your Credentials")
                .setDescription(`📧 **Email:** \`${collectedEmail}\`\n🔑 **API Key:** \`${apiKey}\`\n\n**Login at:** ${WEBSITE_URL}\n\n⚠️ Screenshot this — it will be gone in 5 minutes!`)
            ],
          });
        }

        // ── Confirm in ticket ────────────────
        await ticketChannel.send({
          embeds: [
            new EmbedBuilder()
              .setColor(0x10b981)
              .setTitle("✅ Account Created!")
              .setDescription(`Your account is ready!\n\n📬 Check your DMs for login details.\n🌐 Log in at: ${WEBSITE_URL}\n\n⏰ This ticket will be **deleted in 5 minutes**.`)
              .setFooter({ text: "MailDrop Registration" }),
          ],
        });

        activeSessions.delete(btn.user.id);

        // Delete ticket after 5 minutes
        setTimeout(async () => {
          try { await ticketChannel.delete(); } catch { /* already deleted */ }
        }, 5 * 60 * 1000);
      }
    });

    emailCollector.on("end", async (_collected, reason: string) => {
      if (reason === "done") return;
      // Timed out or max reached without completing
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
    await connectDB();
    const user = await UserModel.findOne({ discordId: btn.user.id });
    if (!user) {
      await btn.reply({ content: `❌ No MailDrop account found. Create one using the registration panel!\n🌐 ${WEBSITE_URL}`, ephemeral: true });
      return;
    }
    await btn.reply({
      embeds: [
        new EmbedBuilder()
          .setColor(0x10b981)
          .setTitle("💳 Your Balance")
          .addFields(
            { name: "Balance", value: `$${user.balance.toFixed(2)}`, inline: true },
            { name: "Plan", value: user.plan, inline: true },
            { name: "Email", value: user.email, inline: true },
            { name: "API Key", value: `\`${user.apiKey}\``, inline: false },
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
        new EmbedBuilder()
          .setColor(0x7c3aed)
          .setTitle("📊 MailDrop Plans")
          .addFields(
            { name: "🆓 Free", value: "3 inboxes · 100 emails/mo · $0", inline: false },
            { name: "⚡ Starter", value: "10 inboxes · 1 000 emails/mo · $5/mo", inline: false },
            { name: "🚀 Pro", value: "50 inboxes · 10 000 emails/mo · $15/mo", inline: false },
            { name: "🏢 Enterprise", value: "Unlimited · $50/mo", inline: false },
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
