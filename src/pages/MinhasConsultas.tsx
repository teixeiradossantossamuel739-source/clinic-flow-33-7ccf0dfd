import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  Calendar,
  Clock,
  Search,
  Loader2,
  User,
  Mail,
  Phone,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

interface Service {
  id: string;
  name: string;
  duration_minutes: number;
  price_cents: number;
}

interface Appointment {
  id: string;
  patient_name: string;
  patient_email: string;
  patient_phone: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  payment_status: string;
  amount_cents: number;
  professional_uuid: string | null;
  service_id: string | null;
}

interface Professional {
  id: string;
  name: string;
  phone: string | null;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  pending: { 
    label: 'Aguardando', 
    className: 'bg-warning/20 text-warning border-warning/30'
  },
  awaiting_confirmation: { 
    label: 'Em análise', 
    className: 'bg-orange-100 text-orange-700 border-orange-300'
  },
  confirmed: { 
    label: 'Confirmado', 
    className: 'bg-success/20 text-success border-success/30'
  },
  cancelled: { 
    label: 'Cancelado', 
    className: 'bg-destructive/20 text-destructive border-destructive/30'
  },
  rescheduled: { 
    label: 'Reagendando', 
    className: 'bg-clinic-primary/20 text-clinic-primary border-clinic-primary/30'
  },
  completed: { 
    label: 'Concluído', 
    className: 'bg-muted text-muted-foreground border-border'
  },
};

type StatusFilter = 'all' | 'confirmed' | 'cancelled' | 'completed' | 'pending';

const filterOptions: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'confirmed', label: 'Confirmados' },
  { value: 'pending', label: 'Aguardando' },
  { value: 'cancelled', label: 'Cancelados' },
  { value: 'completed', label: 'Concluídos' },
];

