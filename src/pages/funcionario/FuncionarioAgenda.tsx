import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { FuncionarioLayout } from '@/components/layout/FuncionarioLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Calendar, 
  Clock, 
  User,
  Phone,
  Mail,
  CheckCircle2,
  XCircle,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { format, addDays, startOfWeek, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { parseLocalDate } from '@/lib/dateUtils';
import { toast } from 'sonner';

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
}

export default function FuncionarioAgenda() {
  const { user } = useAuth();
  const [professionalId, setProfessionalId] = useState<string | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 0 }));

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      const { data: profData } = await supabase
        .from('professionals')
        .select('id')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (profData) {
        setProfessionalId(profData.id);

        const { data: aptData } = await supabase
          .from('appointments')
          .select('*')
          .eq('professional_uuid', profData.id)
          .order('appointment_date', { ascending: true })
          .order('appointment_time', { ascending: true });

        setAppointments(aptData || []);
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Erro ao carregar agenda');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (appointmentId: string, newStatus: string) => {
    setProcessing(appointmentId);
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: newStatus })
        .eq('id', appointmentId);

      if (error) throw error;
      
      setAppointments(prev => 
        prev.map(apt => apt.id === appointmentId ? { ...apt, status: newStatus } : apt)
      );
      toast.success(`Consulta ${newStatus === 'confirmed' ? 'confirmada' : newStatus === 'cancelled' ? 'cancelada' : 'atualizada'}!`);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Erro ao atualizar consulta');
    } finally {
      setProcessing(null);
    }
  };

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  }, [weekStart]);

  const getAppointmentsForDay = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    return appointments.filter(apt => apt.appointment_date === dateStr);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-500/10 text-green-600 border-green-500/20';
      case 'pending': return 'bg-orange-500/10 text-orange-600 border-orange-500/20';
      case 'completed': return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
      case 'cancelled': return 'bg-red-500/10 text-red-600 border-red-500/20';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'confirmed': return 'Confirmada';
      case 'pending': return 'Pendente';
      case 'completed': return 'Realizada';
      case 'cancelled': return 'Cancelada';
      default: return status;
    }
  };

  const pendingAppointments = appointments.filter(apt => apt.status === 'pending');
  const confirmedAppointments = appointments.filter(apt => apt.status === 'confirmed');
  const completedAppointments = appointments.filter(apt => apt.status === 'completed');

  if (loading) {
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
        <Tabs defaultValue="week" className="space-y-4">
          <TabsList>
            <TabsTrigger value="week">Visão Semanal</TabsTrigger>
            <TabsTrigger value="pending">
              Pendentes ({pendingAppointments.length})
            </TabsTrigger>
            <TabsTrigger value="confirmed">
              Confirmadas ({confirmedAppointments.length})
            </TabsTrigger>
            <TabsTrigger value="completed">
              Realizadas ({completedAppointments.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="week" className="space-y-4">
            {/* Week Navigation */}
            <div className="flex items-center justify-between">
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setWeekStart(addDays(weekStart, -7))}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Semana Anterior
              </Button>
              <span className="font-medium">
                {format(weekStart, "dd 'de' MMMM", { locale: ptBR })} - {format(addDays(weekStart, 6), "dd 'de' MMMM", { locale: ptBR })}
              </span>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => setWeekStart(addDays(weekStart, 7))}
              >
                Próxima Semana
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>

            {/* Week Grid */}
            <div className="grid grid-cols-7 gap-2">
              {weekDays.map((day) => {
                const dayAppointments = getAppointmentsForDay(day);
                const isToday = isSameDay(day, new Date());
                
                return (
                  <Card 
                    key={day.toISOString()} 
                    className={`min-h-[200px] ${isToday ? 'ring-2 ring-primary' : ''}`}
                  >
                    <CardHeader className="p-3 pb-2">
                      <CardTitle className="text-sm flex flex-col items-center">
                        <span className="text-xs text-muted-foreground">
                          {format(day, 'EEE', { locale: ptBR })}
                        </span>
                        <span className={`text-lg ${isToday ? 'text-primary font-bold' : ''}`}>
                          {format(day, 'dd')}
                        </span>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-2 space-y-1">
                      {dayAppointments.length === 0 ? (
                        <p className="text-xs text-muted-foreground text-center py-4">
                          Sem consultas
                        </p>
                      ) : (
                        dayAppointments.map((apt) => (
                          <div 
                            key={apt.id}
                            className={`p-2 rounded text-xs ${getStatusColor(apt.status)}`}
                          >
                            <p className="font-medium truncate">{apt.patient_name}</p>
                            <p className="text-[10px] opacity-75">
                              {apt.appointment_time.slice(0, 5)}
                            </p>
                          </div>
                        ))
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="pending">
            <AppointmentList 
              appointments={pendingAppointments}
              onConfirm={(id) => handleUpdateStatus(id, 'confirmed')}
              onCancel={(id) => handleUpdateStatus(id, 'cancelled')}
              processing={processing}
              showActions
            />
          </TabsContent>

          <TabsContent value="confirmed">
            <AppointmentList 
              appointments={confirmedAppointments}
              onComplete={(id) => handleUpdateStatus(id, 'completed')}
              onCancel={(id) => handleUpdateStatus(id, 'cancelled')}
              processing={processing}
              showCompleteAction
            />
          </TabsContent>

          <TabsContent value="completed">
            <AppointmentList 
              appointments={completedAppointments}
              processing={processing}
            />
          </TabsContent>
        </Tabs>
      </div>
    </FuncionarioLayout>
  );
}

interface AppointmentListProps {
  appointments: Appointment[];
  onConfirm?: (id: string) => void;
  onCancel?: (id: string) => void;
  onComplete?: (id: string) => void;
  processing: string | null;
  showActions?: boolean;
  showCompleteAction?: boolean;
}

function AppointmentList({ 
  appointments, 
  onConfirm, 
  onCancel, 
  onComplete,
  processing,
  showActions,
  showCompleteAction
}: AppointmentListProps) {
  if (appointments.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Nenhuma consulta nesta categoria</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {appointments.map((apt) => (
        <Card key={apt.id}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-medium">{apt.patient_name}</p>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(parseLocalDate(apt.appointment_date), "dd/MM/yyyy", { locale: ptBR })}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {apt.appointment_time.slice(0, 5)}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground ml-13">
                  <span className="flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    {apt.patient_phone}
                  </span>
                  <span className="flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    {apt.patient_email}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {showActions && (
                  <>
                    <Button 
                      size="sm"
                      onClick={() => onConfirm?.(apt.id)}
                      disabled={processing === apt.id}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                      Confirmar
                    </Button>
                    <Button 
                      size="sm"
                      variant="outline"
                      onClick={() => onCancel?.(apt.id)}
                      disabled={processing === apt.id}
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Recusar
                    </Button>
                  </>
                )}
                {showCompleteAction && (
                  <>
                    <Button 
                      size="sm"
                      onClick={() => onComplete?.(apt.id)}
                      disabled={processing === apt.id}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-1" />
                      Marcar Realizada
                    </Button>
                    <Button 
                      size="sm"
                      variant="outline"
                      onClick={() => onCancel?.(apt.id)}
                      disabled={processing === apt.id}
                    >
                      Cancelar
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
