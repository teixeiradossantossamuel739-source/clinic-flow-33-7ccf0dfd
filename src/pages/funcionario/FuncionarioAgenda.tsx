import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { FuncionarioLayout } from '@/components/layout/FuncionarioLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { 
  Calendar, 
  Clock, 
  User,
  Phone,
  Mail,
  ChevronLeft,
  ChevronRight,
  FileText,
  Ban,
  Unlock,
  List,
  CalendarDays,
  CheckCircle2,
  XCircle,
  MessageSquare
} from 'lucide-react';
import { format, addDays, isSameDay, isToday } from 'date-fns';
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

interface BlockedTime {
  id: string;
  block_date: string;
  start_time: string | null;
  end_time: string | null;
  reason: string | null;
}

// Simplified status for staff view
type SimpleSlotStatus = 'available' | 'pending' | 'occupied' | 'blocked';

const SIMPLE_STATUS_COLORS: Record<SimpleSlotStatus, string> = {
  available: 'bg-emerald-500 hover:bg-emerald-600',
  pending: 'bg-amber-400 hover:bg-amber-500',
  occupied: 'bg-red-500 hover:bg-red-600',
  blocked: 'bg-slate-600 hover:bg-slate-700',
};

const SIMPLE_STATUS_LABELS: Record<SimpleSlotStatus, string> = {
  available: 'Livre',
  pending: 'Solicitação Pendente',
  occupied: 'Ocupado',
  blocked: 'Bloqueado',
};

type ViewMode = 'requests' | 'daily';

