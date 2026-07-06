"use client";

import { usePathname, useRouter } from "next/navigation";
import Sidebar from "./Sidebar";
import { useAuth } from "../hooks/useAuth";
import { useEffect } from "react";

export default function AdminLayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const { role, error, isLoading } = useAuth();

  useEffect(() => {
    if (error) {
      router.push('/login');
    }
  }, [error, router]);

  if (isLoading || !role) {
    return <div className="flex flex-1 items-center justify-center min-h-screen">Loading...</div>;
  }

  // Check if we are inside a specific meeting's workspace
  // Matches /admin/meetings/uuid or any other ID, but NOT /admin/meetings directly.
  const isMeetingWorkspace = /^\/admin\/meetings\/[^\/]+$/.test(pathname || "");

  if (isMeetingWorkspace) {
    return (
      <div className="flex flex-1 overflow-hidden">
        {children}
      </div>
    );
  }

  // Standard Admin Layout
  return (
    <div className="flex flex-1 overflow-hidden">
      <Sidebar type="admin" role={role} />
      <main className="flex-1 overflow-y-auto p-8 bg-background">
        {children}
      </main>
    </div>
  );
}
