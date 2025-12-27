import { useEffect, useState, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { FuncionarioLayout } from '@/components/layout/FuncionarioLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { 
  DollarSign, 
  TrendingUp, 
  Calendar,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { parseLocalDate } from '@/lib/dateUtils';
import { toast } from 'sonner';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface Appointment {
  id: string;
  patient_name: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  payment_status: string;
  amount_cents: number;
}

export default function FuncionarioFinanceiro() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

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
        const { data: aptData } = await supabase
          .from('appointments')
          .select('*')
          .eq('professional_uuid', profData.id)
          .order('appointment_date', { ascending: false });

        setAppointments(aptData || []);
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Erro ao carregar dados financeiros');
    } finally {
      setLoading(false);
    }
  };

  const stats = useMemo(() => {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    const weekStart = startOfWeek(now, { weekStartsOn: 0 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 0 });
    const lastMonthStart = startOfMonth(subMonths(now, 1));
    const lastMonthEnd = endOfMonth(subMonths(now, 1));

    const paidAppointments = appointments.filter(apt => apt.payment_status === 'paid');

    const monthlyPaid = paidAppointments.filter(apt => {
      const date = parseLocalDate(apt.appointment_date);
      return date >= monthStart && date <= monthEnd;
    });

    const weeklyPaid = paidAppointments.filter(apt => {
      const date = parseLocalDate(apt.appointment_date);
      return date >= weekStart && date <= weekEnd;
    });

    const lastMonthPaid = paidAppointments.filter(apt => {
      const date = parseLocalDate(apt.appointment_date);
      return date >= lastMonthStart && date <= lastMonthEnd;
    });

    const monthlyRevenue = monthlyPaid.reduce((sum, apt) => sum + apt.amount_cents, 0);
    const weeklyRevenue = weeklyPaid.reduce((sum, apt) => sum + apt.amount_cents, 0);
    const lastMonthRevenue = lastMonthPaid.reduce((sum, apt) => sum + apt.amount_cents, 0);
    const totalRevenue = paidAppointments.reduce((sum, apt) => sum + apt.amount_cents, 0);

    const monthlyGrowth = lastMonthRevenue > 0 
      ? ((monthlyRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 
      : 0;

    return {
      monthlyRevenue,
      weeklyRevenue,
      lastMonthRevenue,
      totalRevenue,
      monthlyGrowth,
      monthlyCount: monthlyPaid.length,
      weeklyCount: weeklyPaid.length,
    };
  }, [appointments]);

  // Chart data - last 6 months
  const chartData = useMemo(() => {
    const months: { month: string; receita: number }[] = [];
    const now = new Date();

    for (let i = 5; i >= 0; i--) {
      const monthDate = subMonths(now, i);
      const monthStart = startOfMonth(monthDate);
      const monthEnd = endOfMonth(monthDate);

      const monthRevenue = appointments
        .filter(apt => {
          const date = parseLocalDate(apt.appointment_date);
          return apt.payment_status === 'paid' && date >= monthStart && date <= monthEnd;
        })
        .reduce((sum, apt) => sum + apt.amount_cents / 100, 0);

      months.push({
        month: format(monthDate, 'MMM', { locale: ptBR }),
        receita: monthRevenue,
      });
    }

    return months;
  }, [appointments]);

  // Recent payments
  const recentPayments = useMemo(() => {
    return appointments
      .filter(apt => apt.payment_status === 'paid')
      .slice(0, 10);
  }, [appointments]);

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(cents / 100);
  };

  if (loading) {
    return (
      <FuncionarioLayout>
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="h-32" />
            ))}
          </div>
          <Skeleton className="h-80" />
        </div>
      </FuncionarioLayout>
    );
  }

  return (
    <FuncionarioLayout>
      <div className="space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Receita do Mês</p>
                  <p className="text-2xl font-bold">{formatCurrency(stats.monthlyRevenue)}</p>
                  <div className="flex items-center gap-1 mt-1">
                    {stats.monthlyGrowth >= 0 ? (
                      <ArrowUpRight className="h-4 w-4 text-green-500" />
                    ) : (
                      <ArrowDownRight className="h-4 w-4 text-red-500" />
                    )}
                    <span className={`text-sm ${stats.monthlyGrowth >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {Math.abs(stats.monthlyGrowth).toFixed(1)}%
                    </span>
                    <span className="text-xs text-muted-foreground">vs mês anterior</span>
                  </div>
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
                  <p className="text-sm text-muted-foreground">Receita da Semana</p>
                  <p className="text-2xl font-bold">{formatCurrency(stats.weeklyRevenue)}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {stats.weeklyCount} consultas
                  </p>
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
                  <p className="text-sm text-muted-foreground">Mês Anterior</p>
                  <p className="text-2xl font-bold">{formatCurrency(stats.lastMonthRevenue)}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Comparativo
                  </p>
                </div>
                <div className="h-12 w-12 rounded-full bg-orange-500/10 flex items-center justify-center">
                  <Calendar className="h-6 w-6 text-orange-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Geral</p>
                  <p className="text-2xl font-bold">{formatCurrency(stats.totalRevenue)}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Histórico completo
                  </p>
                </div>
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <DollarSign className="h-6 w-6 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Evolução da Receita (Últimos 6 Meses)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorReceita" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis 
                    className="text-xs" 
                    tickFormatter={(value) => `R$${value}`}
                  />
                  <Tooltip 
                    formatter={(value: number) => [formatCurrency(value * 100), 'Receita']}
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))',
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px'
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="receita" 
                    stroke="hsl(var(--primary))" 
                    fillOpacity={1}
                    fill="url(#colorReceita)"
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Recent Payments */}
        <Card>
          <CardHeader>
            <CardTitle>Últimos Pagamentos Recebidos</CardTitle>
          </CardHeader>
          <CardContent>
            {recentPayments.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nenhum pagamento registrado
              </p>
            ) : (
              <div className="space-y-3">
                {recentPayments.map((apt) => (
                  <div 
                    key={apt.id}
                    className="flex items-center justify-between p-4 rounded-lg border bg-card"
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-green-500/10 flex items-center justify-center">
                        <DollarSign className="h-5 w-5 text-green-500" />
                      </div>
                      <div>
                        <p className="font-medium">{apt.patient_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {format(parseLocalDate(apt.appointment_date), "dd/MM/yyyy", { locale: ptBR })} às {apt.appointment_time.slice(0, 5)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-green-600">{formatCurrency(apt.amount_cents)}</p>
                      <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
                        Pago
                      </Badge>
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
