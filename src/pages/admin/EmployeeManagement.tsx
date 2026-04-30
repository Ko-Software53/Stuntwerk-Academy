import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AddUserDialog } from '@/components/admin/AddUserDialog';
import { supabase } from '@/integrations/supabase/client';
import { Search, ChevronRight, Users, Download } from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

interface Employee {
  id: string; user_id: string; email: string; full_name: string | null;
  department: string | null; job_title: string | null; created_at: string;
  enrolledCourses: number; completedCourses: number;
}

export default function EmployeeManagement() {
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => { if (user && isAdmin) fetchEmployees(); }, [user, isAdmin]);

  const fetchEmployees = async () => {
    // Get admin user IDs first
    const { data: adminRoles } = await supabase.from('user_roles').select('user_id').eq('role', 'admin');
    const adminUserIds = adminRoles?.map(r => r.user_id) || [];

    // Get all profiles excluding admins
    let query = supabase.from('profiles').select('*').order('created_at', { ascending: false });
    if (adminUserIds.length > 0) {
      query = query.not('user_id', 'in', `(${adminUserIds.join(',')})`);
    }
    const { data: profiles } = await query;

    if (profiles) {
      // Fetch enrollment stats
      const { data: enrollments } = await supabase.from('enrollments').select('user_id, completed_at');
      const enrollmentMap: Record<string, { enrolled: number; completed: number }> = {};
      enrollments?.forEach(e => {
        if (!enrollmentMap[e.user_id]) enrollmentMap[e.user_id] = { enrolled: 0, completed: 0 };
        enrollmentMap[e.user_id].enrolled++;
        if (e.completed_at) enrollmentMap[e.user_id].completed++;
      });

      setEmployees(profiles.map(p => ({
        ...p,
        enrolledCourses: enrollmentMap[p.user_id]?.enrolled || 0,
        completedCourses: enrollmentMap[p.user_id]?.completed || 0,
      })));
    }
    setIsLoading(false);
  };

  const filtered = employees.filter(e =>
    e.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.department?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getInitials = (name: string | null) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const handleExportCSV = () => {
    const headers = ['Name', 'Email', 'Abteilung', 'Schulungsfortschritt', 'Beitrittsdatum'];

    const rows = filtered.map(employee => {
      const progress = employee.enrolledCourses > 0 
        ? `${Math.round((employee.completedCourses / employee.enrolledCourses) * 100)}%` 
        : '0%';
      const progressStr = `${employee.completedCourses}/${employee.enrolledCourses} (${progress})`;
      const joinedDate = new Date(employee.created_at).toLocaleDateString('de-DE');

      return [
        `"${(employee.full_name || 'Unbenannt').replace(/"/g, '""')}"`,
        `"${employee.email.replace(/"/g, '""')}"`,
        `"${(employee.department || '-').replace(/"/g, '""')}"`,
        `"${progressStr}"`,
        `"${joinedDate}"`
      ].join(',');
    });

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `mitarbeiter_uebersicht.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading || isLoading) {
    return <div className="flex items-center justify-center py-20"><div className="animate-pulse text-muted-foreground">Laden...</div></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Mitarbeiterverwaltung</h1>
        <p className="text-sm text-muted-foreground mt-1">Mitarbeiter anzeigen und verwalten</p>
      </div>

        <Card className="border-border/50">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between gap-4">
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="h-4 w-4" />
                Mitarbeiter ({employees.length})
              </CardTitle>
              <div className="flex items-center gap-3">
                <div className="relative w-56">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Suchen..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9 h-9 text-sm" />
                </div>
                {filtered.length > 0 && (
                  <Button variant="outline" size="sm" className="gap-2 h-9 border-border/50" onClick={handleExportCSV}>
                    <Download className="h-4 w-4 text-muted-foreground" />
                    <span className="hidden sm:inline">CSV Export</span>
                  </Button>
                )}
                <AddUserDialog onUserAdded={fetchEmployees} />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Mitarbeiter</TableHead>
                  <TableHead className="text-xs">Abteilung</TableHead>
                  <TableHead className="text-xs">Schulungsfortschritt</TableHead>
                  <TableHead className="text-xs">Beitritt</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((employee) => (
                  <TableRow key={employee.id} className="cursor-pointer hover:bg-muted/50" onClick={() => navigate(`/admin/employees/${employee.user_id}`)}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src="" />
                          <AvatarFallback className="bg-primary text-primary-foreground text-xs">{getInitials(employee.full_name)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">{employee.full_name || 'Unbenannt'}</p>
                          <p className="text-xs text-muted-foreground">{employee.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">{employee.department || '—'}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3 min-w-[120px]">
                        <Progress value={employee.enrolledCourses > 0 ? (employee.completedCourses / employee.enrolledCourses) * 100 : 0} className="h-1.5 flex-1" />
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {employee.completedCourses}/{employee.enrolledCourses}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{format(new Date(employee.created_at), 'd. MMM yyyy', { locale: de })}</TableCell>
                    <TableCell>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ))}
                {filtered.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground text-sm">
                      Keine Mitarbeiter gefunden
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
    </div>
  );
}
