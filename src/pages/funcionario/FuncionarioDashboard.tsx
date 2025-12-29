import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { FuncionarioLayout } from '@/components/layout/FuncionarioLayout';
import { useAppointmentNotifications } from '@/hooks/useAppointmentNotifications';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  Calendar, 
  DollarSign, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  TrendingUp,
  Users,
  MessageCircle,
  Target,
  Settings2,
  Bell,
  Send
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, isToday, isTomorrow, addDays } from 'date-fns';
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
  confirmation_token?: string;
  patient_confirmed_at?: string | null;
}

interface FinancialGoal {
  id: string;
  professional_id: string;
  month: number;
  year: number;
  goal_amount_cents: number;
}

export default function FuncionarioDashboard() {
  const { user } = useAuth();
  
  // All useState hooks first
  const [professional, setProfessional] = useState<Professional | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [financialGoal, setFinancialGoal] = useState<FinancialGoal | null>(null);
  const [goalDialogOpen, setGoalDialogOpen] = useState(false);
  const [goalInput, setGoalInput] = useState('');
  
  // Store professional ID in a stable variable for hooks
  const professionalId = professional?.id || null;

  // Custom hook for notifications - must be called unconditionally
  const { unreadCount } = useAppointmentNotifications(professionalId);

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

        // Fetch current month's financial goal
        const now = new Date();
        const currentMonth = now.getMonth() + 1;
        const currentYear = now.getFullYear();

        const { data: goalData, error: goalError } = await supabase
          .from('professional_goals')
          .select('*')
          .eq('professional_id', profData.id)
          .eq('month', currentMonth)
          .eq('year', currentYear)
          .maybeSingle();

        if (goalError) {
          console.error('Error fetching goal:', goalError);
        } else if (goalData) {
          setFinancialGoal(goalData);
          setGoalInput(String(goalData.goal_amount_cents / 100));
        }
      }
    } catch (error) {
      console.error('Error fetching professional data:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveGoal = async () => {
    if (!professional) return;

    const amountCents = Math.round(parseFloat(goalInput.replace(',', '.')) * 100);
    if (isNaN(amountCents) || amountCents <= 0) {
      toast.error('Digite um valor válido');
      return;
    }

    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    try {
      if (financialGoal) {
        // Update existing goal
        const { error } = await supabase
          .from('professional_goals')
          .update({ goal_amount_cents: amountCents })
          .eq('id', financialGoal.id);

        if (error) throw error;

        setFinancialGoal({ ...financialGoal, goal_amount_cents: amountCents });
      } else {
        // Insert new goal
        const { data, error } = await supabase
          .from('professional_goals')
          .insert({
            professional_id: professional.id,
            month: currentMonth,
            year: currentYear,
            goal_amount_cents: amountCents,
          })
          .select()
          .single();

        if (error) throw error;
        setFinancialGoal(data);
      }

      toast.success('Meta salva com sucesso!');
      setGoalDialogOpen(false);
    } catch (error) {
      console.error('Error saving goal:', error);
      toast.error('Erro ao salvar meta');
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

  // Format phone number and generate WhatsApp link
  const generateWhatsAppLink = (phone: string, patientName: string, dateStr: string, time: string) => {
    const digits = phone.replace(/\D/g, '');
    const formattedPhone = digits.startsWith('55') ? digits : `55${digits}`;
    const [year, month, day] = dateStr.split('-');
    const formattedDate = `${day}/${month}/${year}`;
    
    const message = `Olá ${patientName}! 👋

Confirmamos sua consulta:
📅 Data: ${formattedDate}
⏰ Horário: ${time}

Aguardamos você!`;

    return `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
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

  // Tomorrow's appointments for reminders
  const tomorrowAppointments = useMemo(() => {
    const tomorrow = addDays(new Date(), 1);
    const tomorrowStr = format(tomorrow, 'yyyy-MM-dd');
    return appointments.filter(apt => 
      apt.appointment_date === tomorrowStr && apt.status === 'confirmed'
    );
  }, [appointments]);

  // Generate reminder message with confirmation link
  const generateReminderLink = (apt: Appointment & { confirmation_token?: string }) => {
    const digits = apt.patient_phone.replace(/\D/g, '');
    const formattedPhone = digits.startsWith('55') ? digits : `55${digits}`;
    const [year, month, day] = apt.appointment_date.split('-');
    const formattedDate = `${day}/${month}/${year}`;
    const formattedTime = apt.appointment_time.slice(0, 5);
    
    const confirmationUrl = apt.confirmation_token 
      ? `${window.location.origin}/confirmar-presenca?token=${apt.confirmation_token}`
      : '';
    
    const message = `📅 *Lembrete de Consulta*

Olá ${apt.patient_name}! 👋

Lembramos que você tem uma consulta agendada para amanhã:

📆 *Data:* ${formattedDate}
⏰ *Horário:* ${formattedTime}
🏥 *Profissional:* ${professional?.name}

${confirmationUrl ? `✅ *Confirme sua presença:*\n${confirmationUrl}\n` : ''}
⚠️ Em caso de imprevisto, por favor avise com antecedência.

Aguardamos você! 😊`;

    return `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
  };

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

  const goalProgress = useMemo(() => {
    if (!financialGoal || financialGoal.goal_amount_cents === 0) return 0;
    return Math.min(100, (stats.monthlyRevenue / financialGoal.goal_amount_cents) * 100);
  }, [financialGoal, stats.monthlyRevenue]);

  const getProgressColor = (progress: number) => {
    if (progress >= 100) return 'bg-green-500';
    if (progress >= 75) return 'bg-emerald-500';
    if (progress >= 50) return 'bg-yellow-500';
    if (progress >= 25) return 'bg-orange-500';
    return 'bg-red-500';
  };

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

        {/* Financial Goal Card */}
        <Card className="border-2 border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Target className="h-5 w-5 text-primary" />
                Meta Financeira - {format(new Date(), 'MMMM yyyy', { locale: ptBR })}
              </CardTitle>
              <Dialog open={goalDialogOpen} onOpenChange={setGoalDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                    <Settings2 className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Configurar Meta Mensal</DialogTitle>
                    <DialogDescription>
                      Defina sua meta de faturamento para {format(new Date(), 'MMMM yyyy', { locale: ptBR })}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="py-4">
                    <Label htmlFor="goal-amount">Valor da Meta (R$)</Label>
                    <Input
                      id="goal-amount"
                      type="number"
                      placeholder="Ex: 10000"
                      value={goalInput}
                      onChange={(e) => setGoalInput(e.target.value)}
                      className="mt-2"
                    />
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setGoalDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={handleSaveGoal}>
                      Salvar Meta
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {financialGoal ? (
              <div className="space-y-4">
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-3xl font-bold text-foreground">
                      {formatCurrency(stats.monthlyRevenue)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      de {formatCurrency(financialGoal.goal_amount_cents)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`text-2xl font-bold ${goalProgress >= 100 ? 'text-green-500' : 'text-foreground'}`}>
                      {goalProgress.toFixed(0)}%
                    </p>
                    {goalProgress >= 100 && (
                      <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                        Meta Atingida! 🎉
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="relative">
                  <div className="h-4 w-full rounded-full bg-secondary overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-500 ${getProgressColor(goalProgress)} rounded-full`}
                      style={{ width: `${goalProgress}%` }}
                    />
                  </div>
                  {/* Milestone markers */}
                  <div className="absolute top-0 left-1/4 h-4 w-px bg-foreground/20" />
                  <div className="absolute top-0 left-1/2 h-4 w-px bg-foreground/20" />
                  <div className="absolute top-0 left-3/4 h-4 w-px bg-foreground/20" />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>0%</span>
                  <span>25%</span>
                  <span>50%</span>
                  <span>75%</span>
                  <span>100%</span>
                </div>
                {goalProgress < 100 && (
                  <p className="text-sm text-muted-foreground">
                    Faltam <span className="font-semibold text-foreground">
                      {formatCurrency(financialGoal.goal_amount_cents - stats.monthlyRevenue)}
                    </span> para atingir a meta
                  </p>
                )}
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-muted-foreground mb-3">
                  Nenhuma meta definida para este mês
                </p>
                <Button onClick={() => setGoalDialogOpen(true)} variant="outline">
                  <Target className="h-4 w-4 mr-2" />
                  Definir Meta
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

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
                    <div className="flex items-center gap-2">
                      <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                        Confirmada
                      </Badge>
                      {apt.patient_phone && (
                        <Button 
                          size="sm" 
                          variant="outline"
                          asChild
                          className="text-green-600 border-green-200 hover:bg-green-50"
                        >
                          <a 
                            href={generateWhatsAppLink(apt.patient_phone, apt.patient_name, apt.appointment_date, apt.appointment_time.slice(0, 5))} 
                            target="_blank" 
                            rel="noopener noreferrer"
                          >
                            <MessageCircle className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
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

        {/* Tomorrow's Reminders */}
        {tomorrowAppointments.length > 0 && (
          <Card className="border-2 border-yellow-500/20 bg-gradient-to-r from-yellow-500/5 to-transparent">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5 text-yellow-500" />
                Lembretes para Amanhã ({tomorrowAppointments.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Envie lembretes via WhatsApp para os pacientes com consulta amanhã
              </p>
              <div className="space-y-3">
                {tomorrowAppointments.map((apt) => (
                  <div 
                    key={apt.id}
                    className="flex items-center justify-between p-4 rounded-lg border bg-card"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                        apt.patient_confirmed_at 
                          ? 'bg-green-500/10' 
                          : 'bg-yellow-500/10'
                      }`}>
                        {apt.patient_confirmed_at ? (
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                        ) : (
                          <span className="text-sm font-medium text-yellow-600">
                            {apt.patient_name.charAt(0).toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{apt.patient_name}</p>
                          {apt.patient_confirmed_at && (
                            <span className="text-xs bg-green-500/10 text-green-600 px-2 py-0.5 rounded-full">
                              Confirmado
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {apt.appointment_time.slice(0, 5)}
                        </p>
                      </div>
                    </div>
                    {apt.patient_phone && !apt.patient_confirmed_at && (
                      <Button 
                        size="sm" 
                        variant="outline"
                        asChild
                        className="text-yellow-600 border-yellow-200 hover:bg-yellow-50 gap-2"
                      >
                        <a 
                          href={generateReminderLink(apt)} 
                          target="_blank" 
                          rel="noopener noreferrer"
                        >
                          <Send className="h-4 w-4" />
                          Enviar Lembrete
                        </a>
                      </Button>
                    )}
                    {apt.patient_confirmed_at && (
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(apt.patient_confirmed_at), "dd/MM 'às' HH:mm")}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </FuncionarioLayout>
  );
}
