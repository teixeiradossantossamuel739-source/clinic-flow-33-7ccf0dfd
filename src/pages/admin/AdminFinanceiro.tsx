import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { DollarSign, TrendingUp, Users, Calendar, Filter } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface Professional {
  id: string;
  name: string;
  avatar_url: string | null;
  specialty_id: string;
}

interface ProfessionalEarning {
  professional: Professional;
  totalEarnings: number;
  appointmentCount: number;
  averageTicket: number;
}

interface MonthlyChartData {
  month: string;
  [professionalId: string]: number | string;
}

const CHART_COLORS = [
  'hsl(var(--primary))',
  'hsl(142, 76%, 36%)',
  'hsl(221, 83%, 53%)',
  'hsl(280, 87%, 50%)',
  'hsl(38, 92%, 50%)',
  'hsl(0, 84%, 60%)',
  'hsl(180, 70%, 45%)',
  'hsl(330, 80%, 55%)',
];

export default function AdminFinanceiro() {
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [earnings, setEarnings] = useState<ProfessionalEarning[]>([]);
  const [monthlyChartData, setMonthlyChartData] = useState<MonthlyChartData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<string>(format(new Date(), 'yyyy-MM'));

  useEffect(() => {
    fetchData();
    fetchMonthlyEvolution();
  }, [selectedMonth]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Parse month
      const [year, month] = selectedMonth.split('-').map(Number);
      const startDate = startOfMonth(new Date(year, month - 1));
      const endDate = endOfMonth(new Date(year, month - 1));

      // Fetch professionals
      const { data: profData } = await supabase
        .from('professionals')
        .select('id, name, avatar_url, specialty_id')
        .eq('is_active', true);

      setProfessionals(profData || []);

      // Fetch completed appointments in the month
      const { data: appointments } = await supabase
        .from('appointments')
        .select('professional_uuid, amount_cents, status, payment_status')
        .gte('appointment_date', format(startDate, 'yyyy-MM-dd'))
        .lte('appointment_date', format(endDate, 'yyyy-MM-dd'))
        .eq('status', 'completed')
        .eq('payment_status', 'paid');

      // Calculate earnings per professional
      const earningsMap = new Map<string, { total: number; count: number }>();

      (appointments || []).forEach((apt) => {
        if (apt.professional_uuid) {
          const current = earningsMap.get(apt.professional_uuid) || { total: 0, count: 0 };
          earningsMap.set(apt.professional_uuid, {
            total: current.total + apt.amount_cents,
            count: current.count + 1,
          });
        }
      });

      // Build earnings array
      const earningsArray: ProfessionalEarning[] = (profData || []).map((prof) => {
        const data = earningsMap.get(prof.id) || { total: 0, count: 0 };
        return {
          professional: prof,
          totalEarnings: data.total,
          appointmentCount: data.count,
          averageTicket: data.count > 0 ? data.total / data.count : 0,
        };
      });

      // Sort by earnings (highest first)
      earningsArray.sort((a, b) => b.totalEarnings - a.totalEarnings);

      setEarnings(earningsArray);
    } catch (error) {
      console.error('Error fetching financial data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMonthlyEvolution = async () => {
    try {
      // Fetch professionals first
      const { data: profData } = await supabase
        .from('professionals')
        .select('id, name')
        .eq('is_active', true);

      if (!profData || profData.length === 0) return;

      // Get last 6 months data
      const chartData: MonthlyChartData[] = [];
      
      for (let i = 5; i >= 0; i--) {
        const date = subMonths(new Date(), i);
        const startDate = startOfMonth(date);
        const endDate = endOfMonth(date);
        const monthLabel = format(date, 'MMM/yy', { locale: ptBR });

        const { data: appointments } = await supabase
          .from('appointments')
          .select('professional_uuid, amount_cents')
          .gte('appointment_date', format(startDate, 'yyyy-MM-dd'))
          .lte('appointment_date', format(endDate, 'yyyy-MM-dd'))
          .eq('status', 'completed')
          .eq('payment_status', 'paid');

        const monthData: MonthlyChartData = { month: monthLabel };

        profData.forEach((prof) => {
          const profAppointments = (appointments || []).filter(
            (apt) => apt.professional_uuid === prof.id
          );
          const total = profAppointments.reduce((sum, apt) => sum + apt.amount_cents, 0);
          monthData[prof.id] = total / 100; // Convert to reais
        });

        chartData.push(monthData);
      }

      setMonthlyChartData(chartData);
    } catch (error) {
      console.error('Error fetching monthly evolution:', error);
    }
  };

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(cents / 100);
  };

  // Generate last 12 months for selection
  const monthOptions = Array.from({ length: 12 }, (_, i) => {
    const date = subMonths(new Date(), i);
    return {
      value: format(date, 'yyyy-MM'),
      label: format(date, 'MMMM yyyy', { locale: ptBR }),
    };
  });

  const totalRevenue = earnings.reduce((sum, e) => sum + e.totalEarnings, 0);
  const totalAppointments = earnings.reduce((sum, e) => sum + e.appointmentCount, 0);

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">Financeiro por Funcionário</h1>
            <p className="text-clinic-text-secondary">
              Acompanhe os ganhos de cada profissional
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-clinic-text-muted" />
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {monthOptions.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-green-500/10">
                  <DollarSign className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-clinic-text-secondary">Receita Total</p>
                  <p className="text-2xl font-bold">{formatCurrency(totalRevenue)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-blue-500/10">
                  <Calendar className="h-6 w-6 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-clinic-text-secondary">Consultas Realizadas</p>
                  <p className="text-2xl font-bold">{totalAppointments}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-purple-500/10">
                  <Users className="h-6 w-6 text-purple-500" />
                </div>
                <div>
                  <p className="text-sm text-clinic-text-secondary">Profissionais Ativos</p>
                  <p className="text-2xl font-bold">{professionals.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Monthly Evolution Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Evolução Mensal de Ganhos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {professionals.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum profissional encontrado
              </div>
            ) : (
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="month" 
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                    />
                    <YAxis 
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                      tickFormatter={(value) => `R$ ${value.toLocaleString('pt-BR')}`}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'hsl(var(--background))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                      formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, '']}
                    />
                    <Legend />
                    {professionals.map((prof, index) => (
                      <Line
                        key={prof.id}
                        type="monotone"
                        dataKey={prof.id}
                        name={prof.name}
                        stroke={CHART_COLORS[index % CHART_COLORS.length]}
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Professionals Earnings Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Ganhos por Profissional
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-clinic-text-secondary">
                Carregando...
              </div>
            ) : earnings.length === 0 ? (
              <div className="text-center py-8 text-clinic-text-secondary">
                Nenhum profissional encontrado
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-clinic-border-subtle">
                      <th className="text-left py-3 px-4 text-sm font-medium text-clinic-text-secondary">
                        Profissional
                      </th>
                      <th className="text-left py-3 px-4 text-sm font-medium text-clinic-text-secondary">
                        Especialidade
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-clinic-text-secondary">
                        Consultas
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-clinic-text-secondary">
                        Ticket Médio
                      </th>
                      <th className="text-right py-3 px-4 text-sm font-medium text-clinic-text-secondary">
                        Total Ganho
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {earnings.map((item, index) => (
                      <tr
                        key={item.professional.id}
                        className="border-b border-clinic-border-subtle last:border-0 hover:bg-clinic-surface/50 transition-colors"
                      >
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              {index < 3 && (
                                <div className={`absolute -top-1 -left-1 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                                  index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : 'bg-amber-600'
                                }`}>
                                  {index + 1}
                                </div>
                              )}
                              {item.professional.avatar_url ? (
                                <img
                                  src={item.professional.avatar_url}
                                  alt={item.professional.name}
                                  className="w-10 h-10 rounded-full object-cover"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-clinic-primary/10 flex items-center justify-center text-clinic-primary font-medium">
                                  {item.professional.name.charAt(0)}
                                </div>
                              )}
                            </div>
                            <span className="font-medium">{item.professional.name}</span>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-clinic-text-secondary">
                          {item.professional.specialty_id}
                        </td>
                        <td className="py-4 px-4 text-right">
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-blue-500/10 text-blue-500 text-sm">
                            {item.appointmentCount}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-right text-clinic-text-secondary">
                          {formatCurrency(item.averageTicket)}
                        </td>
                        <td className="py-4 px-4 text-right">
                          <span className={`font-semibold ${item.totalEarnings > 0 ? 'text-green-500' : 'text-clinic-text-muted'}`}>
                            {formatCurrency(item.totalEarnings)}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
