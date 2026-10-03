import { Menu, PanelLeftOpen } from "lucide-react";

// Mobile hamburger that opens the off-canvas Sidebar drawer (hidden at md+).
// On desktop, when the sidebar has been hidden (`collapsed`), it shows an icon
// that brings the sidebar back (`onExpand`).
export default function SidebarToggleButton({
  onClick,
  collapsed = false,
  onExpand,
}: {
  onClick: () => void;
  collapsed?: boolean;
  onExpand?: () => void;
}) {
  return (
    <>
      <button
        onClick={onClick}
        className="md:hidden mb-4 p-2 -ml-2 text-foreground hover:bg-accent rounded-md"
        aria-label="Open menu"
      >
        <Menu className="w-6 h-6" />
      </button>
      {collapsed && onExpand && (
        <button
          onClick={onExpand}
          className="hidden md:inline-flex mb-4 p-2 -ml-2 text-muted-foreground hover:text-primary hover:bg-accent rounded-md cursor-pointer"
          aria-label="Show menu"
          title="Show menu"
        >
          <PanelLeftOpen className="w-5 h-5" />
        </button>
      )}
    </>
  );
}
