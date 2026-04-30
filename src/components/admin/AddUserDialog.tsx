import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { UserPlus, Loader2 } from 'lucide-react';

interface AddUserDialogProps {
  onUserAdded: () => void;
}

export function AddUserDialog({ onUserAdded }: AddUserDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [department, setDepartment] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const { toast } = useToast();

  const resetForm = () => {
    setEmail('');
    setFullName('');
    setDepartment('');
    setJobTitle('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !fullName) {
      toast({
        title: 'Fehlende Felder',
        description: 'Bitte füllen Sie E-Mail und vollständigen Namen aus.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke('invite-user', {
        body: { email, fullName, department, jobTitle },
      });

      if (error) {
        // Extract actual error message from response
        let message = error.message;
        try {
          if ('context' in error && error.context instanceof Response) {
            const body = await error.context.json();
            message = body?.error || message;
          }
        } catch {}
        throw new Error(message);
      }
      if (data?.error) throw new Error(data.error);

      toast({
        title: 'Mitarbeiter eingeladen',
        description: `${fullName} erhält eine E-Mail mit Anmeldeinformationen.`,
      });

      resetForm();
      setOpen(false);
      onUserAdded();
    } catch (error: any) {
      console.error("Error creating employee:", error);
      toast({
        title: 'Fehler beim Einladen',
        description: error.message || 'Etwas ist schiefgelaufen.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <UserPlus className="h-4 w-4" />
          Mitarbeiter einladen
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Neuen Mitarbeiter einladen</DialogTitle>
          <DialogDescription>
            Der Mitarbeiter erhält eine E-Mail mit einem Link zum Passwort festlegen.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Vollständiger Name *</Label>
            <Input
              id="fullName"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Max Mustermann"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">E-Mail *</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="max@firma.de"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="department">Abteilung</Label>
              <Input
                id="department"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                placeholder="z.B. Vertrieb"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="jobTitle">Position</Label>
              <Input
                id="jobTitle"
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="z.B. Teamleiter"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Abbrechen
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Einladung senden
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
