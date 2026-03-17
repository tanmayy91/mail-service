/**
 * Link model — re-exports from the shared JSON database (src/lib/db.ts).
 * This file replaces the former Email model.
 */
export type { LinkData as ILink } from "@/lib/db";
export {
  findLink,
  findLinkById,
  findLinks,
  createLink,
  updateLink,
  deleteLink,
  countLinks,
  totalClicks,
} from "@/lib/db";
