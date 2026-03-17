/**
 * Email model — re-exports from the shared JSON database (src/lib/db.ts).
 */
export type { EmailData as IEmail, AttachmentData as IAttachment } from "@/lib/db";
export {
  findEmailById,
  findEmails,
  createEmail,
  updateEmail,
  deleteEmail,
  countEmails,
} from "@/lib/db";
