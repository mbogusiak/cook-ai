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
import { useAuth } from './hooks/useAuth';

interface HeaderProps {
  user?: {
    id: string;
    email?: string;
  };
}

export function Header({ user: initialUser }: HeaderProps): JSX.Element {
  const { path, planId, date } = useCurrentPath();
  const { user: currentUser, isLoading, signOut } = useAuth();

  // Use client-side user from hook if available, otherwise fall back to initial user from SSR
  const user = currentUser || (initialUser ? { id: initialUser.id, email: initialUser.email || undefined } : null);
  const userName = user?.email || 'Użytkownik';

  const handleLogout = async () => {
    try {
      await signOut();
      // signOut already handles redirect to /
    } catch (error) {
      console.error('Failed to logout:', error);
    }
  };

  const handleShowProfile = () => {
    // TODO: Navigate to profile page
    console.log('Show profile clicked');
  };

  // Show login/register buttons if not logged in
  if (!isLoading && !user) {
    return (
      <header className="border-b bg-background sticky top-0 z-50">
        <div className="flex items-center justify-between max-w-6xl mx-auto px-4 py-4 gap-4">
          {/* Logo */}
          <a
            href="/"
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

          {/* Auth Buttons */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <Button variant="ghost" asChild>
              <a href="/auth/login">Zaloguj</a>
            </Button>
            <Button asChild>
              <a href="/auth/register">Zarejestruj</a>
            </Button>
          </div>
        </div>
      </header>
    );
  }

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <header className="border-b bg-background sticky top-0 z-50">
        <div className="flex items-center justify-between max-w-6xl mx-auto px-4 py-4 gap-4">
          {/* Logo */}
          <a
            href="/"
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
        </div>
      </header>
    );
  }

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
            <Button
              variant="ghost"
              size="icon"
              className="rounded-full flex-shrink-0"
              aria-label="Menu użytkownika"
            >
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
