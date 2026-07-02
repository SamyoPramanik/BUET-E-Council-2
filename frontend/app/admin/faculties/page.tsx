"use client";

import useSWR from "swr";
import { fetcher } from "../../../lib/api";
import api from "../../../lib/api";
import DataTable from "../../../components/DataTable";

export default function ManageFacultiesPage() {
  const { data: response, error, mutate } = useSWR('/faculties', fetcher);
  
  const columns = [
    { key: "serial", label: "Serial No" },
    { key: "name_bangla", label: "Name (Bangla)" },
    { key: "name_english", label: "Name (English)" },
  ];

  const handleReorder = async (newOrder: any[]) => {
    try {
      await api.put('/faculties/reorder', { items: newOrder });
      mutate();
    } catch (err) {
      console.error(err);
      alert('Failed to reorder faculties');
    }
  };

  const handleUploadCsv = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    try {
      await api.post('/faculties/upload-csv', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      mutate();
      alert('CSV uploaded successfully!');
    } catch (err) {
      console.error(err);
      alert('Failed to upload CSV');
    }
  };

  const handleDownloadCsv = () => {
    window.location.href = `${api.defaults.baseURL}/faculties/download-csv`;
  };

  if (error) return <div className="p-8">Failed to load faculties</div>;
  if (!response) return <div className="p-8">Loading...</div>;

  return (
    <div className="max-w-6xl mx-auto">
      <DataTable 
        columns={columns} 
        data={response.data || []} 
        title="Manage Faculties" 
        onReorder={handleReorder}
        onUploadCsv={handleUploadCsv}
        onDownloadCsv={handleDownloadCsv}
      />
    </div>
  );
}
