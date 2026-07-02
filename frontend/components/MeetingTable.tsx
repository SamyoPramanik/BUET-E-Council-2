import Link from 'next/link';

interface Meeting {
  id: string;
  serial: number;
  title: string;
  date: string;
}

interface MeetingTableProps {
  meetings: Meeting[];
}

export default function MeetingTable({ meetings }: MeetingTableProps) {
  return (
    <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-muted text-muted-foreground text-sm border-b border-border">
              <th className="px-6 py-3 font-semibold">Serial No</th>
              <th className="px-6 py-3 font-semibold">Title</th>
              <th className="px-6 py-3 font-semibold">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {meetings.map((meeting) => (
              <tr 
                key={meeting.id} 
                className="hover:bg-accent/50 transition-colors cursor-pointer"
              >
                <td className="px-6 py-4 text-sm font-medium">
                  {meeting.serial}
                </td>
                <td className="px-6 py-4 text-sm text-foreground">
                  <Link href={`/meetings/${meeting.id}`} className="block hover:underline text-primary font-medium">
                    {meeting.title}
                  </Link>
                </td>
                <td className="px-6 py-4 text-sm text-muted-foreground">
                  {meeting.date}
                </td>
              </tr>
            ))}
            
            {meetings.length === 0 && (
              <tr>
                <td colSpan={3} className="px-6 py-8 text-center text-muted-foreground">
                  No meetings found for this category.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      
      {/* Pagination Placeholder */}
      <div className="px-6 py-4 border-t border-border flex items-center justify-between text-sm text-muted-foreground">
        <button className="hover:text-foreground disabled:opacity-50">Previous</button>
        <span>Page 1 of 1</span>
        <button className="hover:text-foreground disabled:opacity-50">Next</button>
      </div>
    </div>
  );
}
