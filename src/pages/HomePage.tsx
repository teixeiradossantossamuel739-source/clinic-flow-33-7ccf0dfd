import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { specialties, professionals, dashboardStats } from '@/data/mockData';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { format, parseISO, isToday, isTomorrow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Calendar, 
  Clock, 
  Star, 
  Users, 
  Shield, 
  Heart,
  ArrowRight,
  CheckCircle2,
  Stethoscope,
  Baby,
  Eye,
  Brain,
  Bone,
  Sparkles,
  HeartPulse,
  UserCircle,
  CalendarClock,
  Loader2
} from 'lucide-react';

interface UpcomingAppointment {
  id: string;
  appointment_date: string;
  appointment_time: string;
  professional_id: string;
  status: string;
}

const iconMap: Record<string, React.ReactNode> = {
  Stethoscope: <Stethoscope className="h-6 w-6" />,
  Heart: <Heart className="h-6 w-6" />,
  Sparkles: <Sparkles className="h-6 w-6" />,
  Baby: <Baby className="h-6 w-6" />,
  Bone: <Bone className="h-6 w-6" />,
  Eye: <Eye className="h-6 w-6" />,
  HeartPulse: <HeartPulse className="h-6 w-6" />,
  Brain: <Brain className="h-6 w-6" />,
};

const features = [
  {
    icon: <Calendar className="h-5 w-5" />,
    title: 'Agendamento Online',
    description: 'Marque sua consulta em poucos cliques, 24h por dia',
  },
  {
    icon: <Clock className="h-5 w-5" />,
    title: 'Confirmação Automática',
    description: 'Receba lembretes via WhatsApp antes da consulta',
  },
  {
    icon: <Shield className="h-5 w-5" />,
    title: 'Prontuário Digital',
    description: 'Seu histórico médico seguro e acessível',
  },
  {
    icon: <Users className="h-5 w-5" />,
    title: 'Equipe Especializada',
    description: 'Profissionais qualificados em diversas áreas',
  },
];

const stats = [
  { value: '15+', label: 'Anos de experiência' },
  { value: '50k+', label: 'Pacientes atendidos' },
  { value: '8', label: 'Especialidades' },
  { value: '4.9', label: 'Avaliação média' },
];

const formatDateLabel = (dateStr: string) => {
  const date = parseISO(dateStr);
  if (isToday(date)) return 'Hoje';
  if (isTomorrow(date)) return 'Amanhã';
  return format(date, "dd 'de' MMM", { locale: ptBR });
};

