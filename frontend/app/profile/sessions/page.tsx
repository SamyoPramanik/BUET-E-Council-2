"use client";

import { useState } from "react";
import { Laptop, Smartphone, Globe } from "lucide-react";

export default function SessionsPage() {
  const [sessions, setSessions] = useState([
    { id: "1", device: "Chrome on Windows 11", ip: "192.168.1.1", lastActive: "Just now", current: true, type: "desktop" },
    { id: "2", device: "Safari on iPhone 14", ip: "10.0.0.45", lastActive: "2 hours ago", current: false, type: "mobile" },
    { id: "3", device: "Firefox on macOS", ip: "172.16.0.8", lastActive: "1 day ago", current: false, type: "desktop" },
  ]);

  const handleRevoke = (id: string) => {
    setSessions(sessions.filter(s => s.id !== id));
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "desktop": return <Laptop className="w-5 h-5 text-muted-foreground" />;
      case "mobile": return <Smartphone className="w-5 h-5 text-muted-foreground" />;
      default: return <Globe className="w-5 h-5 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-foreground tracking-tight">Active Sessions</h2>
          <p className="text-sm text-muted-foreground mt-1">Manage and revoke your active API sessions across devices.</p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-muted text-muted-foreground text-sm border-b border-border">
                <th className="px-6 py-3 font-semibold">Device / Browser</th>
                <th className="px-6 py-3 font-semibold">IP Address</th>
                <th className="px-6 py-3 font-semibold">Last Active</th>
                <th className="px-6 py-3 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sessions.map((session) => (
                <tr key={session.id} className="hover:bg-accent/30 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-muted rounded-md">
                        {getIcon(session.type)}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {session.device} 
                          {session.current && <span className="ml-2 text-xs font-normal text-primary italic">(Current)</span>}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-foreground font-mono">
                    {session.ip}
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">
                    {session.lastActive}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {!session.current ? (
                      <button 
                        onClick={() => handleRevoke(session.id)}
                        className="px-3 py-1 text-xs font-medium border border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground rounded-md transition-colors"
                      >
                        Revoke
                      </button>
                    ) : (
                      <span className="text-xs font-medium text-muted-foreground italic px-3 py-1">Active</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
