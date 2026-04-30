import { useEffect } from 'react';
import { Outlet, useLocation, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import {
    SidebarProvider, Sidebar, SidebarHeader, SidebarContent, SidebarFooter,
    SidebarMenu, SidebarMenuItem, SidebarMenuButton,
    SidebarInset, SidebarTrigger,
} from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { LayoutDashboard, LogOut, ChevronsUpDown, Award } from 'lucide-react';
import NdaAgreement from '@/components/NdaAgreement';

const navItems = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Zertifikate', href: '/certificates', icon: Award },
];

function isActive(pathname: string, href: string): boolean {
    return pathname.startsWith(href) && (pathname === href || pathname.startsWith(href + '/'));
}

const breadcrumbMap: Record<string, string> = {
    dashboard: 'Dashboard',
    certificates: 'Zertifikate',
};

function Breadcrumbs() {
    const { pathname } = useLocation();
    const segments = pathname.split('/').filter(Boolean);

    return (
        <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium">
            {segments.map((seg, i) => {
                const label = breadcrumbMap[seg] || seg;
                const isLast = i === segments.length - 1;
                return (
                    <span key={i} className="flex items-center gap-2">
                        {i > 0 && <span className="text-border/60">/</span>}
                        <span className={isLast ? 'text-foreground font-bold tracking-tight text-lg' : 'hover:text-foreground transition-colors'}>{label}</span>
                    </span>
                );
            })}
        </div>
    );
}

export default function StudentLayout() {
    const { user, profile, isAdmin, loading, signOut, refreshProfile } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        if (loading) return;
        if (!user) navigate('/auth');
        else if (isAdmin) navigate('/admin');
    }, [user, isAdmin, loading, navigate]);

    const handleSignOut = async () => {
        await signOut();
        navigate('/');
    };

    const getInitials = (name: string | null | undefined) => {
        if (!name) return 'U';
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    };

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-background">
                <div className="animate-pulse text-muted-foreground">Laden...</div>
            </div>
        );
    }

    if (!user || isAdmin) return null;

    const needsNda = profile && !profile.nda_accepted_at;

    return (
        <>
        {needsNda && (
            <NdaAgreement
                profileId={profile.id}
                onAccepted={() => refreshProfile()}
            />
        )}
        <SidebarProvider>
            <Sidebar variant="inset" className="border-r border-border/40 bg-card">
                <SidebarHeader className="pt-6 pb-2 px-6">
                    <Link to="/dashboard" className="flex items-center gap-3 group">
                        <img src="/stuntwerk-logo.svg" alt="Stuntwerk Academy" className="h-8 w-auto transition-transform group-hover:scale-105" />
                    </Link>
                </SidebarHeader>

                <SidebarContent className="px-3 pt-6 gap-2">
                    <SidebarMenu className="gap-1">
                        {navItems.map((item) => {
                            const active = isActive(location.pathname, item.href);
                            return (
                                <SidebarMenuItem key={item.href}>
                                    <SidebarMenuButton
                                        asChild
                                        isActive={active}
                                        className={`h-11 px-4 rounded-md transition-all duration-200 group ${
                                            active 
                                            ? 'bg-primary/10 text-primary font-bold hover:bg-primary/15 hover:text-primary' 
                                            : 'text-sidebar-foreground font-medium hover:bg-muted/60'
                                        }`}
                                    >
                                        <Link to={item.href} className="flex items-center gap-3">
                                            <item.icon className={`h-[18px] w-[18px] stroke-[2] ${active ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'}`} />
                                            <span>{item.label}</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            );
                        })}
                    </SidebarMenu>
                </SidebarContent>

                <SidebarFooter className="p-4 pb-6 mt-auto">
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <SidebarMenuButton size="lg" className="w-full rounded-md hover:bg-muted/60 transition-colors p-2 h-auto">
                                        <div className="flex items-center gap-3 w-full">
                                            <Avatar className="h-10 w-10 ring-2 ring-background shadow-sm">
                                                <AvatarImage src={profile?.avatar_url || ''} />
                                                <AvatarFallback className="bg-primary text-primary-foreground font-bold">
                                                    {getInitials(profile?.full_name)}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="flex flex-col min-w-0 flex-1 text-left">
                                                <span className="text-sm font-bold text-foreground truncate">{profile?.full_name || 'Mitarbeiter'}</span>
                                                <span className="text-xs text-muted-foreground font-medium truncate">{profile?.department || 'Abteilung'}</span>
                                            </div>
                                            <ChevronsUpDown className="h-4 w-4 text-muted-foreground/50 shrink-0" />
                                        </div>
                                    </SidebarMenuButton>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent side="right" align="end" className="w-56 rounded-md shadow-lg border-border/50">
                                    <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive font-medium cursor-pointer rounded-md">
                                        <LogOut className="mr-2 h-4 w-4" />
                                        Log out
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </SidebarFooter>
            </Sidebar>

            <SidebarInset className="bg-[#fcfdff]">
                <header className="flex h-16 shrink-0 items-center gap-4 bg-[#fcfdff]/80 backdrop-blur-sm sticky top-0 z-10 px-6">
                    <SidebarTrigger className="-ml-2 text-muted-foreground hover:text-foreground transition-colors" />
                    <Separator orientation="vertical" className="h-6 border-border/40" />
                    <Breadcrumbs />
                </header>

                <main className="flex-1 p-6 md:p-8 w-full max-w-[1600px] mx-auto">
                    <Outlet />
                </main>
            </SidebarInset>
        </SidebarProvider>
        </>
    );
}
