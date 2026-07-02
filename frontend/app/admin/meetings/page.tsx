import DataTable from "../../../components/DataTable";

export default function ManageMeetingsPage() {
  const columns = [
    { key: "serial", label: "Serial No" },
    { key: "title", label: "Meeting Title" },
    { key: "date", label: "Meeting Date" },
    { key: "status", label: "Status" },
  ];

  const data = [
    { id: "1", serial: "1", title: "1st Academic Meeting", date: "Oct 12, 2026", status: "Draft" },
    { id: "2", serial: "2", title: "2nd Academic Meeting", date: "Nov 15, 2026", status: "Ongoing" },
    { id: "3", serial: "3", title: "3rd Academic Meeting", date: "Dec 20, 2026", status: "Past" },
  ];

  return (
    <div className="max-w-6xl mx-auto">
      <DataTable columns={columns} data={data} title="Manage Meetings" />
    </div>
  );
}
