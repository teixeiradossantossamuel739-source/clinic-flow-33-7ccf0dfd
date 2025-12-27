import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { FuncionarioLayout } from '@/components/layout/FuncionarioLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Calendar, 
  Clock, 
  User,
  Phone,
  Mail,
  ChevronLeft,
  ChevronRight,
  FileText
} from 'lucide-react';
import { format, addDays, startOfWeek, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { parseLocalDate } from '@/lib/dateUtils';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

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
  notes: string | null;
  service?: {
    name: string;
    duration_minutes: number;
  };
}

interface Schedule {
  day_of_week: number;
  start_time: string;
  end_time: string;
  slot_duration_minutes: number;
  is_active: boolean;
}

type SlotStatus = 'available' | 'pending' | 'confirmed' | 'completed' | 'cancelled' | 'unavailable';

const STATUS_COLORS: Record<SlotStatus, string> = {
  available: 'bg-emerald-500 hover:bg-emerald-600',
  pending: 'bg-amber-400 hover:bg-amber-500',
  confirmed: 'bg-red-500 hover:bg-red-600',
  completed: 'bg-muted hover:bg-muted/80',
  cancelled: 'bg-transparent border border-dashed border-muted-foreground/30',
  unavailable: 'bg-transparent',
};

const STATUS_LABELS: Record<SlotStatus, string> = {
  available: 'Disponível',
  pending: 'Aguardando',
  confirmed: 'Confirmado',
  completed: 'Realizado',
  cancelled: 'Cancelado',
  unavailable: '',
};

