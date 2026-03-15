import { getServerSession } from "next-auth/next";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth/options";

/**
 * Root entry point — all roles land on /dashboard.
 * The dashboard filters what each role can see and do.
 */
export default async function RootPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");
  redirect("/dashboard");
}