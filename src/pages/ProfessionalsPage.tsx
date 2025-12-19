import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { professionals } from '@/data/mockData';
import { Star, Calendar, ArrowRight } from 'lucide-react';

export default function ProfessionalsPage() {
  return (
    <PublicLayout>
      {/* Hero */}
      <section className="py-16 bg-clinic-surface">
        <div className="container">
          <div className="max-w-2xl">
            <h1 className="text-4xl font-bold mb-4">Nossos Profissionais</h1>
            <p className="text-lg text-clinic-text-secondary">
              Conheça a equipe de especialistas dedicados a cuidar da sua saúde 
              com excelência, ética e carinho.
            </p>
          </div>
        </div>
      </section>

      {/* Professionals Grid */}
      <section className="py-16">
        <div className="container">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {professionals.map((professional) => (
              <div
                key={professional.id}
                className="bg-background border border-clinic-border-subtle rounded-2xl overflow-hidden hover:shadow-clinic-lg transition-all hover-lift"
              >
                <div className="aspect-[4/3] relative">
                  <img
                    src={professional.avatar}
                    alt={professional.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-foreground/80 via-foreground/20 to-transparent" />
                  <div className="absolute bottom-4 left-4 right-4 text-background">
                    <p className="font-semibold text-lg">{professional.name}</p>
                    <p className="text-sm opacity-80">{professional.specialty}</p>
                  </div>
                </div>
                
                <div className="p-5 space-y-4">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-warning text-warning" />
                      <span className="font-medium">{professional.rating}</span>
                      <span className="text-clinic-text-muted">({professional.reviewCount} avaliações)</span>
                    </div>
                  </div>

                  <p className="text-sm text-clinic-text-muted">{professional.crm}</p>
                  
                  <p className="text-sm text-clinic-text-secondary line-clamp-2">
                    {professional.bio}
                  </p>

                  <div className="flex flex-wrap gap-1">
                    {professional.availableDays.slice(0, 3).map((day) => (
                      <span
                        key={day}
                        className="text-xs px-2 py-1 rounded-md bg-clinic-surface text-clinic-text-muted"
                      >
                        {day.slice(0, 3)}
                      </span>
                    ))}
                    {professional.availableDays.length > 3 && (
                      <span className="text-xs px-2 py-1 rounded-md bg-clinic-surface text-clinic-text-muted">
                        +{professional.availableDays.length - 3}
                      </span>
                    )}
                  </div>

                  <Link to={`/agendar?profissional=${professional.id}`}>
                    <Button variant="clinic" className="w-full" size="sm">
                      <Calendar className="h-4 w-4" />
                      Agendar Consulta
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-clinic-surface">
        <div className="container">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold mb-4">Pronto para agendar?</h2>
            <p className="text-clinic-text-secondary mb-6">
              Escolha o profissional ideal para você e agende sua consulta 
              de forma rápida e prática.
            </p>
            <Link to="/agendar">
              <Button variant="clinic" size="lg">
                Agendar Agora
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
