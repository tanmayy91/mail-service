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
  linkCount: number;
  totalClicks: number;
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

export interface LinkData {
  _id: string;
  userId: string;
  slug: string;
  url: string;
  title?: string;
  clicks: number;
  isActive: boolean;
  expiresAt?: string;
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
  links: LinkData[];
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
      links:        data.links        ?? [],
      botConfigs:   data.botConfigs   ?? [],
    };
  } catch {
    return { users: [], transactions: [], links: [], botConfigs: [] };
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

// ─── Links ────────────────────────────────────────────────────────────────────

export function findLink(query: Partial<LinkData>): LinkData | undefined {
  const db = readDB();
  const entries = Object.entries(query) as [keyof LinkData, unknown][];
  return db.links.find(l => entries.every(([k, v]) => l[k] === v));
}

export function findLinkById(id: string): LinkData | undefined {
  return readDB().links.find(l => l._id === id);
}

export function findLinks(query: Partial<LinkData> = {}): LinkData[] {
  const db = readDB();
  const entries = Object.entries(query) as [keyof LinkData, unknown][];
  if (entries.length === 0) return db.links;
  return db.links.filter(l => entries.every(([k, v]) => l[k] === v));
}

export function createLink(
  data: Omit<LinkData, "_id" | "createdAt" | "updatedAt">
): LinkData {
  const db = readDB();
  const now = new Date().toISOString();
  const link: LinkData = { ...data, _id: newId(), createdAt: now, updatedAt: now };
  db.links.push(link);
  writeDB(db);
  return link;
}

export function updateLink(
  id: string,
  update: Partial<LinkData>
): LinkData | undefined {
  const db = readDB();
  const idx = db.links.findIndex(l => l._id === id);
  if (idx < 0) return undefined;
  db.links[idx] = { ...db.links[idx], ...update, updatedAt: new Date().toISOString() };
  writeDB(db);
  return db.links[idx];
}

export function deleteLink(id: string): LinkData | undefined {
  const db = readDB();
  const idx = db.links.findIndex(l => l._id === id);
  if (idx < 0) return undefined;
  const [deleted] = db.links.splice(idx, 1);
  writeDB(db);
  return deleted;
}

export function countLinks(query: Partial<LinkData> = {}): number {
  return findLinks(query).length;
}

export function totalClicks(query: Partial<LinkData> = {}): number {
  return findLinks(query).reduce((sum, l) => sum + l.clicks, 0);
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
