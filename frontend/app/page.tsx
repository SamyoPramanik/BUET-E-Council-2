"use client";

import { useState } from "react";
import Header from "../components/Header";
import MeetingTable from "../components/MeetingTable";

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<'academic' | 'syndicate'>('academic');

  // Dummy data
  const meetings = [
    { id: "1", serial: 1, title: `1st ${activeTab === 'academic' ? 'Academic' : 'Syndicate'} Meeting`, date: "Oct 12, 2026" },
    { id: "2", serial: 2, title: `2nd ${activeTab === 'academic' ? 'Academic' : 'Syndicate'} Meeting`, date: "Nov 15, 2026" },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8">
        
        {/* Tabs */}
        <div className="flex space-x-1 mb-8 border-b border-border">
          <button
            onClick={() => setActiveTab('academic')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'academic'
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
            }`}
          >
            Academic Meeting
          </button>
          <button
            onClick={() => setActiveTab('syndicate')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'syndicate'
                ? 'border-primary text-foreground'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
            }`}
          >
            Syndicate Meeting
          </button>
        </div>

        {/* Meeting Table */}
        <MeetingTable meetings={meetings} />

      </main>
    </div>
  );
}
