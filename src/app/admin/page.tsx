import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import AdminClient from "@/components/admin/AdminClient";

export default async function AdminPage() {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    redirect("/login");
  }
  return <AdminClient />;
}
