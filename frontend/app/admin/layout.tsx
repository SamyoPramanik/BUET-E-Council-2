import Header from "../../components/Header";
import AdminLayoutWrapper from "../../components/AdminLayoutWrapper";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <AdminLayoutWrapper>
        {children}
      </AdminLayoutWrapper>
    </div>
  );
}
