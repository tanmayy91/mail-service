/**
 * User model — re-exports from the shared JSON database (src/lib/db.ts).
 * Kept as a module so all existing imports continue to work.
 */
export type { UserData as IUser } from "@/lib/db";
export {
  findUser,
  findUsers,
  createUser,
  saveUser,
  updateUser,
  countUsers,
  totalBalance,
  comparePassword,
} from "@/lib/db";
