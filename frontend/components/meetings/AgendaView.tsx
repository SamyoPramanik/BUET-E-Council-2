"use client";

import { useState } from "react";
import { Edit3, Plus, FileText, GripVertical } from "lucide-react";

export default function AgendaView({ meeting, type }: { meeting: any, type: string }) {
  // This will be replaced with actual API data
  const [agendas, setAgendas] = useState([
    { id: 1, serial: "Ag-1", content: "<p>Review of previous meeting minutes.</p>" },
    { id: 2, serial: "Ag-2", content: "<p>Discussion on new faculty appointments.</p>" },
    { id: 3, serial: "Ag-3", content: "<p>Approval of budget for the upcoming semester.</p>" }
  ]);

  const [editingId, setEditingId] = useState<number | null>(null);

  const title = type === 'suppli-agenda' ? 'Supplementary Agenda' : 'Agenda Items';

  return (
    <div className="flex gap-8 h-full animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Main Left Area (70%) */}
      <div className="flex-1 w-[70%] max-w-4xl pb-32">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">{title}</h2>
        </div>

        {agendas.map((agenda, index) => (
          <div key={agenda.id}>
            {/* Agenda Card */}
            <div className="bg-card border border-border p-6 rounded-lg relative group shadow-sm hover:shadow-md transition-shadow">
              <div className="flex justify-between items-start mb-4">
                <h3 className="font-semibold text-lg text-primary">{agenda.serial}</h3>
                <button 
                  onClick={() => setEditingId(agenda.id)}
                  className="text-primary opacity-0 group-hover:opacity-100 transition-opacity p-1 bg-primary/10 rounded-md hover:bg-primary/20"
                  title="Edit Agenda"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
              </div>
              
              {editingId === agenda.id ? (
                <div className="border border-border rounded-md overflow-hidden">
                  <div className="bg-muted border-b border-border p-2 flex items-center gap-2">
                    <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider px-2">Plate Editor Placeholder</span>
                  </div>
                  <textarea 
                    className="w-full min-h-[150px] p-4 bg-background text-sm focus:outline-none" 
                    defaultValue={agenda.content.replace(/<[^>]*>?/gm, '')} // naive strip for demo
                  />
                  <div className="bg-muted p-2 flex justify-end gap-2 border-t border-border">
                    <button onClick={() => setEditingId(null)} className="px-3 py-1 text-xs text-muted-foreground hover:bg-background rounded-md">Cancel</button>
                    <button onClick={() => setEditingId(null)} className="px-3 py-1 text-xs bg-primary text-primary-foreground rounded-md">Save</button>
                  </div>
                </div>
              ) : (
                <div 
                  className="prose prose-sm dark:prose-invert max-w-none text-foreground"
                  dangerouslySetInnerHTML={{ __html: agenda.content }} 
                />
              )}
            </div>

            {/* Insertion Strip (UX Magic) */}
            <div className="h-10 my-2 relative group flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity cursor-pointer">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t-2 border-dashed border-primary/30"></div>
              </div>
              <div className="relative flex gap-3">
                <button className="bg-accent text-accent-foreground border border-border shadow-sm py-1.5 px-4 text-xs font-medium rounded-full flex items-center gap-2 hover:bg-accent/80 transition-colors">
                  <Plus className="w-3 h-3" /> Create Agenda
                </button>
                <button className="bg-accent text-accent-foreground border border-border shadow-sm py-1.5 px-4 text-xs font-medium rounded-full flex items-center gap-2 hover:bg-accent/80 transition-colors">
                  <FileText className="w-3 h-3" /> From Template
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Right Sticky Panel (Reordering) - 30% */}
      <div className="w-[30%] shrink-0">
        <div className="bg-sidebar/50 border border-border rounded-lg p-5 sticky top-8 max-h-[80vh] overflow-y-auto shadow-sm backdrop-blur-sm">
          <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-4">Reorder Sequence</h3>
          
          <div className="space-y-2">
            {agendas.map(agenda => (
              <div 
                key={agenda.id} 
                className="bg-card border border-border p-3 rounded-md flex items-center gap-3 cursor-grab hover:border-primary/50 transition-colors group shadow-sm"
              >
                <GripVertical className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                <span className="font-medium text-sm">{agenda.serial}</span>
                <span className="text-xs text-muted-foreground truncate flex-1 opacity-60">
                  {agenda.content.replace(/<[^>]*>?/gm, '').substring(0, 20)}...
                </span>
              </div>
            ))}
          </div>
          
          <p className="text-xs text-muted-foreground mt-6 text-center italic">
            Drag and drop items to reorder the sequence in real-time.
          </p>
        </div>
      </div>

    </div>
  );
}
