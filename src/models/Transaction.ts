import mongoose, { Schema, Document, Model } from "mongoose";

export interface ITransaction extends Document {
  userId: mongoose.Types.ObjectId;
  type: "topup" | "deduct" | "bonus" | "refund";
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  description: string;
  reference?: string;
  performedBy?: string;
  createdAt: Date;
}

const TransactionSchema = new Schema<ITransaction>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    type: {
      type: String,
      enum: ["topup", "deduct", "bonus", "refund"],
      required: true,
    },
    amount: { type: Number, required: true },
    balanceBefore: { type: Number, required: true },
    balanceAfter: { type: Number, required: true },
    description: { type: String, required: true },
    reference: { type: String },
    performedBy: { type: String },
  },
  { timestamps: true }
);

TransactionSchema.index({ userId: 1, createdAt: -1 });

const Transaction: Model<ITransaction> =
  mongoose.models.Transaction ||
  mongoose.model<ITransaction>("Transaction", TransactionSchema);

export default Transaction;
