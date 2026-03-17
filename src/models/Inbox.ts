/**
 * Inbox model — re-exports from the shared JSON database (src/lib/db.ts).
 */
export type { InboxData as IInbox } from "@/lib/db";
export {
  findInbox,
  findInboxById,
  findInboxes,
  createInbox,
  updateInbox,
  countInboxes,
  deleteEmailsByInbox,
} from "@/lib/db";