export default function HomePage() {
  const { user, profile } = useAuth();
  const firstName = profile?.full_name?.split(' ')[0] || '';
  const [upcomingAppointments, setUpcomingAppointments] = useState<UpcomingAppointment[]>([]);
  const [loadingAppointments, setLoadingAppointments] = useState(false);

  useEffect(() => {
    const fetchUpcomingAppointments = async () => {
      if (!user?.email) return;
      
      setLoadingAppointments(true);
      try {
        const today = new Date().toISOString().split('T')[0];
        const { data } = await supabase
          .from('appointments')
          .select('id, appointment_date, appointment_time, professional_id, status')
          .eq('patient_email', user.email.toLowerCase())
          .gte('appointment_date', today)
          .neq('status', 'cancelled')
          .order('appointment_date', { ascending: true })
          .order('appointment_time', { ascending: true })
          .limit(3);
        
        setUpcomingAppointments(data || []);
      } catch (error) {
        console.error('Erro ao buscar consultas:', error);
      } finally {
        setLoadingAppointments(false);
      }
    };

    fetchUpcomingAppointments();
  }, [user?.email]);

  return (
    <PublicLayout>
      {/* Welcome Section for Logged Users */}
      {user && firstName && (
        <section className="bg-gradient-to-r from-clinic-primary/10 via-clinic-primary/5 to-transparent border-b border-clinic-border-subtle animate-fade-in">
          <div className="container py-4">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-clinic-primary/20 flex items-center justify-center">
                  <UserCircle className="h-7 w-7 text-clinic-primary" />
                </div>
                <div>
                  <p className="text-lg font-semibold text-foreground">
                    Bem-vindo(a) de volta, <span className="text-clinic-primary">{firstName}</span>!
                  </p>
                  <p className="text-sm text-clinic-text-secondary">
                    Estamos felizes em ter você aqui
                  </p>
                </div>
              </div>

              {/* Upcoming Appointments Summary */}
              <div className="flex items-center gap-4 flex-wrap">
                {loadingAppointments ? (
                  <div className="flex items-center gap-2 text-sm text-clinic-text-muted">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Carregando...
                  </div>
                ) : upcomingAppointments.length > 0 ? (
                  <div className="flex items-center gap-3 bg-background/60 rounded-xl px-4 py-2 border border-clinic-border-subtle">
                    <CalendarClock className="h-5 w-5 text-clinic-primary" />
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-clinic-text-secondary">Próximas:</span>
                      {upcomingAppointments.slice(0, 2).map((apt, idx) => (
                        <span key={apt.id} className="inline-flex items-center gap-1">
                          {idx > 0 && <span className="text-clinic-text-muted">•</span>}
                          <span className="font-medium text-foreground">
                            {formatDateLabel(apt.appointment_date)}
                          </span>
                          <span className="text-clinic-primary">
                            {apt.appointment_time.slice(0, 5)}
                          </span>
                        </span>
                      ))}
                      {upcomingAppointments.length > 2 && (
                        <span className="text-clinic-text-muted">
                          +{upcomingAppointments.length - 2}
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-sm text-clinic-text-muted bg-background/60 rounded-xl px-4 py-2 border border-clinic-border-subtle">
                    <Calendar className="h-4 w-4" />
                    Nenhuma consulta agendada
                  </div>
                )}

                <div className="flex gap-2">
                  <Link to="/minhas-consultas">
                    <Button variant="clinic-outline" size="sm">
                      Minhas Consultas
                    </Button>
                  </Link>
                  <Link to="/agendar">
                    <Button variant="clinic" size="sm">
                      Agendar Nova
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Hero Section */}
      <section className="relative gradient-hero overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(197_55%_70%/0.1),transparent_50%)]" />
        <div className="container relative py-20 lg:py-32">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8 animate-fade-in-up">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-clinic-primary/10 text-clinic-primary text-sm font-medium">
                <CheckCircle2 className="h-4 w-4" />
                Agendamento online disponível
              </div>
              
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight text-balance">
                Sua saúde em{' '}
                <span className="text-clinic-primary">boas mãos</span>
              </h1>
              
              <p className="text-lg text-clinic-text-secondary max-w-lg leading-relaxed">
                Agende sua consulta com os melhores especialistas. 
                Atendimento humanizado, tecnologia de ponta e cuidado integral 
                para você e sua família.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <Link to="/agendar">
                  <Button variant="hero" size="xl" className="w-full sm:w-auto group">
                    Agendar Consulta
                    <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                  </Button>
                </Link>
                <Link to="/especialidades">
                  <Button variant="hero-outline" size="xl" className="w-full sm:w-auto">
                    Ver Especialidades
                  </Button>
                </Link>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 pt-8 border-t border-clinic-border-subtle">
                {stats.map((stat) => (
                  <div key={stat.label} className="text-center sm:text-left">
                    <p className="text-2xl md:text-3xl font-bold text-clinic-primary">{stat.value}</p>
                    <p className="text-sm text-clinic-text-muted">{stat.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Hero Image/Illustration */}
            <div className="hidden lg:block relative">
              <div className="absolute -inset-4 bg-clinic-primary/5 rounded-3xl blur-3xl" />
              <div className="relative bg-background rounded-3xl shadow-clinic-xl p-8 space-y-6">
                <div className="flex items-center gap-4">
                  <img
                    src={professionals[0].avatar}
                    alt={professionals[0].name}
                    className="h-16 w-16 rounded-2xl object-cover"
                  />
                  <div>
                    <p className="font-semibold">{professionals[0].name}</p>
                    <p className="text-sm text-clinic-text-secondary">{professionals[0].specialty}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <Star className="h-4 w-4 fill-warning text-warning" />
                      <span className="text-sm font-medium">{professionals[0].rating}</span>
                      <span className="text-sm text-clinic-text-muted">({professionals[0].reviewCount} avaliações)</span>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-2">
                  {['09:00', '10:30', '14:00'].map((time) => (
                    <button
                      key={time}
                      className="py-3 px-4 rounded-xl border border-clinic-border-default hover:border-clinic-primary hover:bg-clinic-primary/5 transition-all text-sm font-medium"
                    >
                      {time}
                    </button>
                  ))}
                </div>

                <Button variant="clinic" className="w-full" size="lg">
                  Confirmar Horário
                </Button>

                {/* Floating cards */}
                <div className="absolute -right-6 top-1/4 bg-background rounded-2xl shadow-clinic-lg p-4 animate-float">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-success/10 flex items-center justify-center">
                      <CheckCircle2 className="h-5 w-5 text-success" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Consulta Confirmada</p>
                      <p className="text-xs text-clinic-text-muted">Dr. Ricardo - 09:30</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-clinic-surface">
        <div className="container">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-3xl font-bold mb-4">Por que escolher a Clínica Vida?</h2>
            <p className="text-clinic-text-secondary">
              Oferecemos uma experiência completa de cuidado com a saúde, 
              combinando tecnologia e atendimento humanizado.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="bg-background rounded-2xl p-6 shadow-clinic-sm hover:shadow-clinic-md transition-all hover-lift"
              >
                <div className="h-12 w-12 rounded-xl bg-clinic-primary/10 flex items-center justify-center text-clinic-primary mb-4">
                  {feature.icon}
                </div>
                <h3 className="font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-clinic-text-secondary">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Specialties Section */}
      <section className="py-20">
        <div className="container">
          <div className="flex items-end justify-between mb-12">
            <div>
              <h2 className="text-3xl font-bold mb-2">Nossas Especialidades</h2>
              <p className="text-clinic-text-secondary">
                Contamos com profissionais em diversas áreas para cuidar da sua saúde.
              </p>
            </div>
            <Link to="/especialidades" className="hidden md:block">
              <Button variant="outline">
                Ver todas
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {specialties.slice(0, 8).map((specialty) => (
              <Link
                key={specialty.id}
                to={`/agendar?especialidade=${specialty.id}`}
                className="group bg-background border border-clinic-border-subtle rounded-2xl p-6 hover:border-clinic-primary hover:shadow-clinic-md transition-all"
              >
                <div className="h-12 w-12 rounded-xl bg-clinic-primary/10 flex items-center justify-center text-clinic-primary mb-4 group-hover:bg-clinic-primary group-hover:text-foreground transition-colors">
                  {iconMap[specialty.icon] || <Stethoscope className="h-6 w-6" />}
                </div>
                <h3 className="font-semibold mb-1">{specialty.name}</h3>
                <p className="text-sm text-clinic-text-muted line-clamp-2">{specialty.description}</p>
                <div className="mt-4 flex items-center justify-between text-sm">
                  <span className="text-clinic-text-secondary">{specialty.duration} min</span>
                  <span className="font-semibold text-clinic-primary">
                    R$ {specialty.price.toFixed(2)}
                  </span>
                </div>
              </Link>
            ))}
          </div>

          <div className="mt-8 text-center md:hidden">
            <Link to="/especialidades">
              <Button variant="outline">
                Ver todas as especialidades
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Professionals Section */}
      <section className="py-20 bg-clinic-surface">
        <div className="container">
          <div className="flex items-end justify-between mb-12">
            <div>
              <h2 className="text-3xl font-bold mb-2">Nossos Especialistas</h2>
              <p className="text-clinic-text-secondary">
                Conheça a equipe de profissionais que vai cuidar de você.
              </p>
            </div>
            <Link to="/profissionais" className="hidden md:block">
              <Button variant="outline">
                Ver equipe completa
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {professionals.slice(0, 4).map((professional) => (
              <div
                key={professional.id}
                className="bg-background rounded-2xl overflow-hidden shadow-clinic-sm hover:shadow-clinic-md transition-all hover-lift"
              >
                <div className="aspect-[4/3] relative">
                  <img
                    src={professional.avatar}
                    alt={professional.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-foreground/60 to-transparent" />
                  <div className="absolute bottom-4 left-4 right-4 text-background">
                    <p className="font-semibold">{professional.name}</p>
                    <p className="text-sm opacity-80">{professional.specialty}</p>
                  </div>
                </div>
                <div className="p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 fill-warning text-warning" />
                      <span className="text-sm font-medium">{professional.rating}</span>
                      <span className="text-sm text-clinic-text-muted">({professional.reviewCount})</span>
                    </div>
                    <span className="text-xs text-clinic-text-muted">{professional.crm}</span>
                  </div>
                  <Link to={`/agendar?profissional=${professional.id}`}>
                    <Button variant="clinic-outline" size="sm" className="w-full">
                      Agendar Consulta
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-8 text-center md:hidden">
            <Link to="/profissionais">
              <Button variant="outline">
                Ver equipe completa
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container">
          <div className="relative bg-foreground rounded-3xl overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,hsl(197_55%_70%/0.2),transparent_50%)]" />
            <div className="relative px-8 py-16 md:px-16 md:py-20 text-center">
              <h2 className="text-3xl md:text-4xl font-bold text-background mb-4">
                Agende sua consulta agora
              </h2>
              <p className="text-background/70 max-w-xl mx-auto mb-8">
                Cuide da sua saúde com quem entende. Marque sua consulta online 
                e seja atendido pelos melhores especialistas.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link to="/agendar">
                  <Button size="xl" className="bg-clinic-primary text-foreground hover:bg-clinic-primary-dark shadow-glow">
                    Agendar Consulta
                    <ArrowRight className="h-5 w-5" />
                  </Button>
                </Link>
                <a href="https://wa.me/5511999999999" target="_blank" rel="noopener noreferrer">
                  <Button size="xl" variant="outline" className="border-background/30 text-background hover:bg-background/10">
                    Falar via WhatsApp
                  </Button>
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </PublicLayout>
  );
}
