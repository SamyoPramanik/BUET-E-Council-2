"use client";

import { useState } from "react";
import Header from "../../components/Header";
import Sidebar from "../../components/Sidebar";
import SidebarToggleButton from "../../components/SidebarToggleButton";
import useSidebarCollapsed from "../../hooks/useSidebarCollapsed";

export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [menuCollapsed, toggleMenuCollapsed] = useSidebarCollapsed('sidebarCollapsed');

  return (
    <div className="min-h-screen flex flex-col bg-page">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar type="profile" isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} collapsed={menuCollapsed} onCollapse={toggleMenuCollapsed} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-8 bg-page">
          <SidebarToggleButton onClick={() => setSidebarOpen(true)} collapsed={menuCollapsed} onExpand={toggleMenuCollapsed} />
          <div className="max-w-5xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
