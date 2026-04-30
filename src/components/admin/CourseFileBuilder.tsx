import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Upload, File as FileIcon, Trash2, Download } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export interface CourseFile {
  id: string;
  course_id: string;
  name: string;
  file_url: string;
  size: number;
  created_at: string;
}

export function CourseFileBuilder({ courseId }: { courseId?: string }) {
  const [files, setFiles] = useState<CourseFile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (courseId && courseId !== 'new') {
      fetchFiles();
    } else {
      setIsLoading(false);
    }
  }, [courseId]);

  const fetchFiles = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('course_files')
      .select('*')
      .eq('course_id', courseId)
      .order('created_at', { ascending: false });
    
    if (data) setFiles(data as CourseFile[]);
    setIsLoading(false);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !courseId || courseId === 'new') return;
    
    setIsUploading(true);
    const fileName = `${courseId}/${Date.now()}-${file.name.replace(/\s+/g, '_')}`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('course_files')
      .upload(fileName, file);
      
    if (uploadError) {
      toast({ title: 'Upload fehlgeschlagen', description: uploadError.message, variant: 'destructive' });
      setIsUploading(false);
      return;
    }
    
    const { data: urlData } = supabase.storage.from('course_files').getPublicUrl(uploadData.path);
    
    const { data: insertData, error: insertError } = await supabase
      .from('course_files')
      .insert({
        course_id: courseId,
        name: file.name,
        file_url: urlData.publicUrl,
        size: file.size,
      })
      .select()
      .single();
      
    if (insertError) {
       toast({ title: 'Datenbankfehler', description: insertError.message, variant: 'destructive' });
    } else if (insertData) {
       setFiles(prev => [insertData as CourseFile, ...prev]);
       toast({ title: 'Datei hochgeladen', description: 'Die Datei wurde erfolgreich hinzugefügt.' });
    }
    setIsUploading(false);
  };

  const handleDelete = async (fileId: string, fileUrl: string) => {
    // Extract path from public URL
    const idx = fileUrl.indexOf('/storage/v1/object/public/course_files/');
    if (idx !== -1) {
      const path = fileUrl.substring(idx + '/storage/v1/object/public/course_files/'.length);
      await supabase.storage.from('course_files').remove([path]);
    }
    
    const { error } = await supabase.from('course_files').delete().eq('id', fileId);
    if (!error) {
      setFiles(prev => prev.filter(f => f.id !== fileId));
      toast({ title: 'Datei gelöscht', description: 'Die Datei wurde entfernt.' });
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  if (!courseId || courseId === 'new') {
    return (
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-base">Dateien und Kenntnisnahme</CardTitle>
          <CardDescription>Mitarbeiter müssen diese Dateien am Ende herunterladen und bestätigen.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center p-6 border border-dashed rounded-md bg-muted/20 text-muted-foreground text-sm">
            Bitte speichern Sie den Kurs zuerst (oben rechts "Kurs speichern"), 
            um Dateien hochzuladen.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50">
      <CardHeader>
        <CardTitle className="text-base">Dateien und Kenntnisnahme</CardTitle>
        <CardDescription>Hochgeladene Dateien werden am Ende des Kurses angezeigt. Teilnehmer müssen den Download bestätigen.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="border border-dashed border-border rounded-md p-6 text-center bg-muted/10">
          <Upload className="h-6 w-6 mx-auto text-muted-foreground mb-3" />
          <Button variant="outline" size="sm" asChild disabled={isUploading}>
            <label className="cursor-pointer">
              {isUploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {isUploading ? 'Wird hochgeladen...' : 'Datei auswählen'}
              <input type="file" className="hidden" onChange={handleUpload} />
            </label>
          </Button>
        </div>

        {isLoading ? (
          <div className="py-8 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></div>
        ) : files.length > 0 ? (
          <div className="space-y-2 mt-4">
            {files.map(file => (
              <div key={file.id} className="flex items-center justify-between p-3 border rounded-md bg-card shadow-sm">
                <div className="flex items-center gap-3 overflow-hidden">
                  <div className="p-2 bg-primary/10 rounded">
                    <FileIcon className="h-5 w-5 text-primary flex-shrink-0" />
                  </div>
                  <div className="truncate">
                    <p className="text-sm font-medium truncate">{file.name}</p>
                    <p className="text-xs text-muted-foreground">{formatSize(file.size)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="sm" asChild className="h-8 w-8 p-0">
                    <a href={file.file_url} target="_blank" rel="noopener noreferrer">
                      <Download className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                    </a>
                  </Button>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => handleDelete(file.id, file.file_url)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 text-sm text-muted-foreground border rounded-md bg-muted/10 border-dashed">
            Noch keine Dateien hochgeladen.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
