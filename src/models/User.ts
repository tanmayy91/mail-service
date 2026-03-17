import mongoose, { Schema, Document, Model } from "mongoose";
import bcrypt from "bcryptjs";

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  email: string;
  password: string;
  username: string;
  discordId?: string;
  avatar?: string;
  isAdmin: boolean;
  balance: number;
  apiKey: string;
  plan: "free" | "starter" | "pro" | "enterprise";
  inboxCount: number;
  emailsReceived: number;
  isActive: boolean;
  lastLogin: Date;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidate: string): Promise<boolean>;
}

const UserSchema = new Schema<IUser>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },
    username: { type: String, required: true },
    discordId: { type: String, sparse: true },
    avatar: { type: String },
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

UserSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 12);
});

UserSchema.methods.comparePassword = async function (candidate: string): Promise<boolean> {
  return bcrypt.compare(candidate, this.password);
};

const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>("User", UserSchema);

export default User;
