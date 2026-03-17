import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      isAdmin?: boolean;
      balance?: number;
      apiKey?: string;
      plan?: string;
    };
  }
  interface User {
    isAdmin?: boolean;
  }
}
