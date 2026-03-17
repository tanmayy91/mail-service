import mongoose, { Schema, Document, Model } from "mongoose";

export interface IUser extends Document {
  discordId?: string;
  username: string;
  email?: string;
  avatar?: string;
  discriminator?: string;
  isAdmin: boolean;
  balance: number;
  apiKey: string;
  plan: "free" | "starter" | "pro" | "enterprise";
  inboxCount: number;
  emailsReceived: number;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
  lastLogin: Date;
}

const UserSchema = new Schema<IUser>(
  {
    discordId: { type: String, unique: true, sparse: true },
    username: { type: String, required: true },
    email: { type: String, sparse: true },
    avatar: { type: String },
    discriminator: { type: String },
    isAdmin: { type: Boolean, default: false },
    balance: { type: Number, default: 0, min: 0 },
    apiKey: { type: String, unique: true, required: true },
    plan: {
      type: String,
      enum: ["free", "starter", "pro", "enterprise"],
      default: "free",
    },
    inboxCount: { type: Number, default: 0 },
    emailsReceived: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    lastLogin: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>("User", UserSchema);

export default User;
