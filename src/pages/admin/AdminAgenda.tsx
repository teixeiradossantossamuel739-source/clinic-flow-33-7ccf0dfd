import { useState } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { appointments, professionals } from '@/data/mockData';
import { Button } from '@/components/ui/button';
import {
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Phone,
  ChevronLeft,
  ChevronRight,
  Filter,
  Plus,
} from 'lucide-react';
import { format, addDays, startOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const statusConfig = {
  agendado: { label: 'Agendado', color: 'bg-warning/10 text-warning border-warning/20', icon: Clock },
  confirmado: { label: 'Confirmado', color: 'bg-success/10 text-success border-success/20', icon: CheckCircle2 },
  'em-atendimento': { label: 'Em Atendimento', color: 'bg-clinic-primary/10 text-clinic-primary border-clinic-primary/20', icon: AlertCircle },
  concluido: { label: 'Concluído', color: 'bg-muted text-muted-foreground border-muted', icon: CheckCircle2 },
  cancelado: { label: 'Cancelado', color: 'bg-destructive/10 text-destructive border-destructive/20', icon: XCircle },
  falta: { label: 'Falta', color: 'bg-destructive/10 text-destructive border-destructive/20', icon: XCircle },
};

export default function AdminAgenda() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedProfessional, setSelectedProfessional] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'week' | 'day'>('week');

  const weekStart = addDays(startOfWeek(new Date(), { weekStartsOn: 1 }), weekOffset * 7);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const timeSlots = [
    '08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
  ];

  const filteredAppointments = selectedProfessional
    ? appointments.filter((a) => a.professionalId === selectedProfessional)
    : appointments;

  const getAppointmentForSlot = (date: Date, time: string) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return filteredAppointments.find((a) => a.date === dateStr && a.time === time);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Agenda</h1>
            <p className="text-clinic-text-secondary">
              Gerencie consultas e horários
            </p>
          </div>
          <Button variant="clinic">
            <Plus className="h-4 w-4" />
            Nova Consulta
          </Button>
        </div>

        {/* Filters */}
        <div className="bg-background rounded-2xl p-4 shadow-clinic-sm">
          <div className="flex flex-col lg:flex-row lg:items-center gap-4">
            {/* Professional filter */}
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-clinic-text-muted" />
              <select
                value={selectedProfessional || ''}
                onChange={(e) => setSelectedProfessional(e.target.value || null)}
                className="bg-clinic-surface rounded-lg px-3 py-2 text-sm outline-none border-none min-w-[200px]"
              >
                <option value="">Todos os profissionais</option>
                {professionals.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            {/* View toggle */}
            <div className="flex items-center gap-2 bg-clinic-surface rounded-lg p-1">
              <button
                onClick={() => setViewMode('week')}
                className={cn(
                  'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                  viewMode === 'week'
                    ? 'bg-background shadow-clinic-sm'
                    : 'text-clinic-text-secondary hover:text-foreground'
                )}
              >
                Semana
              </button>
              <button
                onClick={() => setViewMode('day')}
                className={cn(
                  'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                  viewMode === 'day'
                    ? 'bg-background shadow-clinic-sm'
                    : 'text-clinic-text-secondary hover:text-foreground'
                )}
              >
                Dia
              </button>
            </div>

            {/* Week navigation */}
            <div className="flex items-center gap-2 ml-auto">
              <Button
                variant="outline"
                size="icon-sm"
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
                size="icon-sm"
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
        <div className="bg-background rounded-2xl shadow-clinic-sm overflow-hidden">
          <div className="overflow-x-auto">
            <div className="min-w-[800px]">
              {/* Header */}
              <div className="grid grid-cols-8 border-b border-clinic-border-subtle">
                <div className="p-4 text-sm font-medium text-clinic-text-muted">
                  Horário
                </div>
                {weekDays.map((date) => {
                  const isToday = format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
                  return (
                    <div
                      key={date.toISOString()}
                      className={cn(
                        'p-4 text-center border-l border-clinic-border-subtle',
                        isToday && 'bg-clinic-primary/5'
                      )}
                    >
                      <p className="text-sm text-clinic-text-muted">
                        {format(date, 'EEE', { locale: ptBR })}
                      </p>
                      <p
                        className={cn(
                          'text-lg font-semibold',
                          isToday && 'text-clinic-primary'
                        )}
                      >
                        {format(date, 'd')}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* Time slots */}
              <div className="divide-y divide-clinic-border-subtle">
                {timeSlots.map((time) => (
                  <div key={time} className="grid grid-cols-8">
                    <div className="p-3 text-sm text-clinic-text-muted flex items-center justify-center">
                      {time}
                    </div>
                    {weekDays.map((date) => {
                      const appointment = getAppointmentForSlot(date, time);
                      const isToday = format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');

                      return (
                        <div
                          key={date.toISOString()}
                          className={cn(
                            'p-1 border-l border-clinic-border-subtle min-h-[60px]',
                            isToday && 'bg-clinic-primary/5'
                          )}
                        >
                          {appointment && (
                            <div
                              className={cn(
                                'h-full rounded-lg p-2 text-xs border cursor-pointer hover:shadow-clinic-sm transition-all',
                                statusConfig[appointment.status].color
                              )}
                            >
                              <p className="font-medium truncate">{appointment.patientName}</p>
                              <p className="truncate opacity-80">{appointment.specialty}</p>
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
        </div>

        {/* Legend */}
        <div className="flex flex-wrap gap-4">
          {Object.entries(statusConfig).map(([key, config]) => (
            <div key={key} className="flex items-center gap-2 text-sm">
              <div className={cn('h-3 w-3 rounded-full', config.color.split(' ')[0])} />
              <span className="text-clinic-text-secondary">{config.label}</span>
            </div>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}
