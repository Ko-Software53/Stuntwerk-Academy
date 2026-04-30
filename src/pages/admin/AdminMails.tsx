import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Send, Users, User, RotateCcw } from "lucide-react";

interface Employee {
  id: string;
  email: string;
  full_name: string;
}

export default function AdminMails() {
  const { toast } = useToast();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);

  // Form state
  const [recipientFilter, setRecipientFilter] = useState<"all" | "specific">("all");
  const [selectedUserId, setSelectedUserId] = useState<string>("all");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    setIsLoading(true);
    // Fetch all user profiles for the dropdown
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, full_name')
      .order('full_name');
    
    if (data) {
      setEmployees(data);
    } else if (error) {
      toast({ title: "Fehler beim Laden", description: error.message, variant: "destructive" });
    }
    setIsLoading(false);
  };

  const handleSend = async () => {
    if (!subject.trim() || !body.trim()) {
      toast({ title: "Unvollständig", description: "Bitte geben Sie einen Betreff und einen Nachrichtentext ein.", variant: "destructive" });
      return;
    }

    if (recipientFilter === "specific" && selectedUserId === "all") {
      toast({ title: "Empfänger fehlt", description: "Bitte wählen Sie einen spezifischen Mitarbeiter aus.", variant: "destructive" });
      return;
    }

    setIsSending(true);

    try {
      // Determine recipients
      const recipients = recipientFilter === "all" ? employees : employees.filter(e => e.id === selectedUserId);

      if (recipients.length === 0) {
        toast({ title: "Fehler", description: "Keine Empfänger gefunden.", variant: "destructive" });
        setIsSending(false);
        return;
      }

      console.log("Sending mail to:", recipients.map(r => r.email));

      // Invoke the send-email function for each recipient (in parallel or sequence)
      // Note: Ideally, a bulk-send function would be better, but we leverage the existing one.
      const sendPromises = recipients.map(emp => 
        supabase.functions.invoke('send-email', {
          body: {
            type: 'custom',
            to: emp.email,
            data: {
              name: emp.full_name || emp.email.split('@')[0],
              subject: subject,
              body: body
            }
          }
        })
      );

      const results = await Promise.allSettled(sendPromises);
      
      const failed = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && r.value.error));
      
      if (failed.length > 0) {
        console.error("Some emails failed to send:", failed);
        throw new Error(`${failed.length} E-Mails konnten nicht gesendet werden. Überprüfen Sie die Konsole.`);
      }

      toast({
        title: "E-Mail gesendet",
        description: recipientFilter === "all" 
          ? `Die E-Mail wurde erfolgreich an ${recipients.length} Mitarbeiter gesendet.` 
          : "Die E-Mail wurde erfolgreich an den ausgewählten Mitarbeiter gesendet.",
      });

      // Reset form on success
      setSubject("");
      setBody("");
    } catch (error: any) {
      toast({ title: "Fehler beim Senden", description: error.message, variant: "destructive" });
    } finally {
      setIsSending(false);
    }
  };

  const handleClear = () => {
    setSubject("");
    setBody("");
    setRecipientFilter("all");
    setSelectedUserId("all");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-extrabold tracking-tight">Mails</h1>
        <p className="text-muted-foreground text-lg">Kommunizieren Sie direkt mit Ihren Mitarbeitern.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Card className="rounded-md border-border/40 shadow-sm overflow-hidden bg-card">
            <CardHeader className="bg-muted/30 border-b border-border/40 pb-6 px-8 pt-8">
              <CardTitle className="text-xl flex items-center gap-2">
                <Send className="h-5 w-5 text-primary" />
                Neue E-Mail verfassen
              </CardTitle>
              <CardDescription className="text-sm mt-1.5">
                Stellen Sie Empfänger ein und formulieren Sie Ihre Nachricht.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-8 space-y-6">
              
              {/* Recipient Selection */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-foreground">Empfängerkreis</label>
                  <Select value={recipientFilter} onValueChange={(val: "all" | "specific") => {
                    setRecipientFilter(val);
                    if (val === "all") setSelectedUserId("all");
                  }}>
                    <SelectTrigger className="h-12 rounded-md bg-muted/20 border-border/50">
                      <SelectValue placeholder="Wählen Sie den Empfängerkreis" />
                    </SelectTrigger>
                    <SelectContent className="rounded-md border-border/50">
                      <SelectItem value="all">
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-primary" />
                          <span>Alle Mitarbeiter</span>
                        </div>
                      </SelectItem>
                      <SelectItem value="specific">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-chart-4" />
                          <span>Einzelne(r) Mitarbeiter/in</span>
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {recipientFilter === "specific" && (
                  <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                    <label className="text-sm font-semibold text-foreground">Spezifischer Mitarbeiter</label>
                    <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                      <SelectTrigger className="h-12 rounded-md bg-muted/20 border-border/50">
                        <SelectValue placeholder="Mitarbeiter auswählen..." />
                      </SelectTrigger>
                      <SelectContent className="rounded-md border-border/50 max-h-[300px]">
                        <SelectItem value="all" disabled>Mitarbeiter auswählen...</SelectItem>
                        {employees.map(emp => (
                          <SelectItem key={emp.id} value={emp.id}>
                            {emp.full_name || emp.email} ({emp.email})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {/* Subject */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">Betreff</label>
                <Input 
                  placeholder="Z.B. Wichtiges Update zur Schulung" 
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="h-12 rounded-md bg-muted/20 border-border/50 focus-visible:ring-primary/20"
                />
              </div>

              {/* Body */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-foreground">Nachrichtentext</label>
                <Textarea 
                  placeholder="Geben Sie hier Ihre Nachricht ein..." 
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  className="min-h-[250px] rounded-md bg-muted/20 border-border/50 focus-visible:ring-primary/20 resize-y p-4"
                />
              </div>

            </CardContent>
            <CardFooter className="px-8 py-6 bg-muted/10 border-t border-border/40 flex items-center justify-between">
              <Button variant="ghost" className="text-muted-foreground hover:text-foreground hover:bg-muted" onClick={handleClear} disabled={isSending}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Zurücksetzen
              </Button>
              <Button 
                onClick={handleSend} 
                disabled={isSending || !subject.trim() || !body.trim() || (recipientFilter === 'specific' && selectedUserId === 'all')} 
                className="h-11 px-8 rounded-md bg-primary hover:bg-primary/90 text-white font-semibold shadow-sm hover:shadow-md transition-all gap-2"
              >
                {isSending ? (
                  <>Senden...</>
                ) : (
                  <>
                    Nachricht Senden
                    <Send className="h-4 w-4" />
                  </>
                )}
              </Button>
            </CardFooter>
          </Card>
        </div>

        {/* Sidebar Info Panel */}
        <div className="space-y-6">
          <Card className="rounded-md border-border/40 shadow-sm bg-gradient-to-br from-primary/5 to-chart-4/5 overflow-hidden relative">
            <div className="absolute -right-12 -top-12 w-32 h-32 bg-primary/10 rounded-full blur-2xl" />
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Mail-Assistent</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-muted-foreground leading-relaxed">
              <p>
                Mit dieser Funktion können Sie E-Mails direkt an die bei den Mitarbeitern hinterlegten E-Mail-Adressen senden.
              </p>
              <ul className="space-y-2 list-disc list-inside">
                <li><strong className="text-foreground">Alle Mitarbeiter</strong>: Sendet die Nachricht an das gesamte Team. Ideal für allgemeine Ankündigungen.</li>
                <li><strong className="text-foreground">Spezifische Mitarbeiter</strong>: Senden Sie gezielte Nachrichten an einzelne Personen, z.B. Erinnerungen an Zertifikate.</li>
              </ul>
              <p className="mt-4 p-3 bg-background/50 rounded-md border border-border/50 text-xs">
                Hinweis: Bitte beachten Sie, dass E-Mails unverschlüsselt gesendet werden. Vermeiden Sie das Versenden hochsensibler Personaldaten.
              </p>
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
