import { Link, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Calendar,
  Users,
  Stethoscope,
  FileText,
  Settings,
  LogOut,
  Menu,
  X,
  Bell,
  Search,
  DollarSign,
  DoorOpen,
  ChevronDown,
  Building2,
} from 'lucide-react';
import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

// Define nav items with optional adminOnly flag
const mainNavItems = [
  { name: 'Agenda', href: '/admin/agenda', icon: Calendar, adminOnly: false },
];

// Grouped items for "Gestão" section
const managementItems = [
  { name: 'Funcionários', href: '/admin/funcionarios', icon: Users },
  { name: 'Financeiro', href: '/admin/financeiro', icon: DollarSign },
  { name: 'Pagamentos', href: '/admin/pagamentos', icon: DollarSign },
  { name: 'Salas', href: '/admin/salas', icon: DoorOpen },
];

const bottomNavItems = [
  { name: 'Serviços', href: '/admin/servicos', icon: Stethoscope, adminOnly: true },
  { name: 'Relatórios', href: '/admin/relatorios', icon: FileText, adminOnly: true },
  { name: 'Configurações', href: '/admin/configuracoes', icon: Settings, adminOnly: true },
];

interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [managementOpen, setManagementOpen] = useState(true);
  const { role, profile } = useAuth();
  
  // Check if current path is in management section
  const isInManagementSection = managementItems.some(item => location.pathname === item.href);

  // Get display name and initials
  const displayName = profile?.full_name || 'Usuário';
  const roleLabel = role === 'admin' ? 'Administrador' : 'Funcionário';
  const initials = displayName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

  // Filter items based on role
  const filteredBottomItems = useMemo(() => {
    if (role === 'admin') return bottomNavItems;
    return bottomNavItems.filter(item => !item.adminOnly);
  }, [role]);

  type NavItemType = { name: string; href: string; icon: React.ComponentType<{ className?: string }> };

  const NavItem = ({ item, onClick }: { item: NavItemType, onClick?: () => void }) => {
    const isActive = location.pathname === item.href;
    return (
      <Link
        to={item.href}
        onClick={onClick}
        className={cn(
          'flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all',
          isActive
            ? 'bg-clinic-primary/10 text-clinic-primary'
            : 'text-clinic-text-secondary hover:bg-clinic-surface hover:text-foreground'
        )}
      >
        <item.icon className="h-5 w-5" />
        {item.name}
      </Link>
    );
  };

  const SidebarContent = ({ onItemClick }: { onItemClick?: () => void }) => (
    <>
      {/* Main nav items */}
      <nav className="flex-1 p-4 space-y-1">
        {mainNavItems.map((item) => (
          <NavItem key={item.name} item={item} onClick={onItemClick} />
        ))}

        {/* Management Group - Only for admins */}
        {role === 'admin' && (
          <Collapsible
            open={managementOpen || isInManagementSection}
            onOpenChange={setManagementOpen}
            className="mt-4"
          >
            <CollapsibleTrigger className="flex items-center justify-between w-full px-4 py-3 rounded-xl text-sm font-medium text-clinic-text-secondary hover:bg-clinic-surface hover:text-foreground transition-all">
              <div className="flex items-center gap-3">
                <Building2 className="h-5 w-5" />
                <span>Gestão</span>
              </div>
              <ChevronDown className={cn(
                "h-4 w-4 transition-transform duration-200",
                (managementOpen || isInManagementSection) && "rotate-180"
              )} />
            </CollapsibleTrigger>
            <CollapsibleContent className="pl-4 mt-1 space-y-1">
              {managementItems.map((item) => (
                <NavItem key={item.name} item={item} onClick={onItemClick} />
              ))}
            </CollapsibleContent>
          </Collapsible>
        )}

        {/* Other nav items */}
        <div className="mt-4 pt-4 border-t border-clinic-border-subtle space-y-1">
          {filteredBottomItems.map((item) => (
            <NavItem key={item.name} item={item} onClick={onItemClick} />
          ))}
        </div>
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-clinic-border-subtle">
        <button
          onClick={() => navigate('/home')}
          className="flex items-center gap-3 w-full px-4 py-3 rounded-xl text-sm font-medium text-clinic-text-secondary hover:bg-clinic-surface hover:text-foreground transition-all"
        >
          <LogOut className="h-5 w-5" />
          Sair do Admin
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen flex bg-clinic-surface">
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 bg-background border-r border-clinic-border-subtle">
        {/* Logo */}
        <div className="h-16 flex items-center px-6 border-b border-clinic-border-subtle">
          <Link to="/home" className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl bg-clinic-primary flex items-center justify-center">
              <span className="text-base font-bold text-foreground">C</span>
            </div>
            <div>
              <span className="text-lg font-semibold">Clínica</span>
              <span className="text-lg font-light text-clinic-text-secondary">Vida</span>
            </div>
          </Link>
        </div>

        <SidebarContent />
      </aside>

      {/* Sidebar - Mobile */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-foreground/50"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="absolute left-0 top-0 bottom-0 w-72 bg-background animate-slide-in-left flex flex-col">
            {/* Logo */}
            <div className="h-16 flex items-center justify-between px-6 border-b border-clinic-border-subtle">
              <Link to="/home" className="flex items-center gap-2">
                <div className="h-9 w-9 rounded-xl bg-clinic-primary flex items-center justify-center">
                  <span className="text-base font-bold text-foreground">C</span>
                </div>
                <div>
                  <span className="text-lg font-semibold">Clínica</span>
                  <span className="text-lg font-light text-clinic-text-secondary">Vida</span>
                </div>
              </Link>
              <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(false)}>
                <X className="h-5 w-5" />
              </Button>
            </div>

            <SidebarContent onItemClick={() => setSidebarOpen(false)} />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-16 bg-background border-b border-clinic-border-subtle flex items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>

            <div className="hidden sm:flex items-center gap-2 bg-clinic-surface rounded-xl px-4 py-2 w-64">
              <Search className="h-4 w-4 text-clinic-text-muted" />
              <input
                type="text"
                placeholder="Buscar pacientes, consultas..."
                className="bg-transparent text-sm outline-none w-full placeholder:text-clinic-text-muted"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-5 w-5" />
              <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-destructive" />
            </Button>

            <div className="flex items-center gap-3">
              <div className="hidden sm:block text-right">
                <p className="text-sm font-medium">{displayName}</p>
                <p className="text-xs text-clinic-text-muted">{roleLabel}</p>
              </div>
              <div className="h-9 w-9 rounded-xl bg-clinic-primary flex items-center justify-center text-foreground font-medium">
                {initials}
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-6 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
