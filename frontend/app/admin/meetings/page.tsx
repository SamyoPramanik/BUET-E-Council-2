"use client";

import useSWR from "swr";
import { fetcher } from "../../../lib/api";
import DataTable from "../../../components/DataTable";

export default function ManageMeetingsPage() {
  const { data: response, error } = useSWR('/meetings', fetcher);

  const columns = [
    { key: "serial", label: "Serial No" },
    { key: "title", label: "Meeting Title" },
    { key: "status", label: "Status" },
    { key: "date", label: "Date" }
  ];

  if (error) return <div className="p-8">Failed to load meetings</div>;
  if (!response) return <div className="p-8">Loading...</div>;

  return (
    <div className="max-w-6xl mx-auto">
      <DataTable 
        columns={columns} 
        data={response.data || []} 
        title="Manage Meetings" 
      />
    </div>
  );
}
