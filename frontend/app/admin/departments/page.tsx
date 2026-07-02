"use client";

import useSWR from "swr";
import { fetcher } from "../../../lib/api";
import api from "../../../lib/api";
import DataTable from "../../../components/DataTable";

export default function ManageDepartmentsPage() {
  const { data: response, error, mutate } = useSWR('/departments', fetcher);
  
  const columns = [
    { key: "serial", label: "Serial No" },
    { key: "name_english", label: "Department Name" },
    { key: "alias_english", label: "Alias" },
    { key: "faculty_name", label: "Faculty" },
  ];

  const handleReorder = async (newOrder: any[]) => {
    try {
      await api.put('/departments/reorder', { items: newOrder });
      mutate();
    } catch (err) {
      console.error(err);
      alert('Failed to reorder departments');
    }
  };

  const handleUploadCsv = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    try {
      await api.post('/departments/upload-csv', formData, {
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
    window.location.href = `${api.defaults.baseURL}/departments/download-csv`;
  };

  if (error) return <div className="p-8">Failed to load departments</div>;
  if (!response) return <div className="p-8">Loading...</div>;

  return (
    <div className="max-w-6xl mx-auto">
      <DataTable 
        columns={columns} 
        data={response.data || []} 
        title="Manage Departments"
        onReorder={handleReorder}
        onUploadCsv={handleUploadCsv}
        onDownloadCsv={handleDownloadCsv} 
      />
    </div>
  );
}
