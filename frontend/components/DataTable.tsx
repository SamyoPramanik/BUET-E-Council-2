"use client";

import { useState } from 'react';
import { GripVertical, Pencil, Trash2 } from 'lucide-react';

interface Column {
  key: string;
  label: string;
}

interface DataTableProps {
  columns: Column[];
  data: any[];
  title: string;
}

export default function DataTable({ columns, data: initialData, title }: DataTableProps) {
  const [data, setData] = useState(initialData);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState<any>(null);

  // Note: For a robust drag-and-drop, libraries like @dnd-kit/core are recommended.
  // This is a basic HTML5 implementation for the drag indicator visual.
  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.setData('text/plain', index.toString());
    e.currentTarget.classList.add('opacity-50');
  };

  const handleDragEnd = (e: React.DragEvent) => {
    e.currentTarget.classList.remove('opacity-50');
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    const sourceIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
    
    if (sourceIndex === targetIndex) return;

    const newData = [...data];
    const [movedItem] = newData.splice(sourceIndex, 1);
    newData.splice(targetIndex, 0, movedItem);
    
    setData(newData);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-foreground tracking-tight">{title}</h2>
        <button className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:opacity-90 font-medium text-sm transition-opacity shadow-sm">
          Add New
        </button>
      </div>

      <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-muted text-muted-foreground text-sm border-b border-border">
                <th className="px-4 py-3 w-12 text-center"></th>
                {columns.map(col => (
                  <th key={col.key} className="px-6 py-3 font-semibold">{col.label}</th>
                ))}
                <th className="px-6 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data.map((row, index) => (
                <tr 
                  key={row.id || index}
                  draggable
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragEnd={handleDragEnd}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, index)}
                  className="hover:bg-accent/50 transition-colors bg-card"
                >
                  <td className="px-4 py-4 cursor-grab active:cursor-grabbing text-muted-foreground flex items-center justify-center">
                    <GripVertical className="w-4 h-4 opacity-50 hover:opacity-100" />
                  </td>
                  
                  {columns.map(col => (
                    <td key={col.key} className="px-6 py-4 text-sm text-foreground">
                      {row[col.key]}
                    </td>
                  ))}
                  
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end space-x-2">
                      <button 
                        onClick={() => { setSelectedRow(row); setIsEditModalOpen(true); }}
                        className="p-1 text-muted-foreground hover:text-primary transition-colors"
                        title="Edit"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => { setSelectedRow(row); setIsDeleteModalOpen(true); }}
                        className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Modal Placeholder */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-md rounded-lg shadow-lg border border-border p-6 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-lg font-semibold mb-4 text-foreground">Edit Record</h3>
            <div className="space-y-4 mb-6">
              {/* Dummy fields based on columns */}
              {columns.map(col => (
                <div key={col.key}>
                  <label className="block text-sm font-medium text-foreground mb-1">{col.label}</label>
                  <input type="text" defaultValue={selectedRow?.[col.key]} className="w-full px-3 py-2 bg-input/20 border border-input rounded-md text-sm text-foreground focus:ring-2 focus:ring-ring focus:outline-none" />
                </div>
              ))}
            </div>
            <div className="flex justify-end space-x-2">
              <button onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 text-sm font-medium bg-muted text-muted-foreground hover:bg-muted/80 rounded-md transition-colors">
                Cancel
              </button>
              <button onClick={() => setIsEditModalOpen(false)} className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground hover:opacity-90 rounded-md transition-colors">
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Dialog Placeholder */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-card w-full max-w-sm rounded-lg shadow-lg border border-destructive/50 p-6 animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-lg font-semibold text-destructive mb-2">Delete Record</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Are you sure you want to delete this record? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-2">
              <button onClick={() => setIsDeleteModalOpen(false)} className="px-4 py-2 text-sm font-medium bg-muted text-muted-foreground hover:bg-muted/80 rounded-md transition-colors">
                Cancel
              </button>
              <button onClick={() => {
                setData(data.filter(d => d.id !== selectedRow?.id));
                setIsDeleteModalOpen(false);
              }} className="px-4 py-2 text-sm font-medium bg-destructive text-destructive-foreground hover:opacity-90 rounded-md transition-colors">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
