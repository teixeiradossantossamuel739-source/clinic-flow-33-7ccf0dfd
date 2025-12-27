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
  DollarSign, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  TrendingUp,
  Users
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isToday, isTomorrow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { parseLocalDate } from '@/lib/dateUtils';
import { toast } from 'sonner';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface Professional {
  id: string;
  name: string;
  profession: string;
  email: string;
  avatar_url: string | null;
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
  notes: string | null;
  service_id: string | null;
}

export default function FuncionarioDashboard() {
  const { user } = useAuth();
  const [professional, setProfessional] = useState<Professional | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchProfessionalData();
    }
  }, [user]);

  const fetchProfessionalData = async () => {
    try {
      // Fetch professional linked to current user
      const { data: profData, error: profError } = await supabase
        .from('professionals')
        .select('*')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (profError) throw profError;

      if (profData) {
        setProfessional(profData);

        // Fetch appointments for this professional
        const { data: aptData, error: aptError } = await supabase
          .from('appointments')
          .select('*')
          .eq('professional_uuid', profData.id)
          .order('appointment_date', { ascending: true })
          .order('appointment_time', { ascending: true });

        if (aptError) throw aptError;
        setAppointments(aptData || []);
      }
    } catch (error) {
      console.error('Error fetching professional data:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmAppointment = async (appointmentId: string) => {
    setProcessing(appointmentId);
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'confirmed' })
        .eq('id', appointmentId);

      if (error) throw error;
      
      setAppointments(prev => 
        prev.map(apt => apt.id === appointmentId ? { ...apt, status: 'confirmed' } : apt)
      );
      toast.success('Consulta confirmada!');
    } catch (error) {
      console.error('Error confirming appointment:', error);
      toast.error('Erro ao confirmar consulta');
    } finally {
      setProcessing(null);
    }
  };

  const handleRefuseAppointment = async (appointmentId: string) => {
    setProcessing(appointmentId);
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'cancelled' })
        .eq('id', appointmentId);

      if (error) throw error;
      
      setAppointments(prev => 
        prev.map(apt => apt.id === appointmentId ? { ...apt, status: 'cancelled' } : apt)
      );
      toast.success('Consulta recusada');
    } catch (error) {
      console.error('Error refusing appointment:', error);
      toast.error('Erro ao recusar consulta');
    } finally {
      setProcessing(null);
    }
  };

  const handleMarkComplete = async (appointmentId: string) => {
    setProcessing(appointmentId);
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'completed' })
        .eq('id', appointmentId);

      if (error) throw error;
      
      setAppointments(prev => 
        prev.map(apt => apt.id === appointmentId ? { ...apt, status: 'completed' } : apt)
      );
      toast.success('Consulta marcada como realizada!');
    } catch (error) {
      console.error('Error completing appointment:', error);
      toast.error('Erro ao atualizar consulta');
    } finally {
      setProcessing(null);
    }
  };

  // Calculate statistics
  const stats = useMemo(() => {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    const weekStart = startOfWeek(now, { weekStartsOn: 0 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 0 });

    const paidAppointments = appointments.filter(apt => apt.payment_status === 'paid');
    
    const monthlyAppointments = paidAppointments.filter(apt => {
      const date = parseLocalDate(apt.appointment_date);
      return date >= monthStart && date <= monthEnd;
    });

    const weeklyAppointments = paidAppointments.filter(apt => {
      const date = parseLocalDate(apt.appointment_date);
      return date >= weekStart && date <= weekEnd;
    });

    const upcomingAppointments = appointments.filter(apt => {
      const date = parseLocalDate(apt.appointment_date);
      return date >= now && (apt.status === 'confirmed' || apt.status === 'pending');
    });

    const monthlyRevenue = monthlyAppointments.reduce((sum, apt) => sum + apt.amount_cents, 0);
    const weeklyRevenue = weeklyAppointments.reduce((sum, apt) => sum + apt.amount_cents, 0);

    return {
      totalAppointments: appointments.length,
      monthlyAppointments: monthlyAppointments.length,
      weeklyAppointments: weeklyAppointments.length,
      upcomingCount: upcomingAppointments.length,
      monthlyRevenue,
      weeklyRevenue,
    };
  }, [appointments]);

  // Pending appointments that need action
  const pendingAppointments = useMemo(() => {
    return appointments.filter(apt => 
      apt.status === 'pending' || apt.status === 'rescheduled'
    );
  }, [appointments]);

  // Upcoming confirmed appointments
  const upcomingConfirmed = useMemo(() => {
    const now = new Date();
    return appointments
      .filter(apt => {
        const date = parseLocalDate(apt.appointment_date);
        return date >= now && apt.status === 'confirmed';
      })
      .slice(0, 5);
  }, [appointments]);

  // Chart data for weekly appointments
  const chartData = useMemo(() => {
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 0 });
    const days = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    
    return days.map((day, index) => {
      const dayDate = new Date(weekStart);
      dayDate.setDate(dayDate.getDate() + index);
      const dateStr = format(dayDate, 'yyyy-MM-dd');
      
      const dayAppointments = appointments.filter(apt => 
        apt.appointment_date === dateStr && 
        (apt.status === 'confirmed' || apt.status === 'completed')
      );
      
      return {
        day,
        consultas: dayAppointments.length,
        receita: dayAppointments.reduce((sum, apt) => sum + apt.amount_cents / 100, 0),
      };
    });
  }, [appointments]);

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(cents / 100);
  };

  const getDateLabel = (dateStr: string) => {
    const date = parseLocalDate(dateStr);
    if (isToday(date)) return 'Hoje';
    if (isTomorrow(date)) return 'Amanhã';
    return format(date, "dd/MM", { locale: ptBR });
  };

  if (loading) {
    return (
      <FuncionarioLayout>
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
          <Skeleton className="h-64" />
        </div>
      </FuncionarioLayout>
    );
  }

  if (!professional) {
    return (
      <FuncionarioLayout>
        <Card className="max-w-lg mx-auto mt-12">
          <CardContent className="p-8 text-center">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Perfil não vinculado</h2>
            <p className="text-muted-foreground">
              Seu usuário ainda não está vinculado a um profissional. 
              Entre em contato com o administrador para vincular seu perfil.
            </p>
          </CardContent>
        </Card>
      </FuncionarioLayout>
    );
  }

  return (
    <FuncionarioLayout>
      <div className="space-y-6">
        {/* Welcome */}
        <div>
          <h2 className="text-2xl font-bold text-foreground">
            Olá, {professional.name.split(' ')[0]}!
          </h2>
          <p className="text-muted-foreground">
            Aqui está o resumo da sua atividade
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Consultas do Mês</p>
                  <p className="text-3xl font-bold">{stats.monthlyAppointments}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Calendar className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Receita do Mês</p>
                  <p className="text-3xl font-bold">{formatCurrency(stats.monthlyRevenue)}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-green-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Consultas da Semana</p>
                  <p className="text-3xl font-bold">{stats.weeklyAppointments}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Próximas Consultas</p>
                  <p className="text-3xl font-bold">{stats.upcomingCount}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-orange-500/10 flex items-center justify-center">
                  <Clock className="h-6 w-6 text-orange-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pending Appointments */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-orange-500" />
                Aguardando Confirmação ({pendingAppointments.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {pendingAppointments.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  Nenhuma consulta pendente
                </p>
              ) : (
                <div className="space-y-3">
                  {pendingAppointments.slice(0, 5).map((apt) => (
                    <div 
                      key={apt.id}
                      className="p-4 rounded-lg border bg-card"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <p className="font-medium">{apt.patient_name}</p>
                          <p className="text-sm text-muted-foreground">
                            {getDateLabel(apt.appointment_date)} às {apt.appointment_time.slice(0, 5)}
                          </p>
                        </div>
                        <Badge variant="outline" className="bg-orange-500/10 text-orange-600 border-orange-500/20">
                          Pendente
                        </Badge>
                      </div>
                      <div className="flex gap-2 mt-3">
                        <Button 
                          size="sm" 
                          onClick={() => handleConfirmAppointment(apt.id)}
                          disabled={processing === apt.id}
                          className="flex-1"
                        >
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          Confirmar
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleRefuseAppointment(apt.id)}
                          disabled={processing === apt.id}
                          className="flex-1"
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Recusar
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Weekly Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Consultas da Semana</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="day" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Bar 
                      dataKey="consultas" 
                      fill="hsl(var(--primary))" 
                      radius={[4, 4, 0, 0]}
                      name="Consultas"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Upcoming Confirmed */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Próximas Consultas Confirmadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {upcomingConfirmed.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                Nenhuma consulta confirmada nos próximos dias
              </p>
            ) : (
              <div className="space-y-3">
                {upcomingConfirmed.map((apt) => (
                  <div 
                    key={apt.id}
                    className="flex items-center justify-between p-4 rounded-lg border bg-card"
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <span className="text-sm font-medium text-primary">
                          {apt.patient_name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium">{apt.patient_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {getDateLabel(apt.appointment_date)} às {apt.appointment_time.slice(0, 5)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                        Confirmada
                      </Badge>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleMarkComplete(apt.id)}
                        disabled={processing === apt.id}
                      >
                        Marcar Realizada
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </FuncionarioLayout>
  );
}
