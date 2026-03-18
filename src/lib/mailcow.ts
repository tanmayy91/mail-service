/**
 * Mailcow API client.
 *
 * Wraps the Mailcow REST API (https://mailcow.email/docs/) used to provision
 * email aliases, domains, and mailboxes on the self-hosted Mailcow instance.
 *
 * All functions return `null` / `[]` / `false` when Mailcow is not configured
 * so the rest of the app degrades gracefully.
 *
 * Environment variables:
 *   MAILCOW_URL   – base URL, e.g. "https://mail.example.com"
 *   MAILCOW_API_KEY – API key from Mailcow → Configuration → Access → API
 */

const MAILCOW_URL = process.env.MAILCOW_URL?.replace(/\/$/, "");
const MAILCOW_API_KEY = process.env.MAILCOW_API_KEY;

export function isMailcowConfigured(): boolean {
  return Boolean(MAILCOW_URL && MAILCOW_API_KEY);
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

async function mcFetch(
  method: string,
  path: string,
  body?: unknown
): Promise<{ ok: boolean; status: number; data: unknown }> {
  if (!isMailcowConfigured()) {
    return { ok: false, status: 503, data: { error: "Mailcow not configured" } };
  }
  try {
    const res = await fetch(`${MAILCOW_URL}/api/v1/${path}`, {
      method,
      headers: {
        "X-API-Key": MAILCOW_API_KEY!,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      // Allow self-signed certs on private Mailcow instances
      // (Next.js runs in Node, so we need the env flag NODE_TLS_REJECT_UNAUTHORIZED=0
      //  for truly self-signed setups — document this in README but don't change globally here)
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    return { ok: false, status: 0, data: { error: String(err) } };
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MailcowAlias {
  id: number;
  address: string;
  goto: string;
  active: boolean;
  created: string;
  modified: string | null;
}

export interface MailcowDomain {
  domain_name: string;
  description: string;
  aliases: number;
  mailboxes: number;
  max_aliases: number;
  max_mailboxes: number;
  active: boolean;
  created: string;
  modified: string | null;
}

export interface MailcowMailbox {
  username: string;
  name: string;
  domain: string;
  quota: number;
  messages: number;
  active: boolean;
  created: string;
  modified: string | null;
}

export interface MailcowServerInfo {
  version: string;
  hostname: string;
}

// ─── Server info ─────────────────────────────────────────────────────────────

/** Returns basic Mailcow server info, or null if unavailable. */
export async function getMailcowServerInfo(): Promise<MailcowServerInfo | null> {
  const { ok, data } = await mcFetch("GET", "get/status/version");
  if (!ok) return null;
  const d = data as Record<string, unknown>;
  return {
    version: (d.version as string) ?? "unknown",
    hostname: MAILCOW_URL ?? "",
  };
}

// ─── Aliases ──────────────────────────────────────────────────────────────────

/** Lists all aliases. */
export async function getAliases(): Promise<MailcowAlias[]> {
  const { ok, data } = await mcFetch("GET", "get/alias/all");
  if (!ok || !Array.isArray(data)) return [];
  return data as MailcowAlias[];
}

/**
 * Creates a catch-all alias that routes `address` to the catch-all mailbox
 * (IMAP_USER) so the existing IMAP service picks it up.
 *
 * Returns the created alias object, or null on failure.
 */
export async function createAlias(
  address: string,
  goto?: string
): Promise<MailcowAlias | null> {
  const catchAll = process.env.IMAP_USER || `catchall@${process.env.MAIL_DOMAIN}`;
  const { ok, data } = await mcFetch("POST", "add/alias", {
    address,
    goto: goto ?? catchAll,
    active: "1",
  });
  if (!ok) return null;
  const arr = Array.isArray(data) ? data : [data];
  return (arr[0] as MailcowAlias) ?? null;
}

/**
 * Deletes an alias by its email address.
 * Looks up the alias ID first, then issues a delete.
 * Returns true on success.
 */
export async function deleteAlias(address: string): Promise<boolean> {
  // Mailcow delete requires numeric IDs
  const aliases = await getAliases();
  const alias = aliases.find((a) => a.address === address);
  if (!alias) return false;
  const { ok } = await mcFetch("POST", "delete/alias", [alias.id]);
  return ok;
}

// ─── Domains ─────────────────────────────────────────────────────────────────

/** Lists all domains. */
export async function getDomains(): Promise<MailcowDomain[]> {
  const { ok, data } = await mcFetch("GET", "get/domain/all");
  if (!ok || !Array.isArray(data)) return [];
  return data as MailcowDomain[];
}

/** Creates a new domain. Returns true on success. */
export async function createDomain(
  domainName: string,
  opts: {
    description?: string;
    maxAliases?: number;
    maxMailboxes?: number;
    maxQuota?: number;
  } = {}
): Promise<boolean> {
  const { ok } = await mcFetch("POST", "add/domain", {
    domain: domainName,
    description: opts.description ?? "",
    aliases: opts.maxAliases ?? 400,
    mailboxes: opts.maxMailboxes ?? 10,
    maxquota: opts.maxQuota ?? 10240,
    quota: opts.maxQuota ?? 10240,
    active: "1",
  });
  return ok;
}

/** Deletes a domain. Returns true on success. */
export async function deleteDomain(domainName: string): Promise<boolean> {
  const { ok } = await mcFetch("POST", "delete/domain", [domainName]);
  return ok;
}

// ─── Mailboxes ────────────────────────────────────────────────────────────────

/** Lists all mailboxes. */
export async function getMailboxes(): Promise<MailcowMailbox[]> {
  const { ok, data } = await mcFetch("GET", "get/mailbox/all");
  if (!ok || !Array.isArray(data)) return [];
  return data as MailcowMailbox[];
}

/**
 * Creates a mailbox.
 * `local_part` is the part before the `@`.
 */
export async function createMailbox(opts: {
  localPart: string;
  domain: string;
  name: string;
  password: string;
  quotaMb?: number;
}): Promise<boolean> {
  const { ok } = await mcFetch("POST", "add/mailbox", {
    local_part: opts.localPart,
    domain: opts.domain,
    name: opts.name,
    password: opts.password,
    password2: opts.password,
    quota: opts.quotaMb ?? 1024,
    active: "1",
  });
  return ok;
}

/** Deletes a mailbox. `address` is the full email. Returns true on success. */
export async function deleteMailbox(address: string): Promise<boolean> {
  const { ok } = await mcFetch("POST", "delete/mailbox", [address]);
  return ok;
}
