import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { specialties } from '@/data/mockData';
import { 
  Stethoscope, 
  Heart, 
  Sparkles, 
  Baby, 
  Bone, 
  Eye, 
  HeartPulse, 
  Brain,
  ArrowRight,
  Clock,
} from 'lucide-react';

const iconMap: Record<string, React.ReactNode> = {
  Stethoscope: <Stethoscope className="h-8 w-8" />,
  Heart: <Heart className="h-8 w-8" />,
  Sparkles: <Sparkles className="h-8 w-8" />,
  Baby: <Baby className="h-8 w-8" />,
  Bone: <Bone className="h-8 w-8" />,
  Eye: <Eye className="h-8 w-8" />,
  HeartPulse: <HeartPulse className="h-8 w-8" />,
  Brain: <Brain className="h-8 w-8" />,
};

export default function SpecialtiesPage() {
  return (
    <PublicLayout>
      {/* Hero */}
      <section className="py-16 bg-clinic-surface">
        <div className="container">
          <div className="max-w-2xl">
            <h1 className="text-4xl font-bold mb-4">Nossas Especialidades</h1>
            <p className="text-lg text-clinic-text-secondary">
              Contamos com uma equipe multidisciplinar de profissionais 
              altamente qualificados para cuidar da sua saúde de forma completa.
            </p>
          </div>
        </div>
      </section>

      {/* Specialties Grid */}
      <section className="py-16">
        <div className="container">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {specialties.map((specialty) => (
              <div
                key={specialty.id}
                className="group bg-background border border-clinic-border-subtle rounded-2xl p-8 hover:border-clinic-primary hover:shadow-clinic-lg transition-all"
              >
                <div className="h-16 w-16 rounded-2xl bg-clinic-primary/10 flex items-center justify-center text-clinic-primary mb-6 group-hover:bg-clinic-primary group-hover:text-foreground transition-colors">
                  {iconMap[specialty.icon] || <Stethoscope className="h-8 w-8" />}
                </div>
                
                <h3 className="text-xl font-semibold mb-2">{specialty.name}</h3>
                <p className="text-clinic-text-secondary mb-6">{specialty.description}</p>
                
                <div className="flex items-center gap-4 mb-6 text-sm">
                  <div className="flex items-center gap-2 text-clinic-text-muted">
                    <Clock className="h-4 w-4" />
                    {specialty.duration} min
                  </div>
                  <div className="h-4 w-px bg-clinic-border-default" />
                  <div className="font-semibold text-clinic-primary">
                    R$ {specialty.price.toFixed(2)}
                  </div>
                </div>

                <Link to={`/agendar?especialidade=${specialty.id}`}>
                  <Button variant="clinic-outline" className="w-full group/btn">
                    Agendar Consulta
                    <ArrowRight className="h-4 w-4 transition-transform group-hover/btn:translate-x-1" />
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-clinic-surface">
        <div className="container">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold mb-4">Não encontrou o que procura?</h2>
            <p className="text-clinic-text-secondary mb-6">
              Entre em contato conosco para saber mais sobre outras 
              especialidades e serviços disponíveis.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a href="https://wa.me/5511999999999" target="_blank" rel="noopener noreferrer">
                <Button variant="clinic" size="lg">
                  Falar via WhatsApp
                </Button>
              </a>
              <a href="tel:+551134567890">
                <Button variant="outline" size="lg">
                  Ligar para a Clínica
                </Button>
              </a>
            </div>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
