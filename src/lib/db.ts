/**
 * Shared JSON file database.
 * Used by both the Next.js website (via process.cwd()/data/db.json)
 * and the Discord bot (same path resolved from the project root).
 *
 * All I/O is synchronous so there are no async races between
 * read-modify-write cycles within a single process.
 *
 * Note: when the Next.js server and the Discord bot run as two separate
 * OS processes concurrently, a write from one process can race with a
 * read-modify-write from the other. For typical single-server deployments
 * where write frequency is low this is acceptable; if you need stronger
 * guarantees consider switching to SQLite (via better-sqlite3) or adding
 * a file-lock library such as proper-lockfile.
 */

import * as fs from "fs";
import * as path from "path";
import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcryptjs";

// ─── Paths ────────────────────────────────────────────────────────────────────

export const DATA_DIR = path.join(process.cwd(), "data");
export const DB_PATH = path.join(DATA_DIR, "db.json");

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UserData {
  _id: string;
  email: string;
  /** bcrypt hash */
  password: string;
  username: string;
  discordId?: string;
  avatar?: string;
  isAdmin: boolean;
  balance: number;
  apiKey: string;
  plan: "none" | "free" | "starter" | "pro" | "enterprise" | "custom";
  inboxCount: number;
  emailsReceived: number;
  isActive: boolean;
  lastLogin: string;
  createdAt: string;
  updatedAt: string;
}