export default function FuncionarioAgenda() {
  const { user } = useAuth();
  const [professionalId, setProfessionalId] = useState<string | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [allPendingAppointments, setAllPendingAppointments] = useState<Appointment[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [blockedTimes, setBlockedTimes] = useState<BlockedTime[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [viewMode, setViewMode] = useState<ViewMode>('requests');
  const [selectedSlot, setSelectedSlot] = useState<{ date: Date; time: string; appointment?: Appointment; blockedTime?: BlockedTime } | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  
  // Block dialog state
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [blockReason, setBlockReason] = useState('');
  const [blockFullDay, setBlockFullDay] = useState(false);
  const [saving, setSaving] = useState(false);

  // Generate time slots for selected day
  const timeSlots = useMemo(() => {
    const dayOfWeek = selectedDate.getDay();
    const schedule = schedules.find(s => s.day_of_week === dayOfWeek && s.is_active);
    
    if (!schedule) return [];

    const slots: string[] = [];
    const [startHour, startMin] = schedule.start_time.split(':').map(Number);
    const [endHour, endMin] = schedule.end_time.split(':').map(Number);
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;

    for (let m = startMinutes; m < endMinutes; m += schedule.slot_duration_minutes || 30) {
      const h = Math.floor(m / 60);
      const min = m % 60;
      slots.push(`${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`);
    }

    return slots;
  }, [schedules, selectedDate]);

  // Daily appointments for selected date
  const dailyAppointments = useMemo(() => {
    return appointments.filter(apt => {
      const aptDate = parseLocalDate(apt.appointment_date);
      return isSameDay(aptDate, selectedDate);
    });
  }, [appointments, selectedDate]);

  useEffect(() => {
    if (user) {
      fetchProfessionalData();
    }
  }, [user]);

  useEffect(() => {
    if (professionalId) {
      fetchAllPendingAppointments();
      fetchDailyData();
    }
  }, [professionalId, selectedDate]);

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

  async function fetchAllPendingAppointments() {
    if (!professionalId) return;

    try {
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
        .in('status', ['pending'])
        .gte('appointment_date', format(new Date(), 'yyyy-MM-dd'))
        .order('appointment_date', { ascending: true })
        .order('appointment_time', { ascending: true });

      if (error) throw error;

      const formattedData = (data || []).map(apt => ({
        ...apt,
        service: apt.services ? {
          name: (apt.services as any).name,
          duration_minutes: (apt.services as any).duration_minutes
        } : undefined
      }));

      setAllPendingAppointments(formattedData);
    } catch (error) {
      console.error('Error fetching pending appointments:', error);
    }
  }

  async function fetchDailyData() {
    if (!professionalId) return;

    setLoading(true);
    try {
      const dateStr = format(selectedDate, 'yyyy-MM-dd');

      // Fetch appointments for selected date
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
        .eq('appointment_date', dateStr)
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

      // Fetch blocked times for selected date
      const { data: blockedData, error: blockedError } = await supabase
        .from('professional_blocked_times')
        .select('*')
        .eq('professional_id', professionalId)
        .eq('block_date', dateStr);

      if (blockedError) throw blockedError;
      setBlockedTimes(blockedData || []);

    } catch (error) {
      console.error('Error fetching daily data:', error);
      toast.error('Erro ao carregar dados do dia');
    } finally {
      setLoading(false);
    }
  }

  function getBlockedTimeForSlot(time: string): BlockedTime | undefined {
    return blockedTimes.find(bt => {
      // Full day block
      if (!bt.start_time && !bt.end_time) return true;
      // Specific time block
      const blockStart = bt.start_time?.substring(0, 5) || '00:00';
      const blockEnd = bt.end_time?.substring(0, 5) || '23:59';
      return time >= blockStart && time < blockEnd;
    });
  }

  function getSimpleSlotStatus(time: string): SimpleSlotStatus {
    // Check blocked times
    const blockedTime = getBlockedTimeForSlot(time);
    if (blockedTime) return 'blocked';

    const appointment = dailyAppointments.find(apt => {
      const aptTime = apt.appointment_time.substring(0, 5);
      return aptTime === time;
    });

    if (!appointment) return 'available';
    
    if (appointment.status === 'pending') return 'pending';
    
    // confirmed or completed = occupied
    return 'occupied';
  }

  function getAppointmentForSlot(time: string): Appointment | undefined {
    return dailyAppointments.find(apt => {
      const aptTime = apt.appointment_time.substring(0, 5);
      return aptTime === time;
    });
  }

  function handleSlotClick(time: string) {
    const appointment = getAppointmentForSlot(time);
    const blockedTime = getBlockedTimeForSlot(time);
    
    setSelectedSlot({ date: selectedDate, time, appointment, blockedTime });
    setDialogOpen(true);
  }

  function handleOpenBlockDialog() {
    setBlockReason('');
    setBlockFullDay(false);
    setDialogOpen(false);
    setBlockDialogOpen(true);
  }

  async function handleBlockTime() {
    if (!professionalId || !selectedSlot) return;

    setSaving(true);
    try {
      const blockDate = format(selectedSlot.date, 'yyyy-MM-dd');
      
      const insertData: any = {
        professional_id: professionalId,
        block_date: blockDate,
        reason: blockReason.trim() || null,
      };

      if (!blockFullDay) {
        insertData.start_time = selectedSlot.time;
        const [h, m] = selectedSlot.time.split(':').map(Number);
        const endMinutes = h * 60 + m + 30;
        const endH = Math.floor(endMinutes / 60);
        const endM = endMinutes % 60;
        insertData.end_time = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
      }

      const { error } = await supabase
        .from('professional_blocked_times')
        .insert(insertData);

      if (error) throw error;

      toast.success(blockFullDay ? 'Dia inteiro bloqueado!' : 'Horário bloqueado!');
      setBlockDialogOpen(false);
      fetchDailyData();
    } catch (error) {
      console.error('Error blocking time:', error);
      toast.error('Erro ao bloquear horário');
    } finally {
      setSaving(false);
    }
  }

  async function handleUnblockTime(blockedTimeId: string) {
    try {
      const { error } = await supabase
        .from('professional_blocked_times')
        .delete()
        .eq('id', blockedTimeId);

      if (error) throw error;

      toast.success('Horário desbloqueado!');
      setDialogOpen(false);
      fetchDailyData();
    } catch (error) {
      console.error('Error unblocking time:', error);
      toast.error('Erro ao desbloquear horário');
    }
  }

  async function handleUpdateStatus(appointmentId: string, newStatus: string) {
    try {
      const updateData: { status: string; payment_status?: string } = { status: newStatus };
      
      // When confirming, also mark payment as paid
      if (newStatus === 'confirmed') {
        updateData.payment_status = 'paid';
      }
      // When cancelling
      if (newStatus === 'cancelled') {
        updateData.payment_status = 'cancelled';
      }

      const { error } = await supabase
        .from('appointments')
        .update(updateData)
        .eq('id', appointmentId);

      if (error) throw error;

      // Update local state
      setAppointments(prev =>
        prev.map(apt =>
          apt.id === appointmentId ? { ...apt, ...updateData } : apt
        )
      );
      setAllPendingAppointments(prev =>
        prev.filter(apt => apt.id !== appointmentId)
      );

      const statusMessages: Record<string, string> = {
        confirmed: 'Consulta confirmada!',
        cancelled: 'Consulta cancelada.',
        completed: 'Consulta realizada!',
      };

      toast.success(statusMessages[newStatus] || 'Status atualizado!');
      setDialogOpen(false);
      fetchDailyData();
      fetchAllPendingAppointments();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Erro ao atualizar status');
    }
  }

  function navigateDay(direction: 'prev' | 'next') {
    setSelectedDate(prev => addDays(prev, direction === 'next' ? 1 : -1));
  }

  function goToToday() {
    setSelectedDate(new Date());
  }

  function openWhatsApp(phone: string, patientName: string) {
    const cleanPhone = phone.replace(/\D/g, '');
    const message = encodeURIComponent(`Olá ${patientName}, sobre seu agendamento...`);
    window.open(`https://wa.me/55${cleanPhone}?text=${message}`, '_blank');
  }

  // Render pending requests list
  const renderRequestsList = () => {
    if (allPendingAppointments.length === 0) {
      return (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <CheckCircle2 className="h-16 w-16 mx-auto mb-4 text-emerald-500" />
              <h3 className="text-lg font-medium mb-2">Nenhuma solicitação pendente!</h3>
              <p className="text-sm">Você está em dia. Quando houver novas solicitações, elas aparecerão aqui.</p>
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="space-y-4">
        {allPendingAppointments.map(apt => {
          const aptDate = parseLocalDate(apt.appointment_date);
          return (
            <Card key={apt.id} className="border-l-4 border-l-amber-400">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                        🟡 Solicitação Pendente
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 font-medium">
                      <User className="h-4 w-4 text-muted-foreground" />
                      {apt.patient_name}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        {format(aptDate, "dd/MM/yyyy", { locale: ptBR })}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {apt.appointment_time.substring(0, 5)}
                      </span>
                    </div>
                    {apt.service && (
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <FileText className="h-4 w-4" />
                        {apt.service.name} ({apt.service.duration_minutes} min)
                      </div>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      onClick={() => handleUpdateStatus(apt.id, 'confirmed')}
                      className="bg-emerald-600 hover:bg-emerald-700"
                    >
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                      Aceitar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleUpdateStatus(apt.id, 'cancelled')}
                      className="text-red-600 border-red-200 hover:bg-red-50"
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Recusar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => openWhatsApp(apt.patient_phone, apt.patient_name)}
                    >
                      <MessageSquare className="h-4 w-4 mr-1" />
                      WhatsApp
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setSelectedDate(aptDate);
                        setViewMode('daily');
                      }}
                    >
                      Ver horários
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  // Render daily schedule view
  const renderDailySchedule = () => {
    const dayOfWeek = selectedDate.getDay();
    const schedule = schedules.find(s => s.day_of_week === dayOfWeek && s.is_active);

    if (!schedule) {
      return (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <Calendar className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-2">Dia sem expediente</h3>
              <p className="text-sm">Você não tem horários configurados para {format(selectedDate, "EEEE", { locale: ptBR })}.</p>
            </div>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            {format(selectedDate, "EEEE, d 'de' MMMM", { locale: ptBR })}
            {isToday(selectedDate) && (
              <Badge className="bg-primary text-primary-foreground">Hoje</Badge>
            )}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Você está vendo apenas seus horários disponíveis e compromissos do dia.
          </p>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4, 5].map(i => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {timeSlots.map(time => {
                const status = getSimpleSlotStatus(time);
                const appointment = getAppointmentForSlot(time);
                
                return (
                  <div
                    key={time}
                    onClick={() => handleSlotClick(time)}
                    className={`
                      flex items-center gap-4 p-3 rounded-lg cursor-pointer transition-all
                      ${SIMPLE_STATUS_COLORS[status]} text-white
                    `}
                  >
                    <span className="font-mono font-medium min-w-[60px]">{time}</span>
                    <span className="flex-1">
                      {status === 'blocked' && (
                        <span className="flex items-center gap-2">
                          <Ban className="h-4 w-4" />
                          Bloqueado
                        </span>
                      )}
                      {status === 'available' && 'Livre'}
                      {status === 'pending' && appointment && (
                        <span className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          {appointment.patient_name} - Pendente
                        </span>
                      )}
                      {status === 'occupied' && appointment && (
                        <span className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          {appointment.patient_name}
                        </span>
                      )}
                    </span>
                    <Badge variant="secondary" className="bg-white/20 text-white border-0">
                      {SIMPLE_STATUS_LABELS[status]}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  const renderSlotDialog = () => {
    if (!selectedSlot) return null;

    const { time, appointment, blockedTime } = selectedSlot;
    const status = getSimpleSlotStatus(time);

    return (
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              {format(selectedDate, "EEEE, d 'de' MMMM", { locale: ptBR })}
            </DialogTitle>
            <DialogDescription className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              {time}
              <Badge className={`ml-2 ${SIMPLE_STATUS_COLORS[status]} text-white border-0`}>
                {SIMPLE_STATUS_LABELS[status]}
              </Badge>
            </DialogDescription>
          </DialogHeader>

          {/* Blocked time view */}
          {status === 'blocked' && blockedTime && (
            <div className="space-y-4">
              <div className="space-y-3 rounded-lg bg-slate-100 dark:bg-slate-800 p-4">
                <div className="flex items-center gap-3">
                  <Ban className="h-5 w-5 text-slate-600" />
                  <span className="font-medium">
                    {!blockedTime.start_time ? 'Dia inteiro bloqueado' : 'Horário bloqueado'}
                  </span>
                </div>
                {blockedTime.reason && (
                  <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                    <p className="text-sm text-muted-foreground">
                      <strong>Motivo:</strong> {blockedTime.reason}
                    </p>
                  </div>
                )}
              </div>
              <Button 
                onClick={() => handleUnblockTime(blockedTime.id)}
                variant="outline"
                className="w-full"
              >
                <Unlock className="h-4 w-4 mr-2" />
                Desbloquear
              </Button>
            </div>
          )}

          {/* Appointment view */}
          {appointment && status !== 'blocked' ? (
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
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Aceitar
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => handleUpdateStatus(appointment.id, 'cancelled')}
                      className="flex-1 text-red-600 border-red-200 hover:bg-red-50"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Recusar
                    </Button>
                  </>
                )}
                {status === 'occupied' && appointment.status === 'confirmed' && (
                  <>
                    <Button 
                      onClick={() => handleUpdateStatus(appointment.id, 'completed')}
                      className="flex-1"
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" />
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
                {status === 'occupied' && appointment.status === 'completed' && (
                  <p className="text-sm text-muted-foreground w-full text-center py-2">
                    ✅ Esta consulta já foi realizada.
                  </p>
                )}
                <Button
                  variant="outline"
                  onClick={() => openWhatsApp(appointment.patient_phone, appointment.patient_name)}
                  className="w-full"
                >
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Contatar via WhatsApp
                </Button>
              </div>
            </div>
          ) : status === 'available' ? (
            <div className="space-y-4">
              <p className="text-muted-foreground text-center">Horário disponível para agendamento.</p>
              <Button 
                onClick={handleOpenBlockDialog}
                variant="outline" 
                className="w-full"
              >
                <Ban className="h-4 w-4 mr-2" />
                Bloquear este horário
              </Button>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    );
  };

  const renderBlockDialog = () => {
    if (!selectedSlot) return null;

    return (
      <Dialog open={blockDialogOpen} onOpenChange={setBlockDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Ban className="h-5 w-5" />
              Bloquear Horário
            </DialogTitle>
            <DialogDescription>
              {format(selectedSlot.date, "EEEE, d 'de' MMMM", { locale: ptBR })} às {selectedSlot.time}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="full-day" className="text-sm font-medium">
                Bloquear o dia inteiro
              </Label>
              <Switch 
                id="full-day"
                checked={blockFullDay}
                onCheckedChange={setBlockFullDay}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reason">Motivo (opcional)</Label>
              <Textarea 
                id="reason"
                placeholder="Ex: Consulta médica, Férias, Reunião..."
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                className="resize-none"
                rows={3}
              />
            </div>

            <div className="flex gap-2">
              <Button 
                onClick={handleBlockTime}
                disabled={saving}
                className="flex-1"
              >
                {saving ? 'Salvando...' : 'Bloquear'}
              </Button>
              <Button 
                variant="outline"
                onClick={() => setBlockDialogOpen(false)}
                className="flex-1"
              >
                Cancelar
              </Button>
            </div>
          </div>
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
        {/* Header with view mode toggle */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Minha Agenda</h1>
            <p className="text-muted-foreground text-sm">
              Gerencie suas solicitações e compromissos
            </p>
          </div>
          
          {/* View mode toggle */}
          <div className="flex items-center gap-2 bg-muted p-1 rounded-lg">
            <Button
              variant={viewMode === 'requests' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('requests')}
              className="gap-2"
            >
              <List className="h-4 w-4" />
              Solicitações
              {allPendingAppointments.length > 0 && (
                <Badge variant="secondary" className="ml-1 bg-amber-100 text-amber-700">
                  {allPendingAppointments.length}
                </Badge>
              )}
            </Button>
            <Button
              variant={viewMode === 'daily' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('daily')}
              className="gap-2"
            >
              <CalendarDays className="h-4 w-4" />
              Agenda do Dia
            </Button>
          </div>
        </div>

        {/* Simplified Legend */}
        <Card>
          <CardContent className="py-3">
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <span className="font-medium text-muted-foreground">Legenda:</span>
              <div className="flex items-center gap-2">
                <div className={`w-4 h-4 rounded ${SIMPLE_STATUS_COLORS.available}`} />
                <span>Livre</span>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-4 h-4 rounded ${SIMPLE_STATUS_COLORS.pending}`} />
                <span>Pendente</span>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-4 h-4 rounded ${SIMPLE_STATUS_COLORS.occupied}`} />
                <span>Ocupado</span>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-4 h-4 rounded ${SIMPLE_STATUS_COLORS.blocked}`} />
                <span>Bloqueado</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* View mode content */}
        {viewMode === 'requests' ? (
          renderRequestsList()
        ) : (
          <>
            {/* Date navigation for daily view */}
            <div className="flex items-center justify-center gap-2">
              <Button variant="outline" size="icon" onClick={() => navigateDay('prev')}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" onClick={goToToday}>
                Hoje
              </Button>
              <Button variant="outline" size="icon" onClick={() => navigateDay('next')}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            {renderDailySchedule()}
          </>
        )}

        {/* Dialogs */}
        {renderSlotDialog()}
        {renderBlockDialog()}
      </div>
    </FuncionarioLayout>
  );
}
