import mongoose, { Schema, Document, Model } from "mongoose";

export interface IInbox extends Document {
  userId: mongoose.Types.ObjectId;
  address: string;
  domain: string;
  localPart: string;
  isActive: boolean;
  emailCount: number;
  createdAt: Date;
  expiresAt?: Date;
}

const InboxSchema = new Schema<IInbox>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    address: { type: String, unique: true, required: true, lowercase: true },
    domain: { type: String, required: true, lowercase: true },
    localPart: { type: String, required: true, lowercase: true },
    isActive: { type: Boolean, default: true },
    emailCount: { type: Number, default: 0 },
    expiresAt: { type: Date },
  },
  { timestamps: true }
);

InboxSchema.index({ userId: 1 });
InboxSchema.index({ address: 1 });

const Inbox: Model<IInbox> =
  mongoose.models.Inbox || mongoose.model<IInbox>("Inbox", InboxSchema);

export default Inbox;
