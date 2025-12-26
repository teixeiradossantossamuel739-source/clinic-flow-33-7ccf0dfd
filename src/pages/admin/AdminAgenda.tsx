import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { ProfessionalsSidebar } from '@/components/admin/ProfessionalsSidebar';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import {
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Plus,
} from 'lucide-react';
import { format, addDays, startOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface Appointment {
  id: string;
  patient_name: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  professional_uuid: string | null;
  service_id: string | null;
}

const statusConfig: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  pending: { label: 'Agendado', color: 'bg-warning/10 text-warning border-warning/20', icon: Clock },
  confirmed: { label: 'Confirmado', color: 'bg-success/10 text-success border-success/20', icon: CheckCircle2 },
  'in-progress': { label: 'Em Atendimento', color: 'bg-clinic-primary/10 text-clinic-primary border-clinic-primary/20', icon: AlertCircle },
  completed: { label: 'Concluído', color: 'bg-muted text-muted-foreground border-muted', icon: CheckCircle2 },
  cancelled: { label: 'Cancelado', color: 'bg-destructive/10 text-destructive border-destructive/20', icon: XCircle },
  'no-show': { label: 'Falta', color: 'bg-destructive/10 text-destructive border-destructive/20', icon: XCircle },
};

export default function AdminAgenda() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedProfessional, setSelectedProfessional] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'week' | 'day'>('week');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  const weekStart = addDays(startOfWeek(new Date(), { weekStartsOn: 1 }), weekOffset * 7);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const timeSlots = [
    '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
  ];

  useEffect(() => {
    const fetchAppointments = async () => {
      setLoading(true);
      
      const startDate = format(weekStart, 'yyyy-MM-dd');
      const endDate = format(addDays(weekStart, 6), 'yyyy-MM-dd');

      let query = supabase
        .from('appointments')
        .select('id, patient_name, appointment_date, appointment_time, status, professional_uuid, service_id')
        .gte('appointment_date', startDate)
        .lte('appointment_date', endDate);

      if (selectedProfessional) {
        query = query.eq('professional_uuid', selectedProfessional);
      }

      const { data, error } = await query;

      if (!error && data) {
        setAppointments(data);
      }
      setLoading(false);
    };

    fetchAppointments();
  }, [weekOffset, selectedProfessional]);

  const getAppointmentForSlot = (date: Date, time: string) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const timeFormatted = time + ':00';
    return appointments.find((a) => a.appointment_date === dateStr && a.appointment_time === timeFormatted);
  };

  const getStatusConfig = (status: string) => {
    return statusConfig[status] || statusConfig.pending;
  };

  return (
    <AdminLayout>
      <div className="flex h-[calc(100vh-4rem)] -m-6">
        {/* Professionals Sidebar */}
        <ProfessionalsSidebar
          selectedId={selectedProfessional}
          onSelect={setSelectedProfessional}
        />

        {/* Main Content */}
        <div className="flex-1 overflow-auto p-6">
          <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold">Agenda</h1>
                <p className="text-muted-foreground">
                  Gerencie consultas e horários
                </p>
              </div>
              <Button variant="clinic">
                <Plus className="h-4 w-4" />
                Nova Consulta
              </Button>
            </div>

            {/* Filters */}
            <div className="bg-background rounded-2xl p-4 shadow-sm border border-border">
              <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                {/* View toggle */}
                <div className="flex items-center gap-2 bg-muted rounded-lg p-1">
                  <button
                    onClick={() => setViewMode('week')}
                    className={cn(
                      'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                      viewMode === 'week'
                        ? 'bg-background shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    Semana
                  </button>
                  <button
                    onClick={() => setViewMode('day')}
                    className={cn(
                      'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                      viewMode === 'day'
                        ? 'bg-background shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    Dia
                  </button>
                </div>

                {/* Week navigation */}
                <div className="flex items-center gap-2 ml-auto">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setWeekOffset((w) => w - 1)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm font-medium min-w-[180px] text-center">
                    {format(weekStart, "dd 'de' MMMM", { locale: ptBR })} -{' '}
                    {format(addDays(weekStart, 6), "dd 'de' MMMM", { locale: ptBR })}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => setWeekOffset((w) => w + 1)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setWeekOffset(0)}
                    className="ml-2"
                  >
                    Hoje
                  </Button>
                </div>
              </div>
            </div>

            {/* Calendar Grid */}
            <div className="bg-background rounded-2xl shadow-sm border border-border overflow-hidden">
              {loading ? (
                <div className="flex items-center justify-center h-64">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <div className="min-w-[800px]">
                    {/* Header */}
                    <div className="grid grid-cols-8 border-b border-border">
                      <div className="p-4 text-sm font-medium text-muted-foreground">
                        Horário
                      </div>
                      {weekDays.map((date) => {
                        const isToday = format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
                        return (
                          <div
                            key={date.toISOString()}
                            className={cn(
                              'p-4 text-center border-l border-border',
                              isToday && 'bg-primary/5'
                            )}
                          >
                            <p className="text-sm text-muted-foreground">
                              {format(date, 'EEE', { locale: ptBR })}
                            </p>
                            <p
                              className={cn(
                                'text-lg font-semibold',
                                isToday && 'text-primary'
                              )}
                            >
                              {format(date, 'd')}
                            </p>
                          </div>
                        );
                      })}
                    </div>

                    {/* Time slots */}
                    <div className="divide-y divide-border">
                      {timeSlots.map((time) => (
                        <div key={time} className="grid grid-cols-8">
                          <div className="p-3 text-sm text-muted-foreground flex items-center justify-center">
                            {time}
                          </div>
                          {weekDays.map((date) => {
                            const appointment = getAppointmentForSlot(date, time);
                            const isToday = format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');

                            return (
                              <div
                                key={date.toISOString()}
                                className={cn(
                                  'p-1 border-l border-border min-h-[60px]',
                                  isToday && 'bg-primary/5'
                                )}
                              >
                                {appointment && (
                                  <div
                                    className={cn(
                                      'h-full rounded-lg p-2 text-xs border cursor-pointer hover:shadow-md transition-all',
                                      getStatusConfig(appointment.status).color
                                    )}
                                  >
                                    <p className="font-medium truncate">{appointment.patient_name}</p>
                                    <p className="truncate opacity-80">{getStatusConfig(appointment.status).label}</p>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Legend */}
            <div className="flex flex-wrap gap-4">
              {Object.entries(statusConfig).map(([key, config]) => (
                <div key={key} className="flex items-center gap-2 text-sm">
                  <div className={cn('h-3 w-3 rounded-full', config.color.split(' ')[0])} />
                  <span className="text-muted-foreground">{config.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
