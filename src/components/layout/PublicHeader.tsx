import { Link, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Menu, X, Phone, MapPin, Clock } from 'lucide-react';
import { useState } from 'react';

const navItems = [
  { name: 'Início', href: '/' },
  { name: 'Especialidades', href: '/especialidades' },
  { name: 'Profissionais', href: '/profissionais' },
  { name: 'Agendamento', href: '/agendar' },
];

export function PublicHeader() {
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <>
      {/* Top bar */}
      <div className="hidden md:block bg-clinic-surface border-b border-clinic-border-subtle">
        <div className="container py-2">
          <div className="flex items-center justify-between text-sm text-clinic-text-secondary">
            <div className="flex items-center gap-6">
              <span className="flex items-center gap-2">
                <Phone className="h-3.5 w-3.5" />
                (11) 3456-7890
              </span>
              <span className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5" />
                Av. Paulista, 1000 - São Paulo
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-3.5 w-3.5" />
              Seg-Sex: 8h às 18h | Sáb: 8h às 12h
            </div>
          </div>
        </div>
      </div>

      {/* Main header */}
      <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-clinic-border-subtle">
        <div className="container">
          <div className="flex h-16 items-center justify-between">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-2">
              <div className="h-10 w-10 rounded-xl bg-clinic-primary flex items-center justify-center">
                <span className="text-lg font-bold text-foreground">C</span>
              </div>
              <div className="hidden sm:block">
                <span className="text-xl font-semibold text-foreground">Clínica</span>
                <span className="text-xl font-light text-clinic-text-secondary">Vida</span>
              </div>
            </Link>

            {/* Desktop nav */}
            <nav className="hidden md:flex items-center gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className={cn(
                    'px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
                    location.pathname === item.href
                      ? 'bg-clinic-primary/10 text-clinic-primary'
                      : 'text-clinic-text-secondary hover:text-foreground hover:bg-clinic-surface'
                  )}
                >
                  {item.name}
                </Link>
              ))}
            </nav>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <Link to="/admin" className="hidden sm:block">
                <Button variant="ghost" size="sm">
                  Área Admin
                </Button>
              </Link>
              <Link to="/agendar">
                <Button variant="clinic" size="sm">
                  Agendar Consulta
                </Button>
              </Link>

              {/* Mobile menu button */}
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              >
                {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-clinic-border-subtle bg-background animate-fade-in-down">
            <nav className="container py-4 flex flex-col gap-1">
              {navItems.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    'px-4 py-3 rounded-lg text-sm font-medium transition-all',
                    location.pathname === item.href
                      ? 'bg-clinic-primary/10 text-clinic-primary'
                      : 'text-clinic-text-secondary hover:bg-clinic-surface'
                  )}
                >
                  {item.name}
                </Link>
              ))}
              <Link
                to="/admin"
                onClick={() => setMobileMenuOpen(false)}
                className="px-4 py-3 rounded-lg text-sm font-medium text-clinic-text-secondary hover:bg-clinic-surface"
              >
                Área Admin
              </Link>
            </nav>
          </div>
        )}
      </header>
    </>
  );
}
