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
import { 
  LayoutDashboard, 
  Calendar, 
  DollarSign, 
  Clock, 
  User, 
  Users,
  LogOut,
  Menu,
  Stethoscope
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface FuncionarioLayoutProps {
  children: ReactNode;
}

const menuItems = [
  { title: 'Meu Painel', url: '/funcionario', icon: LayoutDashboard },
  { title: 'Minha Agenda', url: '/funcionario/agenda', icon: Calendar },
  { title: 'Meus Pacientes', url: '/funcionario/pacientes', icon: Users },
  { title: 'Financeiro', url: '/funcionario/financeiro', icon: DollarSign },
  { title: 'Disponibilidade', url: '/funcionario/disponibilidade', icon: Clock },
  { title: 'Meu Perfil', url: '/funcionario/perfil', icon: User },
];

export function FuncionarioLayout({ children }: FuncionarioLayoutProps) {
  const { user, profile, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [professionalId, setProfessionalId] = useState<string | null>(null);

  // Fetch professional ID for the logged-in user
  useEffect(() => {
    const fetchProfessionalId = async () => {
      if (!user) return;
      
      const { data } = await supabase
        .from('professionals')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (data) {
        setProfessionalId(data.id);
      }
    };

    fetchProfessionalId();
  }, [user]);

  // Enable real-time notifications for this professional
  useAppointmentNotifications(professionalId);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
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

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <Sidebar className="border-r border-border">
          <div className="p-4 border-b border-border">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <Stethoscope className="h-5 w-5 text-primary" />
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
                  {menuItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton asChild>
                        <NavLink 
                          to={item.url} 
                          end={item.url === '/funcionario'}
                          className="flex items-center gap-3 px-3 py-2 rounded-lg transition-colors hover:bg-muted"
                          activeClassName="bg-primary/10 text-primary font-medium"
                        >
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
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
          <header className="h-14 border-b border-border flex items-center px-4 gap-4 bg-background">
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
          </header>

          <main className="flex-1 overflow-auto p-6 bg-muted/30">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
