"use client";

import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";

export default function AdminLayoutWrapper({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
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
      <Sidebar type="admin" />
      <main className="flex-1 overflow-y-auto p-8 bg-background">
        {children}
      </main>
    </div>
  );
}
