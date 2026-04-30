import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Header } from '@/components/layout/Header';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Award, Download, Calendar, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { useToast } from '@/hooks/use-toast';

interface Certificate {
  id: string;
  certificate_number: string;
  issued_at: string;
  course_id: string;
  courses: {
    title: string;
    description: string;
    certificate_pdf_url: string | null;
    certificate_name_x: number | null;
    certificate_name_y: number | null;
    certificate_name_size: number | null;
  };
}

export default function Certificates() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) navigate('/auth');
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) fetchCertificates();
  }, [user]);

  const fetchCertificates = async () => {
    const { data } = await supabase
      .from('certificates')
      .select('id, certificate_number, issued_at, course_id, courses (title, description, certificate_pdf_url, certificate_name_x, certificate_name_y, certificate_name_size)')
      .eq('user_id', user!.id)
      .order('issued_at', { ascending: false });
    if (data) setCertificates(data as unknown as Certificate[]);
    setIsLoading(false);
  };

  const handleDownload = async (cert: Certificate) => {
    const employeeName = profile?.full_name || 'Mitarbeiter';
    const pdfUrl = cert.courses.certificate_pdf_url;

    // Default to center if not set
    const nameX = cert.courses.certificate_name_x ?? 0.5;
    const nameY = cert.courses.certificate_name_y ?? 0.5;

    if (!pdfUrl) {
      toast({ title: 'Kein PDF', description: 'Für diesen Kurs ist keine Zertifikatsvorlage verfügbar.', variant: 'destructive' });
      return;
    }

    setDownloadingId(cert.id);

    try {
      // Fetch the template PDF
      const res = await fetch(pdfUrl);
      const templateBytes = await res.arrayBuffer();

      // Load the PDF and add the employee name
      const pdfDoc = await PDFDocument.load(templateBytes);
      const font = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);
      const pages = pdfDoc.getPages();
      const firstPage = pages[0];
      const { width, height } = firstPage.getSize();

      // Draw employee name at the configured coordinates
      const nameText = employeeName;
      const fontSize = cert.courses.certificate_name_size ?? 28;
      const textWidth = font.widthOfTextAtSize(nameText, fontSize);

      // Calculate coordinates:
      // X is centered on the configured percentage
      const x = (width * nameX) - (textWidth / 2);
      // pdf-lib's origin (0,0) is bottom-left, while our UI is top-left, so we invert Y
      // We also offset by roughly half the font size to center the text baseline
      const y = (height * (1 - nameY)) - (fontSize / 3);

      firstPage.drawText(nameText, {
        x,
        y,
        size: fontSize,
        font,
        color: rgb(0.1, 0.1, 0.1),
      });

      // Optional: Since they now have proper template control, we might skip stamping course/date 
      // if they just want the name, but we'll include it slightly below the name for now as a fallback
      // but only if they haven't explicitly moved the name from default (0.5, 0.5)

      if (nameX === 0.5 && nameY === 0.5) {
        const courseFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
        const courseText = cert.courses.title;
        const courseFontSize = 16;
        const courseTextWidth = courseFont.widthOfTextAtSize(courseText, courseFontSize);
        firstPage.drawText(courseText, {
          x: (width - courseTextWidth) / 2,
          y: y - 45,
          size: courseFontSize,
          font: courseFont,
          color: rgb(0.3, 0.3, 0.3),
        });

        const dateText = format(new Date(cert.issued_at), 'd. MMMM yyyy', { locale: de });
        const dateFontSize = 12;
        const dateTextWidth = courseFont.widthOfTextAtSize(dateText, dateFontSize);
        firstPage.drawText(dateText, {
          x: (width - dateTextWidth) / 2,
          y: y - 70,
          size: dateFontSize,
          font: courseFont,
          color: rgb(0.4, 0.4, 0.4),
        });

        const certNumText = `Zertifikat-Nr.: ${cert.certificate_number}`;
        const certNumFontSize = 9;
        const certNumWidth = courseFont.widthOfTextAtSize(certNumText, certNumFontSize);
        firstPage.drawText(certNumText, {
          x: (width - certNumWidth) / 2,
          y: y - 95,
          size: certNumFontSize,
          font: courseFont,
          color: rgb(0.5, 0.5, 0.5),
        });
      }

      // Save and download
      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([new Uint8Array(pdfBytes)], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Zertifikat_${cert.courses.title.replace(/\s+/g, '_')}_${employeeName.replace(/\s+/g, '_')}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      toast({ title: 'Fehler', description: 'Das Zertifikat konnte nicht erstellt werden.', variant: 'destructive' });
    } finally {
      setDownloadingId(null);
    }
  };

  if (loading || isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-transparent">
        <div className="animate-pulse text-muted-foreground">Laden...</div>
      </div>
    );
  }

  return (
    <div className="bg-transparent pb-16 text-sm">
      <main className="w-full">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Meine Zertifikate</h1>
          <p className="text-sm text-muted-foreground mt-1">Deine erreichten Abschlüsse</p>
        </div>

        {certificates.length === 0 ? (
          <Card className="border-border/50 rounded-md">
            <CardContent className="py-16 text-center">
              <Award className="h-12 w-12 mx-auto text-muted-foreground/20 mb-4" />
              <h3 className="text-base font-medium mb-1.5">Noch keine Zertifikate</h3>
              <p className="text-sm text-muted-foreground mb-4">Schließe einen Kurs ab, um dein erstes Zertifikat zu erhalten!</p>
              <Button size="sm" onClick={() => navigate('/dashboard')} className="rounded-md">Kurse durchsuchen</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {certificates.map((cert) => (
              <Card key={cert.id} className="overflow-hidden border-border/50 hover:shadow-md transition-shadow rounded-md">
                <div className="bg-gradient-to-br from-primary/5 to-accent p-8 border-b border-border/50">
                  <div className="flex items-center justify-center">
                    <div className="h-16 w-16 flex items-center justify-center rounded-md bg-primary/10">
                      <Award className="h-8 w-8 text-primary" />
                    </div>
                  </div>
                </div>
                <CardContent className="p-5">
                  <div className="text-center mb-5">
                    <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1.5">Abschlusszertifikat</p>
                    <h3 className="text-lg font-bold text-foreground mb-0.5">{cert.courses.title}</h3>
                    <p className="text-xs text-muted-foreground">Verliehen an {profile?.full_name || 'Mitarbeiter'}</p>
                  </div>

                  <div className="flex items-center justify-between text-xs border-t border-border/50 pt-3 mb-3">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5" />
                      {format(new Date(cert.issued_at), 'd. MMM yyyy', { locale: de })}
                    </span>
                    <span className="font-mono text-muted-foreground">{cert.certificate_number}</span>
                  </div>

                  <Button
                    variant="outline"
                    className="w-full gap-2 rounded-md h-10 text-xs border-border/60 hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all font-semibold"
                    onClick={() => handleDownload(cert)}
                    disabled={downloadingId === cert.id || !cert.courses.certificate_pdf_url}
                  >
                    {downloadingId === cert.id ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Download className="h-3.5 w-3.5" />
                    )}
                    {!cert.courses.certificate_pdf_url
                      ? 'Kein PDF verfügbar'
                      : downloadingId === cert.id
                        ? 'Wird erstellt...'
                        : 'Herunterladen'
                    }
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
