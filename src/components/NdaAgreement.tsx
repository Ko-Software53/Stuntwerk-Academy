import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, ShieldCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface NdaAgreementProps {
  profileId: string;
  onAccepted: () => void;
}

export default function NdaAgreement({ profileId, onAccepted }: NdaAgreementProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleAccept = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ nda_accepted_at: new Date().toISOString() })
        .eq('id', profileId);

      if (error) throw error;

      onAccepted();
    } catch {
      toast({
        title: 'Fehler',
        description: 'Die Zustimmung konnte nicht gespeichert werden. Bitte versuchen Sie es erneut.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open modal>
      <DialogContent
        className="sm:max-w-lg [&>button]:hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="text-center sm:text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
            <ShieldCheck className="h-7 w-7 text-primary" />
          </div>
          <DialogTitle className="text-xl font-bold tracking-tight">
            Vertraulichkeitsvereinbarung
          </DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground mt-1">
            Bitte lesen und bestätigen Sie die folgende Vereinbarung
          </DialogDescription>
        </DialogHeader>

        <div className="my-4 rounded-lg bg-muted/50 border border-border/40 p-5 text-sm leading-relaxed text-foreground/90 space-y-4">
          <p>
            Bitte bestätigen Sie, dass Sie die Inhalte dieser Kurse vertraulich behandeln werden.
            Die Informationen, die Sie während der Schulungen erhalten, sind ausschließlich für
            interne Zwecke bestimmt und dürfen nicht ohne ausdrückliche Genehmigung weitergegeben,
            kopiert oder veröffentlicht werden.
          </p>
          <p>
            Durch Klicken auf die Schaltfläche &quot;Zustimmen&quot; erklären Sie sich damit einverstanden,
            die Vertraulichkeit dieser Kursinhalte zu wahren und diese Informationen nicht an Dritte
            weiterzugeben.
          </p>
          <p className="text-muted-foreground text-xs">
            Vielen Dank für Ihr Verständnis und Ihre Kooperation.
          </p>
        </div>

        <DialogFooter className="sm:justify-center gap-2">
          <Button
            onClick={handleAccept}
            disabled={isLoading}
            className="w-full sm:w-auto min-w-[160px] h-11 font-semibold bg-gradient-to-r from-primary to-[hsl(260,60%,55%)] hover:opacity-90 transition-opacity"
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Zustimmen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
