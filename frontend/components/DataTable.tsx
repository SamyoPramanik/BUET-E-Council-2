"use client";

import { useState, useRef } from 'react';
import { GripVertical, Pencil, Trash2, Upload, Download } from 'lucide-react';

interface Column {
  key: string;
  label: string;
}

interface DataTableProps {
  columns: Column[];
  data: any[];
  title: string;
  onReorder?: (newOrder: any[]) => void;
  onUploadCsv?: (file: File) => void;
  onDownloadCsv?: () => void;
  onAdd?: () => void;
  onEdit?: (row: any) => void;
  onDelete?: (row: any) => void;
}

export default function DataTable({ 
  columns, 
  data: initialData, 
  title,
  onReorder,
  onUploadCsv,
  onDownloadCsv,
  onAdd,
  onEdit,
  onDelete
}: DataTableProps) {
  const [data, setData] = useState(initialData);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Update local state when initialData changes (from SWR)
  // We use a simple effect here just in case, though ideally SWR handles it better if we pass it down
  // For simplicity, we just sync them if initialData changes length or items.
  if (data.length !== initialData.length) {
      setData(initialData);
  }

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

    if (onReorder) {
      // Re-calculate serials (assuming 1-indexed based on array position)
      const reorderedItems = newData.map((item, index) => ({
        id: item.id,
        serial: index + 1
      }));
      onReorder(reorderedItems);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && onUploadCsv) {
      onUploadCsv(file);
    }
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold text-foreground tracking-tight">{title}</h2>
        
        <div className="flex space-x-2">
          {onDownloadCsv && (
            <button onClick={onDownloadCsv} className="flex items-center bg-accent text-accent-foreground px-4 py-2 rounded-md hover:opacity-90 font-medium text-sm transition-opacity shadow-sm">
              <Download className="w-4 h-4 mr-2" />
              Download CSV
            </button>
          )}
          
          {onUploadCsv && (
            <>
              <input type="file" accept=".csv" className="hidden" ref={fileInputRef} onChange={handleFileChange} />
              <button onClick={() => fileInputRef.current?.click()} className="flex items-center bg-secondary text-secondary-foreground px-4 py-2 rounded-md hover:opacity-90 font-medium text-sm transition-opacity shadow-sm">
                <Upload className="w-4 h-4 mr-2" />
                Upload CSV
              </button>
            </>
          )}

          <button onClick={onAdd} className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:opacity-90 font-medium text-sm transition-opacity shadow-sm">
            Add New
          </button>
        </div>
      </div>

      <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-muted text-muted-foreground text-sm border-b border-border">
                {onReorder && <th className="px-4 py-3 w-12 text-center"></th>}
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
                  draggable={!!onReorder}
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragEnd={handleDragEnd}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, index)}
                  className="hover:bg-accent/50 transition-colors bg-card"
                >
                  {onReorder && (
                    <td className="px-4 py-4 cursor-grab active:cursor-grabbing text-muted-foreground flex items-center justify-center">
                      <GripVertical className="w-4 h-4 opacity-50 hover:opacity-100" />
                    </td>
                  )}
                  
                  {columns.map(col => (
                    <td key={col.key} className="px-6 py-4 text-sm text-foreground">
                      {row[col.key]}
                    </td>
                  ))}
                  
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end space-x-2">
                      <button 
                        onClick={() => onEdit && onEdit(row)}
                        className="p-1 text-muted-foreground hover:text-primary transition-colors"
                        title="Edit"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => onDelete && onDelete(row)}
                        className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              
              {data.length === 0 && (
                <tr>
                  <td colSpan={columns.length + (onReorder ? 2 : 1)} className="px-6 py-8 text-center text-muted-foreground">
                    No data found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
