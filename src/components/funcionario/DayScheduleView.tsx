import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ArrowLeft, Clock, User, Ban } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { InfoBanner } from './InfoBanner';
import { SimplifiedLegend } from './SimplifiedLegend';
import { useDaySchedule, type SimpleSlotStatus, type DaySlot } from '@/hooks/useDaySchedule';
import type { PendingRequest } from '@/hooks/usePendingRequests';

interface DayScheduleViewProps {
  date: Date;
  professionalId: string;
  selectedRequest?: PendingRequest;
  onSlotSelect: (time: string, status: SimpleSlotStatus) => void;
  onBack: () => void;
}

const STATUS_STYLES: Record<SimpleSlotStatus, { bg: string; text: string }> = {
  available: { bg: 'bg-success/10 hover:bg-success/20 border-success/30', text: 'text-success' },
  occupied: { bg: 'bg-destructive/10 border-destructive/30', text: 'text-destructive' },
  pending: { bg: 'bg-warning/10 border-warning/30', text: 'text-warning' },
  blocked: { bg: 'bg-slate-600/10 border-slate-600/30', text: 'text-slate-500' },
};

const STATUS_LABELS: Record<SimpleSlotStatus, string> = {
  available: 'Livre',
  occupied: 'Ocupado',
  pending: 'Solicitação',
  blocked: 'Bloqueado',
};

export function DayScheduleView({
  date,
  professionalId,
  selectedRequest,
  onSlotSelect,
  onBack
}: DayScheduleViewProps) {
  const { slots, isLoading } = useDaySchedule(professionalId, date);

  const formattedDate = format(date, "EEEE, dd 'de' MMMM", { locale: ptBR });
  const requestedTime = selectedRequest?.appointment_time.substring(0, 5);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-6 w-48" />
        </div>
        <Skeleton className="h-12 w-full" />
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h2 className="text-lg font-semibold capitalize">{formattedDate}</h2>
      </div>

      {/* Info banner */}
      <InfoBanner 
        message={
          selectedRequest 
            ? `Você está vendo os horários para ${selectedRequest.patient_name}`
            : 'Você está vendo apenas seus horários do dia'
        }
        variant="info"
      />

      {/* Legend */}
      <SimplifiedLegend />

      {/* Slots */}
      {slots.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            Nenhum horário disponível neste dia.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {slots.map((slot) => (
            <SlotRow
              key={slot.time}
              slot={slot}
              isRequestedSlot={slot.time === requestedTime}
              onClick={() => onSlotSelect(slot.time, slot.status)}
            />
          ))}
        </div>
      )}

      {/* Back button at bottom */}
      <Button variant="outline" onClick={onBack} className="w-full">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Voltar para Solicitações
      </Button>
    </div>
  );
}

interface SlotRowProps {
  slot: DaySlot;
  isRequestedSlot: boolean;
  onClick: () => void;
}

function SlotRow({ slot, isRequestedSlot, onClick }: SlotRowProps) {
  const styles = STATUS_STYLES[slot.status];
  const isClickable = slot.status === 'available';

  return (
    <Card 
      className={cn(
        'transition-all border',
        styles.bg,
        isClickable && 'cursor-pointer',
        isRequestedSlot && 'ring-2 ring-warning ring-offset-2'
      )}
      onClick={isClickable ? onClick : undefined}
    >
      <CardContent className="py-3 px-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Clock className={cn('h-4 w-4', styles.text)} />
            <span className="font-medium">{slot.time}</span>
          </div>

          <div className="flex items-center gap-3">
            {slot.appointment && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <User className="h-4 w-4" />
                <span>{slot.appointment.patient_name}</span>
                {slot.appointment.service_name && (
                  <span className="text-muted-foreground/60">
                    - {slot.appointment.service_name}
                  </span>
                )}
              </div>
            )}

            {slot.status === 'blocked' && slot.blockedReason && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Ban className="h-4 w-4" />
                <span>{slot.blockedReason}</span>
              </div>
            )}

            <span className={cn('text-sm font-medium', styles.text)}>
              {STATUS_LABELS[slot.status]}
            </span>

            {isRequestedSlot && (
              <span className="text-xs bg-warning text-warning-foreground px-2 py-0.5 rounded-full">
                SOLICITAÇÃO ATUAL
              </span>
            )}

            {isClickable && (
              <Button size="sm" variant="outline" className="ml-2">
                Sugerir
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
