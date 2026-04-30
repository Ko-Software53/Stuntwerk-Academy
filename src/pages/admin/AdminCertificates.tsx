import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { GraduationCap } from 'lucide-react';

export default function AdminCertificates() {
  const { loading } = useAuth();

  if (loading) {
    return <div className="flex items-center justify-center py-20"><div className="animate-pulse text-muted-foreground">Laden...</div></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Zertifikatverwaltung</h1>
        <p className="text-sm text-muted-foreground mt-1">Ausgestellte Zertifikate verwalten</p>
      </div>
      
      <Card className="border-border/50">
        <CardHeader className="pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <GraduationCap className="h-4 w-4" />
            Zertifikate
          </CardTitle>
          <CardDescription>
            Hier werden in Zukunft alle im System vergebenen Zertifikate angezeigt.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="py-12 text-center text-muted-foreground text-sm">
            Diese Funktion ist derzeit noch in Entwicklung.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
