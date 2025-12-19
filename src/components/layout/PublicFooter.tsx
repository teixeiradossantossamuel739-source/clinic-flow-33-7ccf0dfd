import { Link } from 'react-router-dom';
import { Phone, Mail, MapPin, Clock, Instagram, Facebook, Linkedin } from 'lucide-react';

export function PublicFooter() {
  return (
    <footer className="bg-foreground text-background">
      <div className="container py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
          {/* Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="h-10 w-10 rounded-xl bg-clinic-primary flex items-center justify-center">
                <span className="text-lg font-bold text-foreground">C</span>
              </div>
              <div>
                <span className="text-xl font-semibold">Clínica</span>
                <span className="text-xl font-light opacity-70">Vida</span>
              </div>
            </div>
            <p className="text-sm opacity-70 leading-relaxed">
              Cuidando da sua saúde com excelência e carinho há mais de 15 anos. 
              Nossa equipe de especialistas está pronta para atender você.
            </p>
            <div className="flex gap-3">
              <a href="#" className="h-9 w-9 rounded-lg bg-background/10 flex items-center justify-center hover:bg-clinic-primary transition-colors">
                <Instagram className="h-4 w-4" />
              </a>
              <a href="#" className="h-9 w-9 rounded-lg bg-background/10 flex items-center justify-center hover:bg-clinic-primary transition-colors">
                <Facebook className="h-4 w-4" />
              </a>
              <a href="#" className="h-9 w-9 rounded-lg bg-background/10 flex items-center justify-center hover:bg-clinic-primary transition-colors">
                <Linkedin className="h-4 w-4" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h4 className="font-semibold">Links Rápidos</h4>
            <nav className="flex flex-col gap-2 text-sm opacity-70">
              <Link to="/especialidades" className="hover:opacity-100 transition-opacity">Especialidades</Link>
              <Link to="/profissionais" className="hover:opacity-100 transition-opacity">Nossos Médicos</Link>
              <Link to="/agendar" className="hover:opacity-100 transition-opacity">Agendar Consulta</Link>
              <Link to="/install" className="hover:opacity-100 transition-opacity">Baixar App</Link>
            </nav>
          </div>

          {/* Specialties */}
          <div className="space-y-4">
            <h4 className="font-semibold">Especialidades</h4>
            <nav className="flex flex-col gap-2 text-sm opacity-70">
              <span>Clínica Geral</span>
              <span>Cardiologia</span>
              <span>Dermatologia</span>
              <span>Pediatria</span>
              <span>Ortopedia</span>
            </nav>
          </div>

          {/* Contact */}
          <div className="space-y-4">
            <h4 className="font-semibold">Contato</h4>
            <div className="space-y-3 text-sm opacity-70">
              <p className="flex items-start gap-3">
                <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
                Av. Paulista, 1000 - Bela Vista, São Paulo - SP, 01310-100
              </p>
              <p className="flex items-center gap-3">
                <Phone className="h-4 w-4 shrink-0" />
                (11) 3456-7890
              </p>
              <p className="flex items-center gap-3">
                <Mail className="h-4 w-4 shrink-0" />
                contato@clinicavida.com.br
              </p>
              <p className="flex items-start gap-3">
                <Clock className="h-4 w-4 mt-0.5 shrink-0" />
                <span>
                  Seg-Sex: 8h às 18h<br />
                  Sáb: 8h às 12h
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom */}
      <div className="border-t border-background/10">
        <div className="container py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm opacity-60">
          <p>© 2024 Clínica Vida. Todos os direitos reservados.</p>
          <div className="flex gap-6">
            <a href="#" className="hover:opacity-100">Privacidade</a>
            <a href="#" className="hover:opacity-100">Termos</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
