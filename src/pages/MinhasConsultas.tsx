import { useState, useEffect } from 'react';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  Calendar,
  Clock,
  Search,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  Stethoscope,
  Timer,
  DollarSign,
  HourglassIcon,
} from 'lucide-react';
import { format, addHours, isBefore } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

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

const statusLabels: Record<string, { label: string; description: string; color: string; bgColor: string; icon: React.ReactNode }> = {
  pending: { 
    label: 'Aguardando pagamento', 
    description: 'Aguardando confirmação de pagamento',
    color: 'text-warning', 
    bgColor: 'bg-warning/10',
    icon: <HourglassIcon className="h-4 w-4" /> 
  },
  awaiting_confirmation: { 
    label: 'Pagamento em análise', 
    description: 'Seu pagamento está sendo verificado pelo profissional',
    color: 'text-orange-500', 
    bgColor: 'bg-orange-500/10',
    icon: <AlertCircle className="h-4 w-4" /> 
  },
  confirmed: { 
    label: 'Confirmado', 
    description: 'Sua consulta está confirmada',
    color: 'text-success', 
    bgColor: 'bg-success/10',
    icon: <CheckCircle2 className="h-4 w-4" /> 
  },
  cancelled: { 
    label: 'Cancelado', 
    description: 'Esta consulta foi cancelada',
    color: 'text-destructive', 
    bgColor: 'bg-destructive/10',
    icon: <XCircle className="h-4 w-4" /> 
  },
  rescheduled: { 
    label: 'Reagendamento solicitado', 
    description: 'Aguardando novo horário',
    color: 'text-clinic-primary', 
    bgColor: 'bg-clinic-primary/10',
    icon: <RefreshCw className="h-4 w-4" /> 
  },
  completed: { 
    label: 'Concluído', 
    description: 'Consulta realizada',
    color: 'text-clinic-text-muted', 
    bgColor: 'bg-muted',
    icon: <CheckCircle2 className="h-4 w-4" /> 
  },
};

