import { useState } from 'react';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import {
  Calendar,
  Clock,
  Search,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  Phone,
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
}

interface Professional {
  id: string;
  name: string;
  phone: string | null;
}

const statusLabels: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  pending: { label: 'Aguardando confirmação', color: 'text-warning', icon: <AlertCircle className="h-4 w-4" /> },
  confirmed: { label: 'Confirmado', color: 'text-success', icon: <CheckCircle2 className="h-4 w-4" /> },
  cancelled: { label: 'Cancelado', color: 'text-destructive', icon: <XCircle className="h-4 w-4" /> },
  rescheduled: { label: 'Reagendamento solicitado', color: 'text-clinic-primary', icon: <RefreshCw className="h-4 w-4" /> },
  completed: { label: 'Concluído', color: 'text-clinic-text-muted', icon: <CheckCircle2 className="h-4 w-4" /> },
};

export default function MinhasConsultas() {
  const [email, setEmail] = useState('');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [processing, setProcessing] = useState(false);

  const handleSearch = async () => {
    if (!email.trim()) {
      toast.error('Por favor, insira seu email');
      return;
    }

    setLoading(true);
    setSearched(true);

    const [apptRes, profRes] = await Promise.all([
      supabase
        .from('appointments')
        .select('*')
        .eq('patient_email', email.toLowerCase().trim())
        .order('appointment_date', { ascending: false }),
      supabase.from('professionals').select('id, name, phone'),
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

    setLoading(false);
  };

  const getProfessionalName = (uuid: string | null) => {
    if (!uuid) return 'Profissional não definido';
    const prof = professionals.find((p) => p.id === uuid);
    return prof?.name || 'Profissional';
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

  return (
    <PublicLayout>
      <div className="min-h-[calc(100vh-200px)] bg-clinic-surface">
        <div className="container py-8 lg:py-12">
          <div className="max-w-3xl mx-auto">
            <h1 className="text-2xl font-bold mb-2">Minhas Consultas</h1>
            <p className="text-clinic-text-secondary mb-8">
              Consulte, cancele ou solicite reagendamento das suas consultas
            </p>

            {/* Search */}
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

            {/* Results */}
            {searched && !loading && (
              <>
                {appointments.length === 0 ? (
                  <div className="bg-background rounded-xl p-12 border border-clinic-border-subtle text-center">
                    <Calendar className="h-12 w-12 mx-auto mb-4 text-clinic-text-muted opacity-50" />
                    <p className="text-clinic-text-secondary">
                      Nenhuma consulta encontrada para este email
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Upcoming */}
                    {upcomingAppointments.length > 0 && (
                      <div>
                        <h2 className="text-lg font-semibold mb-4">Próximas Consultas</h2>
                        <div className="space-y-4">
                          {upcomingAppointments.map((apt) => {
                            const status = statusLabels[apt.status] || statusLabels.pending;
                            return (
                              <div
                                key={apt.id}
                                className="bg-background rounded-xl p-6 border border-clinic-border-subtle"
                              >
                                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                      <Calendar className="h-4 w-4 text-clinic-primary" />
                                      <span className="font-medium">
                                        {format(new Date(apt.appointment_date), "EEEE, dd 'de' MMMM", { locale: ptBR })}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-4 text-sm text-clinic-text-secondary">
                                      <span className="flex items-center gap-1">
                                        <Clock className="h-4 w-4" />
                                        {apt.appointment_time}
                                      </span>
                                      <span>
                                        {getProfessionalName(apt.professional_uuid)}
                                      </span>
                                    </div>
                                    <div className={`flex items-center gap-1 mt-2 text-sm ${status.color}`}>
                                      {status.icon}
                                      {status.label}
                                    </div>
                                  </div>
                                  <div className="flex gap-2">
                                    {canCancel(apt) && apt.status !== 'rescheduled' && (
                                      <>
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
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Past */}
                    {pastAppointments.length > 0 && (
                      <div>
                        <h2 className="text-lg font-semibold mb-4">Histórico</h2>
                        <div className="space-y-3">
                          {pastAppointments.map((apt) => {
                            const status = statusLabels[apt.status] || statusLabels.pending;
                            return (
                              <div
                                key={apt.id}
                                className="bg-background rounded-xl p-4 border border-clinic-border-subtle opacity-70"
                              >
                                <div className="flex items-center justify-between">
                                  <div>
                                    <p className="font-medium">
                                      {format(new Date(apt.appointment_date), 'dd/MM/yyyy')} às {apt.appointment_time}
                                    </p>
                                    <p className="text-sm text-clinic-text-muted">
                                      {getProfessionalName(apt.professional_uuid)}
                                    </p>
                                  </div>
                                  <div className={`flex items-center gap-1 text-sm ${status.color}`}>
                                    {status.icon}
                                    {status.label}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
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
                    {format(new Date(selectedAppointment.appointment_date), "dd 'de' MMMM", { locale: ptBR })} às {selectedAppointment.appointment_time}
                  </p>
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