export default function FuncionarioAgenda() {
  const { user } = useAuth();
  const [professionalId, setProfessionalId] = useState<string | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [selectedSlot, setSelectedSlot] = useState<{ date: Date; time: string; appointment?: Appointment } | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  }, [weekStart]);

  const timeSlots = useMemo(() => {
    const slots: string[] = [];
    let earliest = '23:59';
    let latest = '00:00';

    schedules.filter(s => s.is_active).forEach(schedule => {
      if (schedule.start_time < earliest) earliest = schedule.start_time;
      if (schedule.end_time > latest) latest = schedule.end_time;
    });

    if (earliest === '23:59') {
      earliest = '08:00';
      latest = '18:00';
    }

    const [startHour, startMin] = earliest.split(':').map(Number);
    const [endHour, endMin] = latest.split(':').map(Number);
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    for (let m = startMinutes; m < endMinutes; m += 30) {
      const h = Math.floor(m / 60);
      const min = m % 60;
      slots.push(`${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`);
    }

    return slots;
  }, [schedules]);

  useEffect(() => {
    if (user) {
      fetchProfessionalData();
    }
  }, [user]);

  useEffect(() => {
    if (professionalId) {
      fetchAppointments();
    }
  }, [professionalId, weekStart]);

  async function fetchProfessionalData() {
    try {
      const { data: professional, error: profError } = await supabase
        .from('professionals')
        .select('id')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (profError) throw profError;

      if (professional) {
        setProfessionalId(professional.id);

        const { data: schedulesData, error: schedError } = await supabase
          .from('professional_schedules')
          .select('*')
          .eq('professional_id', professional.id);

        if (schedError) throw schedError;
        setSchedules(schedulesData || []);
      }
    } catch (error) {
      console.error('Error fetching professional data:', error);
      toast.error('Erro ao carregar dados do profissional');
    }
  }

  async function fetchAppointments() {
    if (!professionalId) return;

    setLoading(true);
    try {
      const weekEnd = addDays(weekStart, 6);
      const startDate = format(weekStart, 'yyyy-MM-dd');
      const endDate = format(weekEnd, 'yyyy-MM-dd');

      const { data, error } = await supabase
        .from('appointments')
        .select(`
          id,
          patient_name,
          patient_email,
          patient_phone,
          appointment_date,
          appointment_time,
          status,
          payment_status,
          amount_cents,
          notes,
          service_id,
          services:service_id (
            name,
            duration_minutes
          )
        `)
        .eq('professional_uuid', professionalId)
        .gte('appointment_date', startDate)
        .lte('appointment_date', endDate)
        .neq('status', 'cancelled');

      if (error) throw error;

      const formattedData = (data || []).map(apt => ({
        ...apt,
        service: apt.services ? {
          name: (apt.services as any).name,
          duration_minutes: (apt.services as any).duration_minutes
        } : undefined
      }));

      setAppointments(formattedData);
    } catch (error) {
      console.error('Error fetching appointments:', error);
      toast.error('Erro ao carregar agendamentos');
    } finally {
      setLoading(false);
    }
  }

  function getSlotStatus(date: Date, time: string): SlotStatus {
    const dayOfWeek = date.getDay();
    const schedule = schedules.find(s => s.day_of_week === dayOfWeek && s.is_active);
    
    if (!schedule) return 'unavailable';
    
    const timeValue = time.replace(':', '');
    const startValue = schedule.start_time.substring(0, 5).replace(':', '');
    const endValue = schedule.end_time.substring(0, 5).replace(':', '');
    
    if (timeValue < startValue || timeValue >= endValue) return 'unavailable';

    const appointment = appointments.find(apt => {
      const aptDate = parseLocalDate(apt.appointment_date);
      const aptTime = apt.appointment_time.substring(0, 5);
      return isSameDay(aptDate, date) && aptTime === time;
    });

    if (!appointment) return 'available';
    
    switch (appointment.status) {
      case 'pending': return 'pending';
      case 'confirmed': return 'confirmed';
      case 'completed': return 'completed';
      case 'cancelled': return 'cancelled';
      default: return 'available';
    }
  }

  function getAppointmentForSlot(date: Date, time: string): Appointment | undefined {
    return appointments.find(apt => {
      const aptDate = parseLocalDate(apt.appointment_date);
      const aptTime = apt.appointment_time.substring(0, 5);
      return isSameDay(aptDate, date) && aptTime === time;
    });
  }

  function handleSlotClick(date: Date, time: string) {
    const status = getSlotStatus(date, time);
    if (status === 'unavailable') return;

    const appointment = getAppointmentForSlot(date, time);
    setSelectedSlot({ date, time, appointment });
    setDialogOpen(true);
  }

  async function handleUpdateStatus(appointmentId: string, newStatus: string) {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: newStatus })
        .eq('id', appointmentId);

      if (error) throw error;

      setAppointments(prev =>
        prev.map(apt =>
          apt.id === appointmentId ? { ...apt, status: newStatus } : apt
        )
      );

      const statusMessages: Record<string, string> = {
        confirmed: 'Consulta confirmada com sucesso!',
        cancelled: 'Consulta cancelada.',
        completed: 'Consulta marcada como realizada!',
      };

      toast.success(statusMessages[newStatus] || 'Status atualizado!');
      setDialogOpen(false);
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Erro ao atualizar status');
    }
  }

  function navigateWeek(direction: 'prev' | 'next') {
    setWeekStart(prev => addDays(prev, direction === 'next' ? 7 : -7));
  }

  function goToToday() {
    setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));
  }

  const renderSlotDialog = () => {
    if (!selectedSlot) return null;

    const { date, time, appointment } = selectedSlot;
    const status = getSlotStatus(date, time);

    return (
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              {format(date, "EEEE, d 'de' MMMM", { locale: ptBR })}
            </DialogTitle>
            <DialogDescription className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              {time}
              <Badge className={`ml-2 ${STATUS_COLORS[status]} text-white border-0`}>
                {STATUS_LABELS[status]}
              </Badge>
            </DialogDescription>
          </DialogHeader>

          {appointment ? (
            <div className="space-y-4">
              <div className="space-y-3 rounded-lg bg-muted/50 p-4">
                <div className="flex items-center gap-3">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{appointment.patient_name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Phone className="h-4 w-4 text-muted-foreground" />
                  <a href={`tel:${appointment.patient_phone}`} className="text-primary hover:underline">
                    {appointment.patient_phone}
                  </a>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <a href={`mailto:${appointment.patient_email}`} className="text-primary hover:underline">
                    {appointment.patient_email}
                  </a>
                </div>
                {appointment.service && (
                  <div className="flex items-center gap-3">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span>{appointment.service.name} ({appointment.service.duration_minutes} min)</span>
                  </div>
                )}
                {appointment.notes && (
                  <div className="pt-2 border-t">
                    <p className="text-sm text-muted-foreground">{appointment.notes}</p>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                {status === 'pending' && (
                  <>
                    <Button 
                      onClick={() => handleUpdateStatus(appointment.id, 'confirmed')}
                      className="flex-1 bg-red-500 hover:bg-red-600"
                    >
                      Confirmar
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => handleUpdateStatus(appointment.id, 'cancelled')}
                      className="flex-1"
                    >
                      Recusar
                    </Button>
                  </>
                )}
                {status === 'confirmed' && (
                  <>
                    <Button 
                      onClick={() => handleUpdateStatus(appointment.id, 'completed')}
                      className="flex-1"
                    >
                      Marcar como Realizada
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => handleUpdateStatus(appointment.id, 'cancelled')}
                      className="flex-1"
                    >
                      Cancelar
                    </Button>
                  </>
                )}
                {status === 'completed' && (
                  <p className="text-sm text-muted-foreground w-full text-center">
                    Esta consulta já foi realizada.
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="py-6 text-center">
              <p className="text-muted-foreground">Horário disponível para agendamento.</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    );
  };

  if (loading && !professionalId) {
    return (
      <FuncionarioLayout>
        <div className="space-y-4">
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-96" />
        </div>
      </FuncionarioLayout>
    );
  }

  return (
    <FuncionarioLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Minha Agenda</h1>
            <p className="text-muted-foreground">
              {format(weekStart, "d 'de' MMMM", { locale: ptBR })} - {format(addDays(weekStart, 6), "d 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => navigateWeek('prev')}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="outline" onClick={goToToday}>
              Hoje
            </Button>
            <Button variant="outline" size="icon" onClick={() => navigateWeek('next')}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Legend */}
        <Card>
          <CardContent className="py-3">
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <span className="font-medium text-muted-foreground">Legenda:</span>
              <div className="flex items-center gap-2">
                <div className={`w-4 h-4 rounded ${STATUS_COLORS.available}`} />
                <span>Disponível</span>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-4 h-4 rounded ${STATUS_COLORS.pending}`} />
                <span>Aguardando Confirmação</span>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-4 h-4 rounded ${STATUS_COLORS.confirmed}`} />
                <span>Confirmado</span>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-4 h-4 rounded ${STATUS_COLORS.completed}`} />
                <span>Realizado</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Calendar Grid */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">Calendário Semanal</CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
              </div>
            ) : (
              <div className="min-w-[700px]">
                {/* Days Header */}
                <div className="grid grid-cols-8 border-b bg-muted/30">
                  <div className="p-3 text-center text-sm font-medium text-muted-foreground border-r">
                    Horário
                  </div>
                  {weekDays.map((day, idx) => {
                    const isToday = isSameDay(day, new Date());
                    return (
                      <div 
                        key={idx} 
                        className={`p-3 text-center border-r last:border-r-0 ${isToday ? 'bg-primary/10' : ''}`}
                      >
                        <div className="text-xs text-muted-foreground uppercase">
                          {format(day, 'EEE', { locale: ptBR })}
                        </div>
                        <div className={`text-lg font-semibold ${isToday ? 'text-primary' : ''}`}>
                          {format(day, 'd')}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Time Slots */}
                <div className="max-h-[500px] overflow-y-auto">
                  {timeSlots.map((time) => (
                    <div key={time} className="grid grid-cols-8 border-b last:border-b-0">
                      <div className="p-2 text-center text-sm text-muted-foreground border-r bg-muted/20 flex items-center justify-center">
                        {time}
                      </div>
                      {weekDays.map((day, dayIdx) => {
                        const status = getSlotStatus(day, time);
                        const appointment = getAppointmentForSlot(day, time);
                        const isClickable = status !== 'unavailable';

                        return (
                          <div
                            key={dayIdx}
                            onClick={() => isClickable && handleSlotClick(day, time)}
                            className={`
                              p-1 border-r last:border-r-0 min-h-[48px] transition-all
                              ${isClickable ? 'cursor-pointer' : ''}
                            `}
                          >
                            {status !== 'unavailable' && (
                              <div 
                                className={`
                                  h-full w-full rounded-md flex items-center justify-center text-xs text-white font-medium
                                  ${STATUS_COLORS[status]}
                                  transition-colors
                                `}
                              >
                                {appointment && (
                                  <span className="truncate px-1 text-[10px]">
                                    {appointment.patient_name.split(' ')[0]}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Slot Dialog */}
        {renderSlotDialog()}
      </div>
    </FuncionarioLayout>
  );
}