export default function MinhasConsultas() {
  const { user, profile } = useAuth();
  const [email, setEmail] = useState('');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [processing, setProcessing] = useState(false);

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
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(cents / 100);
  };

  const canCancel = (appointment: Appointment) => {
    if (appointment.status === 'cancelled' || appointment.status === 'completed') {
      return false;
    }
    const appointmentDateTime = new Date(`${appointment.appointment_date}T${appointment.appointment_time}`);
    const minCancelTime = addHours(new Date(), 24);
    return isBefore(minCancelTime, appointmentDateTime);
  };

  const handleCancelClick = (appointment: Appointment) => {
    setSelectedAppointment(appointment);
    setCancelDialogOpen(true);
  };

  const handleConfirmCancel = async () => {
    if (!selectedAppointment) return;

    setProcessing(true);

    const { error } = await supabase
      .from('appointments')
      .update({ status: 'cancelled' })
      .eq('id', selectedAppointment.id);

    if (error) {
      toast.error('Erro ao cancelar consulta');
      console.error(error);
    } else {
      toast.success('Consulta cancelada com sucesso');
      setAppointments((prev) =>
        prev.map((a) =>
          a.id === selectedAppointment.id ? { ...a, status: 'cancelled' } : a
        )
      );
    }

    setProcessing(false);
    setCancelDialogOpen(false);
    setSelectedAppointment(null);
  };

  const handleRequestReschedule = async (appointment: Appointment) => {
    setProcessing(true);

    const { error } = await supabase
      .from('appointments')
      .update({ status: 'rescheduled' })
      .eq('id', appointment.id);

    if (error) {
      toast.error('Erro ao solicitar reagendamento');
      console.error(error);
    } else {
      toast.success('Solicitação de reagendamento enviada');
      setAppointments((prev) =>
        prev.map((a) =>
          a.id === appointment.id ? { ...a, status: 'rescheduled' } : a
        )
      );
    }

    setProcessing(false);
  };

  const upcomingAppointments = appointments.filter(
    (a) =>
      new Date(`${a.appointment_date}T${a.appointment_time}`) >= new Date() &&
      a.status !== 'cancelled'
  );

  const pastAppointments = appointments.filter(
    (a) =>
      new Date(`${a.appointment_date}T${a.appointment_time}`) < new Date() ||
      a.status === 'cancelled'
  );

  const renderAppointmentCard = (apt: Appointment, isPast: boolean = false) => {
    const status = statusLabels[apt.status] || statusLabels.pending;
    const service = getService(apt.service_id);

    return (
      <div
        key={apt.id}
        className={`bg-background rounded-xl p-6 border border-clinic-border-subtle ${isPast ? 'opacity-70' : ''}`}
      >
        <div className="flex flex-col gap-4">
          {/* Header: Date and Status */}
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-clinic-primary" />
              <span className="font-medium">
                {format(new Date(apt.appointment_date), "EEEE, dd 'de' MMMM", { locale: ptBR })}
              </span>
            </div>
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${status.bgColor} ${status.color}`}>
              {status.icon}
              {status.label}
            </div>
          </div>

          {/* Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Time */}
            <div className="flex items-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-clinic-text-muted" />
              <span className="font-medium">{apt.appointment_time.slice(0, 5)}</span>
            </div>

            {/* Professional */}
            <div className="flex items-center gap-2 text-sm text-clinic-text-secondary">
              <span>{getProfessionalName(apt.professional_uuid)}</span>
            </div>

            {/* Service */}
            {service && (
              <div className="flex items-center gap-2 text-sm">
                <Stethoscope className="h-4 w-4 text-clinic-text-muted" />
                <span className="font-medium text-clinic-primary">{service.name}</span>
              </div>
            )}

            {/* Duration */}
            {service && (
              <div className="flex items-center gap-2 text-sm text-clinic-text-secondary">
                <Timer className="h-4 w-4 text-clinic-text-muted" />
                <span>{formatDuration(service.duration_minutes)}</span>
              </div>
            )}

            {/* Value */}
            <div className="flex items-center gap-2 text-sm sm:col-span-2">
              <DollarSign className="h-4 w-4 text-clinic-text-muted" />
              <span className="font-semibold text-foreground">{formatCurrency(apt.amount_cents)}</span>
            </div>
          </div>

          {/* Status description */}
          <p className="text-xs text-clinic-text-muted">{status.description}</p>

          {/* Actions */}
          {!isPast && canCancel(apt) && apt.status !== 'rescheduled' && (
            <div className="flex gap-2 pt-2 border-t border-clinic-border-subtle">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleRequestReschedule(apt)}
                disabled={processing}
              >
                <RefreshCw className="h-4 w-4 mr-1" />
                Reagendar
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => handleCancelClick(apt)}
                disabled={processing}
              >
                Cancelar
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <PublicLayout>
      <div className="min-h-[calc(100vh-200px)] bg-clinic-surface">
        <div className="container py-8 lg:py-12">
          <div className="max-w-3xl mx-auto">
            <h1 className="text-2xl font-bold mb-2">Minhas Consultas</h1>
            <p className="text-clinic-text-secondary mb-8">
              Acompanhe o status, cancele ou solicite reagendamento das suas consultas
            </p>

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
                    {/* Upcoming */}
                    {upcomingAppointments.length > 0 && (
                      <div>
                        <h2 className="text-lg font-semibold mb-4">Próximas Consultas</h2>
                        <div className="space-y-4">
                          {upcomingAppointments.map((apt) => renderAppointmentCard(apt, false))}
                        </div>
                      </div>
                    )}

                    {/* Past */}
                    {pastAppointments.length > 0 && (
                      <div>
                        <h2 className="text-lg font-semibold mb-4">Histórico</h2>
                        <div className="space-y-3">
                          {pastAppointments.map((apt) => renderAppointmentCard(apt, true))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Cancel Dialog */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar Consulta</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja cancelar esta consulta? Esta ação não pode ser desfeita.
              {selectedAppointment && (
                <div className="mt-4 p-4 bg-clinic-surface rounded-lg">
                  <p className="font-medium">
                    {format(new Date(selectedAppointment.appointment_date), "dd 'de' MMMM", { locale: ptBR })} às {selectedAppointment.appointment_time.slice(0, 5)}
                  </p>
                  {getService(selectedAppointment.service_id) && (
                    <p className="text-sm text-clinic-text-secondary mt-1">
                      {getService(selectedAppointment.service_id)?.name}
                    </p>
                  )}
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={processing}>Voltar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmCancel}
              disabled={processing}
              className="bg-destructive hover:bg-destructive/90"
            >
              {processing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Confirmar Cancelamento
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </PublicLayout>
  );
}
