import Link from 'next/link';
import UserDropdown from './UserDropdown';
import ThemeToggle from './ThemeToggle';
import SearchBar from './SearchBar';

export default function Header({ hideSearch = false }: { hideSearch?: boolean }) {
  return (
    <header className="sticky top-0 z-40 w-full bg-topbar text-topbar-foreground border-b border-black/25 shadow-sm">
      {/* Full width (no centred container) so the brand sits at the far left. */}
      <div className="w-full px-4 sm:px-6 h-16 flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center space-x-2 shrink-0">
          <span className="font-bold tracking-wide text-topbar-foreground text-xl">
            BUET E-COUNCIL
          </span>
        </Link>
        {!hideSearch && (
          <div className="flex-1 flex justify-center">
            <SearchBar />
          </div>
        )}
        <div className="flex items-center space-x-4 shrink-0">
          <ThemeToggle />
          <UserDropdown />
        </div>
      </div>
    </header>
  );
}
