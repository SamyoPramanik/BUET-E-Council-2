"use client";

import { useState } from "react";
import { Edit3, FileText, FileCheck } from "lucide-react";

export default function ResolutionView({ meeting }: { meeting: any }) {
  // Mock data for UI demonstration
  const [agendas, setAgendas] = useState([
    { 
      id: 1, 
      serial: "Ag-1", 
      content: "<p>Review of previous meeting minutes.</p>",
      resolution: "<p>The previous meeting minutes were read and unanimously approved by all members present.</p>" 
    },
    { 
      id: 2, 
      serial: "Ag-2", 
      content: "<p>Discussion on new faculty appointments for the CSE department.</p>",
      resolution: null // No resolution yet
    }
  ]);

  const [editingId, setEditingId] = useState<number | null>(null);

  return (
    <div className="max-w-4xl pb-32 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Resolutions</h2>
      </div>

      {agendas.map((agenda) => (
        <div key={agenda.id} className="bg-card border border-border rounded-lg p-6 mb-8 shadow-sm">
          
          {/* Top Section (Read-Only Agenda) */}
          <div className="mb-6">
            <h3 className="font-semibold text-sm text-primary uppercase tracking-wider mb-2">{agenda.serial}</h3>
            <div className="text-muted-foreground bg-muted/30 p-4 rounded-md border-l-4 border-muted/50 prose prose-sm dark:prose-invert max-w-none">
              <div dangerouslySetInnerHTML={{ __html: agenda.content }} />
            </div>
          </div>

          {/* Bottom Section (The Resolution) */}
          <div>
            <h4 className="font-semibold text-sm text-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-primary" />
              Resolution Outcome
            </h4>

            {editingId === agenda.id ? (
              <div className="border border-primary/50 rounded-md overflow-hidden ring-4 ring-primary/10">
                <div className="bg-muted border-b border-border p-2 flex items-center gap-2">
                  <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider px-2">Plate Editor Placeholder</span>
                </div>
                <textarea 
                  className="w-full min-h-[150px] p-4 bg-background text-sm focus:outline-none" 
                  defaultValue={agenda.resolution ? agenda.resolution.replace(/<[^>]*>?/gm, '') : ""} 
                  placeholder="Draft the resolution here..."
                />
                <div className="bg-muted p-2 flex justify-end gap-2 border-t border-border">
                  <button onClick={() => setEditingId(null)} className="px-3 py-1 text-xs text-muted-foreground hover:bg-background rounded-md">Cancel</button>
                  <button onClick={() => setEditingId(null)} className="px-3 py-1 text-xs bg-primary text-primary-foreground rounded-md">Save Resolution</button>
                </div>
              </div>
            ) : agenda.resolution ? (
              <div className="relative group">
                <button 
                  onClick={() => setEditingId(agenda.id)}
                  className="absolute top-0 right-0 text-primary opacity-0 group-hover:opacity-100 transition-opacity p-1.5 bg-primary/10 rounded-md hover:bg-primary/20 flex items-center gap-2 text-xs font-medium"
                >
                  <Edit3 className="w-3.5 h-3.5" /> Edit
                </button>
                <div 
                  className="prose prose-sm dark:prose-invert max-w-none text-foreground bg-background border border-border p-5 rounded-md shadow-inner"
                  dangerouslySetInnerHTML={{ __html: agenda.resolution }} 
                />
              </div>
            ) : (
              <div className="flex gap-3">
                <button 
                  onClick={() => setEditingId(agenda.id)}
                  className="bg-background border border-primary text-primary hover:bg-primary/5 shadow-sm py-2 px-4 text-sm font-medium rounded-md flex items-center gap-2 transition-colors"
                >
                  <Edit3 className="w-4 h-4" /> Create Resolution
                </button>
                <button className="bg-background border border-border text-foreground hover:bg-muted shadow-sm py-2 px-4 text-sm font-medium rounded-md flex items-center gap-2 transition-colors">
                  <FileText className="w-4 h-4" /> From Template
                </button>
              </div>
            )}
          </div>
          
        </div>
      ))}
    </div>
  );
}
