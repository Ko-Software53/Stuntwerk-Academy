import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/useAuth';
import { LogOut, User, Settings, Award, Menu, X } from 'lucide-react';
import { useState } from 'react';

export function Header() {
  const { user, profile, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  return (
    <header className="sticky top-0 z-50 w-full bg-background/80 backdrop-blur-xl border-b border-border/40">
      <div className="container flex h-14 items-center justify-between">
        <Link to={user ? '/dashboard' : '/'} className="flex items-center gap-2.5 group">
          <img src="/stuntwerk-logo.svg" alt="Stuntwerk Academy" className="h-7 w-auto transition-transform group-hover:scale-105" />
        </Link>

        <nav className="hidden md:flex items-center gap-0.5">
          {user && !isAdmin && (
            <>
              <Button variant="ghost" size="sm" asChild className="text-muted-foreground hover:text-foreground text-sm h-8 px-3">
                <Link to="/dashboard">Meine Kurse</Link>
              </Button>
              <Button variant="ghost" size="sm" asChild className="text-muted-foreground hover:text-foreground text-sm h-8 px-3">
                <Link to="/certificates">Zertifikate</Link>
              </Button>
            </>
          )}
          {user && isAdmin && (
            <Button variant="ghost" size="sm" asChild className="text-muted-foreground hover:text-foreground text-sm h-8 px-3">
              <Link to="/admin">Admin-Bereich</Link>
            </Button>
          )}
        </nav>

        <div className="flex items-center gap-2">
          {user ? (
            <>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full p-0">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={profile?.avatar_url || ''} alt={profile?.full_name || ''} />
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                        {getInitials(profile?.full_name)}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end">
                  <div className="flex items-center gap-2.5 p-2.5">
                    <Avatar className="h-9 w-9">
                      <AvatarImage src={profile?.avatar_url || ''} />
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                        {getInitials(profile?.full_name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col min-w-0">
                      <span className="text-sm font-semibold truncate">{profile?.full_name || 'Benutzer'}</span>
                      <span className="text-xs text-muted-foreground truncate">{profile?.email}</span>
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  {!isAdmin && (
                    <>
                      <DropdownMenuItem onClick={() => navigate('/dashboard')}>
                        <User className="mr-2 h-4 w-4" />
                        Mein Dashboard
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate('/certificates')}>
                        <Award className="mr-2 h-4 w-4" />
                        Zertifikate
                      </DropdownMenuItem>
                    </>
                  )}
                  {isAdmin && (
                    <DropdownMenuItem onClick={() => navigate('/admin')}>
                      <Settings className="mr-2 h-4 w-4" />
                      Admin-Bereich
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
                    <LogOut className="mr-2 h-4 w-4" />
                    Abmelden
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button variant="ghost" size="icon" className="md:hidden h-8 w-8" onClick={() => setMobileOpen(!mobileOpen)}>
                {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
              </Button>
            </>
          ) : (
            <Button size="sm" className="h-8 bg-primary text-primary-foreground hover:opacity-90 transition-opacity" onClick={() => navigate('/auth')}>
              Anmelden
            </Button>
          )}
        </div>
      </div>

      {/* Mobile nav */}
      {mobileOpen && user && (
        <div className="md:hidden border-t border-border/40 bg-background/95 backdrop-blur-xl p-3 space-y-0.5">
          {!isAdmin && (
            <>
              <Button variant="ghost" className="w-full justify-start h-9 text-sm" asChild onClick={() => setMobileOpen(false)}>
                <Link to="/dashboard">Meine Kurse</Link>
              </Button>
              <Button variant="ghost" className="w-full justify-start h-9 text-sm" asChild onClick={() => setMobileOpen(false)}>
                <Link to="/certificates">Zertifikate</Link>
              </Button>
            </>
          )}
          {isAdmin && (
            <Button variant="ghost" className="w-full justify-start h-9 text-sm" asChild onClick={() => setMobileOpen(false)}>
              <Link to="/admin">Admin-Bereich</Link>
            </Button>
          )}
        </div>
      )}
    </header>
  );
}
