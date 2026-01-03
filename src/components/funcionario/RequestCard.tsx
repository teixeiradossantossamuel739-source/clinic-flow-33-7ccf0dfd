import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar, Clock, User, Check, X, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { parseLocalDate } from '@/lib/dateUtils';
import type { PendingRequest } from '@/hooks/usePendingRequests';

interface RequestCardProps {
  request: PendingRequest;
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
  onViewSchedule: (date: Date, request: PendingRequest) => void;
}

export function RequestCard({ request, onAccept, onReject, onViewSchedule }: RequestCardProps) {
  const appointmentDate = parseLocalDate(request.appointment_date);
  const formattedDate = format(appointmentDate, "EEE, dd/MM", { locale: ptBR });
  const formattedTime = request.appointment_time.substring(0, 5);

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex flex-col gap-3">
          {/* Header with patient name and status */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-warning animate-pulse" />
              <span className="font-semibold text-foreground">{request.patient_name}</span>
            </div>
            <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30">
              Pendente
            </Badge>
          </div>

          {/* Info row */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              <span className="capitalize">{formattedDate}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Clock className="h-4 w-4" />
              <span>{formattedTime}</span>
            </div>
            {request.service && (
              <div className="flex items-center gap-1.5">
                <User className="h-4 w-4" />
                <span>{request.service.name}</span>
                {request.service.duration_minutes && (
                  <span className="text-muted-foreground/60">
                    ({request.service.duration_minutes} min)
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-wrap gap-2 pt-2 border-t border-border">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onViewSchedule(appointmentDate, request)}
              className="flex-1 min-w-[100px]"
            >
              <Eye className="h-4 w-4 mr-1" />
              Ver horários
            </Button>
            <Button
              variant="default"
              size="sm"
              onClick={() => onAccept(request.id)}
              className="flex-1 min-w-[100px] bg-success hover:bg-success/90"
            >
              <Check className="h-4 w-4 mr-1" />
              Aceitar
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => onReject(request.id)}
              className="flex-1 min-w-[100px]"
            >
              <X className="h-4 w-4 mr-1" />
              Recusar
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