export default function MinhasConsultas() {
  const { user, profile } = useAuth();
  const [email, setEmail] = useState('');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  // Auto-fetch for logged-in users
  useEffect(() => {
    if (user?.email) {
      setEmail(user.email);
      fetchAppointments(user.email);
    }
  }, [user?.email]);

  const fetchAppointments = async (searchEmail: string) => {
    setLoading(true);
    setSearched(true);

    const [apptRes, profRes, servRes] = await Promise.all([
      supabase
        .from('appointments')
        .select('*')
        .eq('patient_email', searchEmail.toLowerCase().trim())
        .order('appointment_date', { ascending: false }),
      supabase.from('professionals').select('id, name, phone'),
      supabase.from('services').select('id, name, duration_minutes, price_cents'),
    ]);

    if (apptRes.error) {
      toast.error('Erro ao buscar consultas');
      console.error(apptRes.error);
    } else {
      setAppointments(apptRes.data || []);
    }

    if (profRes.data) {
      setProfessionals(profRes.data);
    }

    if (servRes.data) {
      setServices(servRes.data);
    }

    setLoading(false);
  };

  const handleSearch = async () => {
    if (!email.trim()) {
      toast.error('Por favor, insira seu email');
      return;
    }
    fetchAppointments(email);
  };

  const getProfessionalName = (uuid: string | null) => {
    if (!uuid) return 'Profissional não definido';
    const prof = professionals.find((p) => p.id === uuid);
    return prof?.name || 'Profissional';
  };

  const getService = (serviceId: string | null) => {
    if (!serviceId) return null;
    return services.find((s) => s.id === serviceId) || null;
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes} minutos`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
  };

  // Filter and sort appointments
  const filteredAppointments = appointments.filter((apt) => {
    if (statusFilter === 'all') return true;
    return apt.status === statusFilter;
  });

  const sortedAppointments = [...filteredAppointments].sort((a, b) => {
    const dateA = new Date(`${a.appointment_date}T${a.appointment_time}`);
    const dateB = new Date(`${b.appointment_date}T${b.appointment_time}`);
    return dateB.getTime() - dateA.getTime();
  });

  const renderAppointmentCard = (apt: Appointment) => {
    const status = statusConfig[apt.status] || statusConfig.pending;
    const service = getService(apt.service_id);

    return (
      <div
        key={apt.id}
        className="bg-background rounded-xl p-5 border border-clinic-border-subtle"
      >
        <div className="flex items-start justify-between gap-4">
          {/* Left: Content */}
          <div className="flex flex-col gap-2 flex-1">
            {/* Service Name */}
            <h3 className="font-bold text-foreground text-base">
              {service?.name || 'Consulta'}
            </h3>

            {/* Date */}
            <div className="flex items-center gap-2 text-sm text-clinic-text-secondary">
              <Calendar className="h-4 w-4" />
              <span>
                {format(new Date(apt.appointment_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </span>
            </div>

            {/* Time + Duration */}
            <div className="flex items-center gap-2 text-sm text-clinic-text-secondary">
              <Clock className="h-4 w-4" />
              <span>
                {apt.appointment_time} • {service ? formatDuration(service.duration_minutes) : '30 minutos'}
              </span>
            </div>

            {/* Professional */}
            <div className="flex items-center gap-2 text-sm text-clinic-text-secondary">
              <User className="h-4 w-4" />
              <span>{getProfessionalName(apt.professional_uuid)}</span>
            </div>
          </div>

          {/* Right: Status Badge */}
          <Badge 
            variant="outline" 
            className={`whitespace-nowrap text-xs font-medium px-3 py-1 ${status.className}`}
          >
            {status.label}
          </Badge>
        </div>
      </div>
    );
  };

  const clientName = profile?.full_name?.toUpperCase() || user?.email?.split('@')[0].toUpperCase() || 'CLIENTE';

  return (
    <PublicLayout>
      <div className="min-h-[calc(100vh-200px)] bg-clinic-surface">
        <div className="container py-8 lg:py-12">
          <div className="max-w-3xl mx-auto">
            {/* Personalized Header */}
            <h1 className="text-2xl font-bold mb-2">
              Olá, {clientName}!
            </h1>
            <p className="text-clinic-text-secondary mb-6">
              Aqui você pode ver e gerenciar seus agendamentos
            </p>

            {/* Client Profile Card */}
            {user && profile && (
              <div className="bg-background rounded-xl p-5 border border-clinic-border-subtle mb-6">
                <div className="flex flex-col gap-3">
                  {/* Nome */}
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-clinic-primary/10 flex items-center justify-center">
                      <User className="h-5 w-5 text-clinic-primary" />
                    </div>
                    <div>
                      <p className="font-bold text-foreground">
                        {profile.full_name || 'Cliente'}
                      </p>
                      <p className="text-xs text-clinic-text-muted">Cliente</p>
                    </div>
                  </div>
                  
                  {/* Email */}
                  <div className="flex items-center gap-2 text-sm text-clinic-text-secondary">
                    <Mail className="h-4 w-4" />
                    <span>{profile.email}</span>
                  </div>
                  
                  {/* WhatsApp */}
                  {profile.whatsapp && (
                    <div className="flex items-center gap-2 text-sm text-clinic-text-secondary">
                      <Phone className="h-4 w-4" />
                      <span>{profile.whatsapp}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Novo Agendamento Button */}
            <Link to="/agendar">
              <Button 
                variant="outline" 
                className="mb-8 bg-background text-foreground hover:bg-muted border-border"
              >
                <Calendar className="h-4 w-4 mr-2" />
                Novo Agendamento
              </Button>
            </Link>

            {/* Search - only show if not logged in */}
            {!user && (
              <div className="bg-background rounded-xl p-6 border border-clinic-border-subtle mb-8">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <Label htmlFor="email">Seu email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="email@exemplo.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    />
                  </div>
                  <div className="flex items-end">
                    <Button
                      variant="clinic"
                      onClick={handleSearch}
                      disabled={loading}
                    >
                      {loading ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Search className="h-4 w-4 mr-2" />
                      )}
                      Buscar
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Loading */}
            {loading && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-clinic-primary" />
              </div>
            )}

            {/* Results */}
            {searched && !loading && (
              <>
                {appointments.length === 0 ? (
                  <div className="bg-background rounded-xl p-12 border border-clinic-border-subtle text-center">
                    <Calendar className="h-12 w-12 mx-auto mb-4 text-clinic-text-muted opacity-50" />
                    <p className="text-clinic-text-secondary">
                      Nenhuma consulta encontrada
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Status Filters */}
                    <div className="flex flex-wrap gap-2">
                      {filterOptions.map((option) => (
                        <Button
                          key={option.value}
                          variant={statusFilter === option.value ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setStatusFilter(option.value)}
                          className={statusFilter === option.value 
                            ? 'bg-clinic-primary text-primary-foreground hover:bg-clinic-primary/90' 
                            : 'bg-background text-foreground hover:bg-muted border-border'
                          }
                        >
                          {option.label}
                        </Button>
                      ))}
                    </div>

                    {/* Appointments List */}
                    {sortedAppointments.length === 0 ? (
                      <div className="bg-background rounded-xl p-8 border border-clinic-border-subtle text-center">
                        <p className="text-clinic-text-secondary">
                          Nenhum agendamento com este status
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {sortedAppointments.map((apt) => renderAppointmentCard(apt))}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

    </PublicLayout>
  );
}
