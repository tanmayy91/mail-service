import mongoose, { Schema, Document, Model } from "mongoose";

export interface IAttachment {
  filename: string;
  contentType: string;
  size: number;
  content?: string;
}

export interface IEmail extends Document {
  inboxId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  from: string;
  fromName?: string;
  to: string;
  subject: string;
  text?: string;
  html?: string;
  attachments: IAttachment[];
  isRead: boolean;
  isStarred: boolean;
  receivedAt: Date;
  rawHeaders?: string;
  messageId?: string;
  createdAt: Date;
}

const AttachmentSchema = new Schema<IAttachment>({
  filename: String,
  contentType: String,
  size: Number,
  content: String,
});

const EmailSchema = new Schema<IEmail>(
  {
    inboxId: { type: Schema.Types.ObjectId, ref: "Inbox", required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    from: { type: String, required: true },
    fromName: { type: String },
    to: { type: String, required: true },
    subject: { type: String, default: "(no subject)" },
    text: { type: String },
    html: { type: String },
    attachments: [AttachmentSchema],
    isRead: { type: Boolean, default: false },
    isStarred: { type: Boolean, default: false },
    receivedAt: { type: Date, default: Date.now },
    rawHeaders: { type: String },
    messageId: { type: String, sparse: true },
  },
  { timestamps: true }
);

EmailSchema.index({ inboxId: 1, receivedAt: -1 });
EmailSchema.index({ userId: 1, receivedAt: -1 });

const Email: Model<IEmail> =
  mongoose.models.Email || mongoose.model<IEmail>("Email", EmailSchema);

export default Email;
