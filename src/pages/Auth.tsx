import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

export default function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecovery, setIsRecovery] = useState(false);
  const { signIn, user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const hash = window.location.hash;
    if (hash && hash.includes('type=recovery')) {
      setIsRecovery(true);
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecovery(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (user && !isRecovery && !loading) {
      navigate(isAdmin ? '/admin' : '/dashboard');
    }
  }, [user, navigate, isRecovery, isAdmin, loading]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await signIn(email, password);
      if (error) {
        toast({ title: 'Anmeldung fehlgeschlagen', description: 'Ungültige E-Mail oder Passwort.', variant: 'destructive' });
      }
      // Redirection is handled by the useEffect above once user state updates
    } catch {
      toast({ title: 'Fehler', description: 'Etwas ist schiefgelaufen. Bitte versuche es erneut.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast({ title: 'Passwörter stimmen nicht überein', description: 'Bitte überprüfen Sie die Eingabe.', variant: 'destructive' });
      return;
    }

    if (password.length < 6) {
      toast({ title: 'Passwort zu kurz', description: 'Mindestens 6 Zeichen erforderlich.', variant: 'destructive' });
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      toast({ title: 'Passwort festgelegt', description: 'Sie können sich jetzt anmelden.' });
      setIsRecovery(false);
      window.location.hash = '';
      navigate('/dashboard');
    } catch (error: any) {
      toast({ title: 'Fehler', description: error.message || 'Passwort konnte nicht gesetzt werden.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Gradient mesh background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.03] via-background to-background" />
      <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full bg-primary/[0.06] blur-[100px]" />
      <div className="absolute bottom-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-chart-3/[0.05] blur-[100px]" />
      <div className="absolute top-[40%] left-[60%] w-[300px] h-[300px] rounded-full bg-chart-4/[0.04] blur-[80px]" />

      {/* Content */}
      <div className="relative w-full max-w-[380px] px-5 py-10">
        <div className="text-center mb-10">
          <Link to="/" className="inline-flex items-center gap-2.5 group">
            <img src="/stuntwerk-logo.svg" alt="Stuntwerk Academy" className="h-9 w-auto transition-transform group-hover:scale-105" />
            <span className="text-xl font-bold text-foreground tracking-tight">Stuntwerk Academy</span>
          </Link>
        </div>

        <Card className="border-border/40 shadow-xl shadow-primary/[0.03]">
          <CardHeader className="space-y-1.5 text-center pb-2 pt-7">
            <CardTitle className="text-2xl font-bold tracking-tight">
              {isRecovery ? 'Passwort festlegen' : 'Willkommen'}
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              {isRecovery
                ? 'Legen Sie Ihr Passwort fest, um Ihr Konto zu aktivieren'
                : 'Melde dich an, um fortzufahren'
              }
            </CardDescription>
          </CardHeader>
          <CardContent className="px-7 pb-7 pt-4">
            {isRecovery ? (
              <form onSubmit={handleSetPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="newPassword" className="text-sm font-medium">Neues Passwort</Label>
                  <Input id="newPassword" type="password" placeholder="Mind. 6 Zeichen" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="h-11" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-sm font-medium">Passwort bestätigen</Label>
                  <Input id="confirmPassword" type="password" placeholder="Passwort wiederholen" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={6} className="h-11" />
                </div>
                <Button type="submit" className="w-full h-11 font-semibold bg-primary text-primary-foreground hover:opacity-90 transition-opacity" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Passwort festlegen
                </Button>
              </form>
            ) : (
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium">E-Mail</Label>
                  <Input id="email" type="email" placeholder="mail@domain.de" value={email} onChange={(e) => setEmail(e.target.value)} required className="h-11" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-medium">Passwort</Label>
                  <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} className="h-11" />
                </div>
                <Button type="submit" className="w-full h-11 font-semibold bg-primary text-primary-foreground hover:opacity-90 transition-opacity" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Anmelden
                </Button>
              </form>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground/60 mt-8">
          &copy; {new Date().getFullYear()} Stuntwerk
        </p>
      </div>
    </div>
  );
}
