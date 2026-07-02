"use client";

import useSWR from "swr";
import { fetcher } from "../../../lib/api";
import api from "../../../lib/api";
import DataTable from "../../../components/DataTable";

export default function ManageUsersPage() {
  const { data: response, error, mutate } = useSWR('/auth/users', fetcher);
  
  const columns = [
    { key: "username", label: "Username" },
    { key: "email", label: "Email" },
    { key: "role", label: "Role" },
    { key: "status", label: "Status" },
  ];

  const handleUploadCsv = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    try {
      await api.post('/auth/upload-csv', formData, {
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
    window.location.href = `${api.defaults.baseURL}/auth/download-csv`;
  };

  const handleChangeRole = async (user: any) => {
    const newRole = prompt(`Change role for ${user.username} (current: ${user.role}). Enter new role (admin/member):`, user.role);
    if (!newRole) return;
    
    try {
      await api.put(`/auth/users/${user.id}/role`, { role: newRole });
      mutate();
    } catch (err) {
      console.error(err);
      alert('Failed to change role');
    }
  };

  if (error) return <div className="p-8">Failed to load users</div>;
  if (!response) return <div className="p-8">Loading...</div>;

  return (
    <div className="max-w-6xl mx-auto">
      <DataTable 
        columns={columns} 
        data={response.data || []} 
        title="Manage Users"
        onUploadCsv={handleUploadCsv}
        onDownloadCsv={handleDownloadCsv}
        onEdit={handleChangeRole}
      />
    </div>
  );
}
