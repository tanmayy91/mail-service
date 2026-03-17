import { v4 as uuidv4 } from "uuid";

export function generateApiKey(): string {
  const key = uuidv4().replace(/-/g, "");
  return `ld_${key}`;
}

export function generateSlug(length = 7): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export function timeAgo(date: Date | string): string {
  const now = new Date();
  const then = new Date(date);
  const diff = now.getTime() - then.getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return "just now";
}

export function cn(...classes: (string | undefined | null | boolean)[]): string {
  return classes.filter(Boolean).join(" ");
}

export const PLANS = {
  free: {
    name: "Free",
    linkLimit: 10,
    price: 0,
    color: "#94a3b8",
  },
  starter: {
    name: "Starter",
    linkLimit: 100,
    price: 5,
    color: "#7c3aed",
  },
  pro: {
    name: "Pro",
    linkLimit: 500,
    price: 15,
    color: "#10b981",
  },
  enterprise: {
    name: "Enterprise",
    linkLimit: -1,
    price: 50,
    color: "#f59e0b",
  },
} as const;
