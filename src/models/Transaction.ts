/**
 * Transaction model — re-exports from the shared JSON database (src/lib/db.ts).
 */
export type { TransactionData as ITransaction } from "@/lib/db";
export {
  createTransaction,
  findTransactions,
  countTransactions,
} from "@/lib/db";