export interface TransactionData {
  _id: string;
  userId: string;
  type: "topup" | "deduct" | "bonus" | "refund";
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  description: string;
  reference?: string;
  performedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InboxData {
  _id: string;
  userId: string;
  address: string;
  domain: string;
  localPart: string;
  isActive: boolean;
  emailCount: number;
  expiresAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AttachmentData {
  filename: string;
  contentType: string;
  size: number;
  content?: string;
}

export interface EmailData {
  _id: string;
  inboxId: string;
  userId: string;
  from: string;
  fromName?: string;
  to: string;
  subject: string;
  text?: string;
  html?: string;
  attachments: AttachmentData[];
  isRead: boolean;
  isStarred: boolean;
  receivedAt: string;
  rawHeaders?: string;
  messageId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BotConfigData {
  guildId: string;
  panel1ChannelId?: string;
  panel2ChannelId?: string;
  ticketCategoryId?: string;
  panel1MessageId?: string;
  panel2MessageId?: string;
}

export interface DB {
  users: UserData[];
  transactions: TransactionData[];
  inboxes: InboxData[];
  emails: EmailData[];
  botConfigs: BotConfigData[];
}

// ─── I/O ──────────────────────────────────────────────────────────────────────

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

export function readDB(): DB {
  ensureDataDir();
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

export function writeDB(db: DB): void {
  ensureDataDir();
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), "utf-8");
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function newId(): string {
  return uuidv4();
}

// ─── Users ────────────────────────────────────────────────────────────────────

export function findUser(query: Partial<UserData>): UserData | undefined {
  const db = readDB();
  const entries = Object.entries(query) as [keyof UserData, unknown][];
  return db.users.find(u => entries.every(([k, v]) => u[k] === v));
}

export function findUsers(query: Partial<UserData> = {}): UserData[] {
  const db = readDB();
  const entries = Object.entries(query) as [keyof UserData, unknown][];
  if (entries.length === 0) return db.users;
  return db.users.filter(u => entries.every(([k, v]) => u[k] === v));
}

export function createUser(
  data: Omit<UserData, "_id" | "createdAt" | "updatedAt">
): UserData {
  const db = readDB();
  const now = new Date().toISOString();
  const user: UserData = { ...data, _id: newId(), createdAt: now, updatedAt: now };
  db.users.push(user);
  writeDB(db);
  return user;
}

export function saveUser(user: UserData): UserData {
  const db = readDB();
  const idx = db.users.findIndex(u => u._id === user._id);
  const updated = { ...user, updatedAt: new Date().toISOString() };
  if (idx >= 0) {
    db.users[idx] = updated;
  } else {
    db.users.push(updated);
  }
  writeDB(db);
  return updated;
}

export function updateUser(
  id: string,
  update: Partial<UserData>
): UserData | undefined {
  const db = readDB();
  const idx = db.users.findIndex(u => u._id === id);
  if (idx < 0) return undefined;
  db.users[idx] = { ...db.users[idx], ...update, updatedAt: new Date().toISOString() };
  writeDB(db);
  return db.users[idx];
}

export function countUsers(query: Partial<UserData> = {}): number {
  return findUsers(query).length;
}

export function totalBalance(): number {
  return readDB().users.reduce((sum, u) => sum + u.balance, 0);
}

export async function comparePassword(
  user: UserData,
  candidate: string
): Promise<boolean> {
  return bcrypt.compare(candidate, user.password);
}

// ─── Transactions ─────────────────────────────────────────────────────────────

export function createTransaction(
  data: Omit<TransactionData, "_id" | "createdAt" | "updatedAt">
): TransactionData {
  const db = readDB();
  const now = new Date().toISOString();
  const tx: TransactionData = { ...data, _id: newId(), createdAt: now, updatedAt: now };
  db.transactions.push(tx);
  writeDB(db);
  return tx;
}

export function findTransactions(
  query: Partial<TransactionData> = {}
): TransactionData[] {
  const db = readDB();
  const entries = Object.entries(query) as [keyof TransactionData, unknown][];
  if (entries.length === 0) return db.transactions;
  return db.transactions.filter(t => entries.every(([k, v]) => t[k] === v));
}

export function countTransactions(userId: string): number {
  return findTransactions({ userId }).length;
}

// ─── Inboxes ──────────────────────────────────────────────────────────────────

export function findInbox(query: Partial<InboxData>): InboxData | undefined {
  const db = readDB();
  const entries = Object.entries(query) as [keyof InboxData, unknown][];
  return db.inboxes.find(i => entries.every(([k, v]) => i[k] === v));
}

export function findInboxById(id: string): InboxData | undefined {
  return readDB().inboxes.find(i => i._id === id);
}

export function findInboxes(query: Partial<InboxData> = {}): InboxData[] {
  const db = readDB();
  const entries = Object.entries(query) as [keyof InboxData, unknown][];
  if (entries.length === 0) return db.inboxes;
  return db.inboxes.filter(i => entries.every(([k, v]) => i[k] === v));
}

export function createInbox(
  data: Omit<InboxData, "_id" | "createdAt" | "updatedAt">
): InboxData {
  const db = readDB();
  const now = new Date().toISOString();
  const inbox: InboxData = { ...data, _id: newId(), createdAt: now, updatedAt: now };
  db.inboxes.push(inbox);
  writeDB(db);
  return inbox;
}

export function updateInbox(
  id: string,
  update: Partial<InboxData>
): InboxData | undefined {
  const db = readDB();
  const idx = db.inboxes.findIndex(i => i._id === id);
  if (idx < 0) return undefined;
  db.inboxes[idx] = { ...db.inboxes[idx], ...update, updatedAt: new Date().toISOString() };
  writeDB(db);
  return db.inboxes[idx];
}

export function countInboxes(query: Partial<InboxData> = {}): number {
  return findInboxes(query).length;
}

export function deleteEmailsByInbox(inboxId: string): void {
  const db = readDB();
  db.emails = db.emails.filter(e => e.inboxId !== inboxId);
  writeDB(db);
}

// ─── Emails ───────────────────────────────────────────────────────────────────

export function findEmailById(id: string): EmailData | undefined {
  return readDB().emails.find(e => e._id === id);
}

export function findEmails(query: Partial<EmailData> = {}): EmailData[] {
  const db = readDB();
  const entries = Object.entries(query) as [keyof EmailData, unknown][];
  if (entries.length === 0) return db.emails;
  return db.emails.filter(e => entries.every(([k, v]) => e[k] === v));
}

export function createEmail(
  data: Omit<EmailData, "_id" | "createdAt" | "updatedAt">
): EmailData {
  const db = readDB();
  const now = new Date().toISOString();
  const email: EmailData = { ...data, _id: newId(), createdAt: now, updatedAt: now };
  db.emails.push(email);
  writeDB(db);
  return email;
}

export function updateEmail(
  id: string,
  update: Partial<EmailData>
): EmailData | undefined {
  const db = readDB();
  const idx = db.emails.findIndex(e => e._id === id);
  if (idx < 0) return undefined;
  db.emails[idx] = { ...db.emails[idx], ...update, updatedAt: new Date().toISOString() };
  writeDB(db);
  return db.emails[idx];
}

export function deleteEmail(id: string): EmailData | undefined {
  const db = readDB();
  const idx = db.emails.findIndex(e => e._id === id);
  if (idx < 0) return undefined;
  const [deleted] = db.emails.splice(idx, 1);
  writeDB(db);
  return deleted;
}

export function countEmails(query: Partial<EmailData> = {}): number {
  return findEmails(query).length;
}

// ─── BotConfig ────────────────────────────────────────────────────────────────

export function findBotConfig(guildId: string): BotConfigData {
  return readDB().botConfigs.find(c => c.guildId === guildId) ?? { guildId };
}

export function saveBotConfig(config: BotConfigData): void {
  const db = readDB();
  const idx = db.botConfigs.findIndex(c => c.guildId === config.guildId);
  if (idx >= 0) {
    db.botConfigs[idx] = config;
  } else {
    db.botConfigs.push(config);
  }
  writeDB(db);
}
