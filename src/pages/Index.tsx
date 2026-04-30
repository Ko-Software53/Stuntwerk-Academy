import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';

export default function Index() {
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading || !user) return;
    navigate(isAdmin ? '/admin' : '/dashboard');
  }, [user, isAdmin, loading, navigate]);

  return (
    <div className="min-h-screen bg-[hsl(var(--muted))]">
      <div className="grid min-h-screen grid-cols-1 md:grid-cols-12">
        <div className="md:col-span-7 relative">
          <img
            src="/assets/stuntwerk-hero.jpg"
            alt="Stuntwerk Mitarbeitendenportal"
            className="h-72 w-full object-cover md:h-full"
          />
        </div>

        <div className="md:col-span-5 flex items-center justify-center px-6 py-10 md:px-10">
          <div className="w-full max-w-[520px] rounded-md border border-border bg-card p-6 md:p-10 shadow-sm">
            <div className="space-y-6">
              <img
                src="/stuntwerk-logo.svg"
                alt="Stuntwerk Academy"
                className="h-10 w-auto md:h-12"
              />
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Interner Zugang
                </p>
                <h1 className="text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">
                  Stuntwerk Academy
                </h1>
                <p className="text-sm text-muted-foreground">
                  Zugang für Mitarbeitende, Admins und HR.
                </p>
              </div>

              <Button asChild size="lg" className="h-12 w-full bg-secondary text-secondary-foreground hover:opacity-90">
                <Link to="/auth">Anmelden</Link>
              </Button>

              <p className="text-xs text-muted-foreground/70">
                &copy; {new Date().getFullYear()} Stuntwerk &middot;{' '}
                <Link to="/impressum" className="underline hover:text-muted-foreground">
                  Impressum
                </Link>{' '}
                &middot;{' '}
                <Link to="/datenschutz" className="underline hover:text-muted-foreground">
                  Datenschutz
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
