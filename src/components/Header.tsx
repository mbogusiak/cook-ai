import { User, LogOut, ChefHat } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Breadcrumbs } from './Breadcrumbs';
import { useCurrentPath } from './hooks/useCurrentPath';

export function Header(): JSX.Element {
  const { path, planId, date } = useCurrentPath();
  const userName = 'Marcin'; // TODO: Replace with actual user name from session

  const handleLogout = () => {
    // TODO: Implement logout functionality
    console.log('Logout clicked');
  };

  const handleShowProfile = () => {
    // TODO: Navigate to profile page
    console.log('Show profile clicked');
  };

  return (
    <header className="border-b bg-background sticky top-0 z-50">
      <div className="flex items-center justify-between max-w-6xl mx-auto px-4 py-4 gap-4">
        {/* Logo */}
        <a
          href="/dashboard"
          className="flex items-center gap-2 flex-shrink-0 hover:opacity-80 transition-opacity"
          aria-label="Mealflow - przejdź do strony głównej"
        >
          <div className="w-8 h-8 rounded-lg bg-warning flex items-center justify-center">
            <ChefHat className="h-5 w-5 text-warning-foreground" />
          </div>
          <span className="font-bold text-lg hidden sm:inline">Mealflow</span>
        </a>

        {/* Breadcrumbs - flex-1 to center them */}
        <div className="flex-1 flex justify-center">
          <Breadcrumbs path={path} planId={planId} date={date} />
        </div>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full flex-shrink-0">
              <User className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <div className="px-2 py-1.5 text-sm font-semibold text-foreground mb-2">
              {userName}
            </div>
            <DropdownMenuItem onClick={handleShowProfile}>
              <User className="mr-2 h-4 w-4" />
              Pokaż profil
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleLogout} className="text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              Wyloguj
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
