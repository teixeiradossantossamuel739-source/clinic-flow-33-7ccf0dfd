import { ReactNode, useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useAppointmentNotifications } from '@/hooks/useAppointmentNotifications';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { NavLink } from '@/components/NavLink';
import { Badge } from '@/components/ui/badge';
import { 
  LayoutDashboard, 
  Calendar, 
  DollarSign, 
  Clock, 
  User, 
  Users,
  LogOut,
  Menu,
  Stethoscope,
  Bell,
  Settings
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface FuncionarioLayoutProps {
  children: ReactNode;
}

interface PendingCounts {
  pending: number;
  awaitingConfirmation: number;
}

const menuItems = [
  { title: 'Meu Painel', url: '/funcionario', icon: LayoutDashboard, showBadge: 'pending' },
  { title: 'Minha Agenda', url: '/funcionario/agenda', icon: Calendar, showBadge: 'all' },
  { title: 'Meus Pacientes', url: '/funcionario/pacientes', icon: Users },
  { title: 'Financeiro', url: '/funcionario/financeiro', icon: DollarSign },
  { title: 'Disponibilidade', url: '/funcionario/disponibilidade', icon: Clock },
  { title: 'Meu Perfil', url: '/funcionario/perfil', icon: User },
  { title: 'Configurações', url: '/funcionario/configuracoes', icon: Settings },
];

export function FuncionarioLayout({ children }: FuncionarioLayoutProps) {
  const { user, profile, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [professionalId, setProfessionalId] = useState<string | null>(null);
  const [pendingCounts, setPendingCounts] = useState<PendingCounts>({ pending: 0, awaitingConfirmation: 0 });

  // Fetch professional ID and pending counts
  useEffect(() => {
    const fetchProfessionalData = async () => {
      if (!user) return;
      
      const { data: profData } = await supabase
        .from('professionals')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (profData) {
        setProfessionalId(profData.id);
        
        // Fetch pending appointments count
        const { data: pendingApts } = await supabase
          .from('appointments')
          .select('status')
          .eq('professional_uuid', profData.id)
          .in('status', ['pending', 'awaiting_confirmation', 'rescheduled']);

        if (pendingApts) {
          const pending = pendingApts.filter(apt => 
            apt.status === 'pending' || apt.status === 'rescheduled'
          ).length;
          const awaitingConfirmation = pendingApts.filter(apt => 
            apt.status === 'awaiting_confirmation'
          ).length;
          
          setPendingCounts({ pending, awaitingConfirmation });
        }
      }
    };

    fetchProfessionalData();
  }, [user]);

  // Subscribe to real-time updates for pending counts
  useEffect(() => {
    if (!professionalId) return;

    const channel = supabase
      .channel(`pending-counts-${professionalId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments',
          filter: `professional_uuid=eq.${professionalId}`,
        },
        async () => {
          // Refetch counts on any appointment change
          const { data: pendingApts } = await supabase
            .from('appointments')
            .select('status')
            .eq('professional_uuid', professionalId)
            .in('status', ['pending', 'awaiting_confirmation', 'rescheduled']);

          if (pendingApts) {
            const pending = pendingApts.filter(apt => 
              apt.status === 'pending' || apt.status === 'rescheduled'
            ).length;
            const awaitingConfirmation = pendingApts.filter(apt => 
              apt.status === 'awaiting_confirmation'
            ).length;
            
            setPendingCounts({ pending, awaitingConfirmation });
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [professionalId]);

  // Enable real-time notifications for this professional
  useAppointmentNotifications(professionalId);

  const handleSignOut = async () => {
    await signOut();
    navigate('/home');
  };

  const getInitials = (name: string | null | undefined) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const totalPending = pendingCounts.pending + pendingCounts.awaitingConfirmation;

  const getBadgeCount = (badgeType?: string) => {
    if (badgeType === 'pending') return pendingCounts.pending + pendingCounts.awaitingConfirmation;
    if (badgeType === 'all') return totalPending;
    return 0;
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <Sidebar className="border-r border-border">
          <div className="p-4 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center relative">
                <Stethoscope className="h-5 w-5 text-primary" />
                {totalPending > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center animate-pulse">
                    {totalPending > 9 ? '9+' : totalPending}
                  </span>
                )}
              </div>
              <div className="flex flex-col">
                <span className="font-semibold text-foreground">Minha Área</span>
                <span className="text-xs text-muted-foreground">Funcionário</span>
              </div>
            </div>
          </div>

          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Menu</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {menuItems.map((item) => {
                    const badgeCount = getBadgeCount(item.showBadge);
                    
                    return (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton asChild>
                          <NavLink 
                            to={item.url} 
                            end={item.url === '/funcionario'}
                            className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg transition-colors hover:bg-muted group"
                            activeClassName="bg-primary/10 text-primary font-medium"
                          >
                            <div className="flex items-center gap-3">
                              <item.icon className="h-4 w-4" />
                              <span>{item.title}</span>
                            </div>
                            {badgeCount > 0 && (
                              <Badge 
                                variant="destructive" 
                                className="h-5 min-w-5 px-1.5 text-xs font-bold animate-pulse"
                              >
                                {badgeCount > 99 ? '99+' : badgeCount}
                              </Badge>
                            )}
                          </NavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <div className="mt-auto p-4 border-t border-border">
            <div className="flex items-center gap-3 mb-4">
              <Avatar className="h-10 w-10">
                <AvatarImage src={profile?.avatar_url || ''} />
                <AvatarFallback className="bg-primary/10 text-primary">
                  {getInitials(profile?.full_name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col flex-1 min-w-0">
                <span className="font-medium text-sm text-foreground truncate">
                  {profile?.full_name || 'Usuário'}
                </span>
                <span className="text-xs text-muted-foreground truncate">
                  {user?.email}
                </span>
              </div>
            </div>
            <Button 
              variant="outline" 
              className="w-full justify-start gap-2"
              onClick={handleSignOut}
            >
              <LogOut className="h-4 w-4" />
              Sair
            </Button>
          </div>
        </Sidebar>

        <div className="flex-1 flex flex-col">
          <header className="h-14 border-b border-border flex items-center justify-between px-4 bg-background">
            <div className="flex items-center gap-4">
              <SidebarTrigger>
                <Menu className="h-5 w-5" />
              </SidebarTrigger>
              <h1 className="text-lg font-semibold text-foreground">
                {menuItems.find((item) => 
                  item.url === '/funcionario' 
                    ? location.pathname === '/funcionario'
                    : location.pathname.startsWith(item.url)
                )?.title || 'Meu Painel'}
              </h1>
            </div>
            
            {totalPending > 0 && (
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/20">
                <Bell className="h-4 w-4 text-red-500" />
                <span className="text-sm font-medium text-red-600">
                  {totalPending} {totalPending === 1 ? 'pendente' : 'pendentes'}
                </span>
              </div>
            )}
          </header>

          <main className="flex-1 overflow-auto p-6 bg-muted/30">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
