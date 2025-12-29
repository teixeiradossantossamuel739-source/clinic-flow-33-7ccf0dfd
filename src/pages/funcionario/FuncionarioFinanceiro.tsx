import { useEffect, useState, useMemo, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { FuncionarioLayout } from '@/components/layout/FuncionarioLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  DollarSign, 
  TrendingUp, 
  Calendar,
  ArrowUpRight,
  ArrowDownRight,
  FileText,
  Download,
  Users,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, subMonths, getYear, getMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { parseLocalDate } from '@/lib/dateUtils';
import { toast } from 'sonner';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';

interface Appointment {
  id: string;
  patient_name: string;
  patient_email: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  payment_status: string;
  amount_cents: number;
}

interface Professional {
  id: string;
  name: string;
  specialty_id: string;
}

const MONTHS = [
  { value: '0', label: 'Janeiro' },
  { value: '1', label: 'Fevereiro' },
  { value: '2', label: 'Março' },
  { value: '3', label: 'Abril' },
  { value: '4', label: 'Maio' },
  { value: '5', label: 'Junho' },
  { value: '6', label: 'Julho' },
  { value: '7', label: 'Agosto' },
  { value: '8', label: 'Setembro' },
  { value: '9', label: 'Outubro' },
  { value: '10', label: 'Novembro' },
  { value: '11', label: 'Dezembro' },
];

const STATUS_COLORS = {
  paid: '#22c55e',
  pending: '#eab308',
  cancelled: '#ef4444',
};

const CHART_COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899'];

export default function FuncionarioFinanceiro() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [professional, setProfessional] = useState<Professional | null>(null);
  const [loading, setLoading] = useState(true);
  const reportRef = useRef<HTMLDivElement>(null);
  
  // Filters
  const now = new Date();
  const [selectedMonth, setSelectedMonth] = useState(String(getMonth(now)));
  const [selectedYear, setSelectedYear] = useState(String(getYear(now)));

  const years = useMemo(() => {
    const currentYear = getYear(now);
    return Array.from({ length: 5 }, (_, i) => String(currentYear - i));
  }, []);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      const { data: profData } = await supabase
        .from('professionals')
        .select('id, name, specialty_id')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (profData) {
        setProfessional(profData);
        
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

  // Filter appointments by selected month/year
  const filteredAppointments = useMemo(() => {
    const monthStart = startOfMonth(new Date(parseInt(selectedYear), parseInt(selectedMonth)));
    const monthEnd = endOfMonth(monthStart);

    return appointments.filter(apt => {
      const date = parseLocalDate(apt.appointment_date);
      return date >= monthStart && date <= monthEnd;
    });
  }, [appointments, selectedMonth, selectedYear]);

  // Statistics
  const stats = useMemo(() => {
    const paidApts = filteredAppointments.filter(apt => apt.payment_status === 'paid');
    const pendingApts = filteredAppointments.filter(apt => apt.payment_status === 'pending');
    const cancelledApts = filteredAppointments.filter(apt => apt.status === 'cancelled');
    const completedApts = filteredAppointments.filter(apt => apt.status === 'completed');

    const paidRevenue = paidApts.reduce((sum, apt) => sum + apt.amount_cents, 0);
    const pendingRevenue = pendingApts.reduce((sum, apt) => sum + apt.amount_cents, 0);
    const totalPotential = filteredAppointments.reduce((sum, apt) => sum + apt.amount_cents, 0);

    // Unique patients
    const uniquePatients = new Set(filteredAppointments.map(apt => apt.patient_email)).size;

    // Average ticket
    const avgTicket = paidApts.length > 0 ? paidRevenue / paidApts.length : 0;

    // Previous month comparison
    const prevMonthStart = startOfMonth(subMonths(new Date(parseInt(selectedYear), parseInt(selectedMonth)), 1));
    const prevMonthEnd = endOfMonth(prevMonthStart);
    const prevMonthRevenue = appointments
      .filter(apt => {
        const date = parseLocalDate(apt.appointment_date);
        return apt.payment_status === 'paid' && date >= prevMonthStart && date <= prevMonthEnd;
      })
      .reduce((sum, apt) => sum + apt.amount_cents, 0);

    const growth = prevMonthRevenue > 0 
      ? ((paidRevenue - prevMonthRevenue) / prevMonthRevenue) * 100 
      : 0;

    return {
      paidRevenue,
      pendingRevenue,
      totalPotential,
      paidCount: paidApts.length,
      pendingCount: pendingApts.length,
      cancelledCount: cancelledApts.length,
      completedCount: completedApts.length,
      totalCount: filteredAppointments.length,
      uniquePatients,
      avgTicket,
      growth,
      conversionRate: filteredAppointments.length > 0 
        ? (paidApts.length / filteredAppointments.length) * 100 
        : 0,
    };
  }, [filteredAppointments, appointments, selectedMonth, selectedYear]);

  // Daily revenue chart data
  const dailyChartData = useMemo(() => {
    const monthStart = startOfMonth(new Date(parseInt(selectedYear), parseInt(selectedMonth)));
    const monthEnd = endOfMonth(monthStart);
    const days: { day: string; receita: number; consultas: number }[] = [];

    let currentDate = monthStart;
    while (currentDate <= monthEnd) {
      const dayStr = format(currentDate, 'yyyy-MM-dd');
      const dayApts = filteredAppointments.filter(
        apt => apt.appointment_date === dayStr && apt.payment_status === 'paid'
      );
      
      days.push({
        day: format(currentDate, 'dd'),
        receita: dayApts.reduce((sum, apt) => sum + apt.amount_cents / 100, 0),
        consultas: dayApts.length,
      });

      currentDate = new Date(currentDate.getTime() + 24 * 60 * 60 * 1000);
    }

    return days;
  }, [filteredAppointments, selectedMonth, selectedYear]);

  // Payment status pie chart
  const paymentPieData = useMemo(() => [
    { name: 'Pago', value: stats.paidCount, color: STATUS_COLORS.paid },
    { name: 'Pendente', value: stats.pendingCount, color: STATUS_COLORS.pending },
    { name: 'Cancelado', value: stats.cancelledCount, color: STATUS_COLORS.cancelled },
  ].filter(item => item.value > 0), [stats]);

  // Top patients
  const topPatients = useMemo(() => {
    const patientMap = new Map<string, { name: string; total: number; count: number }>();
    
    filteredAppointments
      .filter(apt => apt.payment_status === 'paid')
      .forEach(apt => {
        const existing = patientMap.get(apt.patient_email) || { name: apt.patient_name, total: 0, count: 0 };
        patientMap.set(apt.patient_email, {
          name: apt.patient_name,
          total: existing.total + apt.amount_cents,
          count: existing.count + 1,
        });
      });

    return Array.from(patientMap.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
  }, [filteredAppointments]);

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(cents / 100);
  };

  const handleExportPDF = () => {
    // Create a printable version
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Relatório Financeiro - ${MONTHS[parseInt(selectedMonth)].label} ${selectedYear}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; color: #333; }
          h1 { color: #1a1a1a; border-bottom: 2px solid #3b82f6; padding-bottom: 10px; }
          h2 { color: #374151; margin-top: 30px; }
          .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; }
          .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin: 20px 0; }
          .stat-card { background: #f9fafb; padding: 20px; border-radius: 8px; border: 1px solid #e5e7eb; }
          .stat-value { font-size: 24px; font-weight: bold; color: #1a1a1a; }
          .stat-label { font-size: 14px; color: #6b7280; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
          th { background: #f3f4f6; font-weight: 600; }
          .text-green { color: #22c55e; }
          .text-red { color: #ef4444; }
          .footer { margin-top: 40px; text-align: center; color: #9ca3af; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1>Relatório Financeiro Mensal</h1>
            <p><strong>Profissional:</strong> ${professional?.name || 'N/A'}</p>
            <p><strong>Período:</strong> ${MONTHS[parseInt(selectedMonth)].label} de ${selectedYear}</p>
          </div>
          <div style="text-align: right;">
            <p><strong>Gerado em:</strong> ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</p>
          </div>
        </div>

        <h2>Resumo Financeiro</h2>
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-label">Receita Confirmada</div>
            <div class="stat-value text-green">${formatCurrency(stats.paidRevenue)}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Receita Pendente</div>
            <div class="stat-value">${formatCurrency(stats.pendingRevenue)}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Ticket Médio</div>
            <div class="stat-value">${formatCurrency(stats.avgTicket)}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Taxa de Conversão</div>
            <div class="stat-value">${stats.conversionRate.toFixed(1)}%</div>
          </div>
        </div>

        <h2>Resumo de Consultas</h2>
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-label">Total de Consultas</div>
            <div class="stat-value">${stats.totalCount}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Consultas Pagas</div>
            <div class="stat-value text-green">${stats.paidCount}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Consultas Canceladas</div>
            <div class="stat-value text-red">${stats.cancelledCount}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Pacientes Únicos</div>
            <div class="stat-value">${stats.uniquePatients}</div>
          </div>
        </div>

        <h2>Top 5 Pacientes</h2>
        <table>
          <thead>
            <tr>
              <th>Paciente</th>
              <th>Consultas</th>
              <th>Total Gasto</th>
            </tr>
          </thead>
          <tbody>
            ${topPatients.map(p => `
              <tr>
                <td>${p.name}</td>
                <td>${p.count}</td>
                <td class="text-green">${formatCurrency(p.total)}</td>
              </tr>
            `).join('')}
            ${topPatients.length === 0 ? '<tr><td colspan="3" style="text-align:center;color:#9ca3af;">Nenhum pagamento no período</td></tr>' : ''}
          </tbody>
        </table>

        <h2>Detalhamento de Consultas</h2>
        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th>Paciente</th>
              <th>Status</th>
              <th>Valor</th>
            </tr>
          </thead>
          <tbody>
            ${filteredAppointments.slice(0, 50).map(apt => `
              <tr>
                <td>${format(parseLocalDate(apt.appointment_date), 'dd/MM/yyyy', { locale: ptBR })} ${apt.appointment_time.slice(0, 5)}</td>
                <td>${apt.patient_name}</td>
                <td>${apt.payment_status === 'paid' ? '✓ Pago' : apt.status === 'cancelled' ? '✗ Cancelado' : '○ Pendente'}</td>
                <td>${formatCurrency(apt.amount_cents)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="footer">
          <p>Este relatório foi gerado automaticamente pelo sistema.</p>
        </div>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 500);
    }

    toast.success('Relatório pronto para impressão/PDF');
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
      <div className="space-y-6" ref={reportRef}>
        {/* Header with Filters */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Relatório Financeiro</h2>
            <p className="text-muted-foreground">
              {MONTHS[parseInt(selectedMonth)].label} de {selectedYear}
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Mês" />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map(month => (
                  <SelectItem key={month.value} value={month.value}>
                    {month.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-[100px]">
                <SelectValue placeholder="Ano" />
              </SelectTrigger>
              <SelectContent>
                {years.map(year => (
                  <SelectItem key={year} value={year}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button onClick={handleExportPDF} className="gap-2">
              <Download className="h-4 w-4" />
              Exportar PDF
            </Button>
          </div>
        </div>

        {/* Main Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-l-4 border-l-green-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Receita Confirmada</p>
                  <p className="text-2xl font-bold text-green-600">{formatCurrency(stats.paidRevenue)}</p>
                  <div className="flex items-center gap-1 mt-1">
                    {stats.growth >= 0 ? (
                      <ArrowUpRight className="h-4 w-4 text-green-500" />
                    ) : (
                      <ArrowDownRight className="h-4 w-4 text-red-500" />
                    )}
                    <span className={`text-sm ${stats.growth >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                      {Math.abs(stats.growth).toFixed(1)}%
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

          <Card className="border-l-4 border-l-yellow-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Receita Pendente</p>
                  <p className="text-2xl font-bold text-yellow-600">{formatCurrency(stats.pendingRevenue)}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {stats.pendingCount} consultas aguardando
                  </p>
                </div>
                <div className="h-12 w-12 rounded-full bg-yellow-500/10 flex items-center justify-center">
                  <Clock className="h-6 w-6 text-yellow-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-blue-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Ticket Médio</p>
                  <p className="text-2xl font-bold">{formatCurrency(stats.avgTicket)}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Por consulta paga
                  </p>
                </div>
                <div className="h-12 w-12 rounded-full bg-blue-500/10 flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-blue-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-l-4 border-l-purple-500">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Pacientes Únicos</p>
                  <p className="text-2xl font-bold">{stats.uniquePatients}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    No período selecionado
                  </p>
                </div>
                <div className="h-12 w-12 rounded-full bg-purple-500/10 flex items-center justify-center">
                  <Users className="h-6 w-6 text-purple-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Secondary Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-foreground">{stats.totalCount}</p>
              <p className="text-sm text-muted-foreground">Total Consultas</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-green-600">{stats.paidCount}</p>
              <p className="text-sm text-muted-foreground">Consultas Pagas</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-red-600">{stats.cancelledCount}</p>
              <p className="text-sm text-muted-foreground">Canceladas</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-3xl font-bold text-primary">{stats.conversionRate.toFixed(0)}%</p>
              <p className="text-sm text-muted-foreground">Taxa Conversão</p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Daily Revenue Chart */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Receita Diária
              </CardTitle>
              <CardDescription>Evolução da receita ao longo do mês</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dailyChartData}>
                    <defs>
                      <linearGradient id="colorReceita" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="day" className="text-xs" />
                    <YAxis 
                      className="text-xs" 
                      tickFormatter={(value) => `R$${value}`}
                    />
                    <Tooltip 
                      formatter={(value: number, name: string) => [
                        name === 'receita' ? formatCurrency(value * 100) : value,
                        name === 'receita' ? 'Receita' : 'Consultas'
                      ]}
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

          {/* Payment Status Pie */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Status das Consultas
              </CardTitle>
              <CardDescription>Distribuição por status de pagamento</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-72">
                {paymentPieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={paymentPieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {paymentPieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value: number) => [`${value} consultas`, 'Quantidade']}
                        contentStyle={{ 
                          backgroundColor: 'hsl(var(--card))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px'
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-muted-foreground">
                    Sem dados no período
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Top Patients */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Top 5 Pacientes do Mês
            </CardTitle>
            <CardDescription>Pacientes que mais geraram receita</CardDescription>
          </CardHeader>
          <CardContent>
            {topPatients.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nenhum pagamento registrado no período
              </p>
            ) : (
              <div className="space-y-4">
                {topPatients.map((patient, idx) => (
                  <div 
                    key={idx}
                    className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div 
                        className="h-10 w-10 rounded-full flex items-center justify-center font-bold text-white"
                        style={{ backgroundColor: CHART_COLORS[idx] }}
                      >
                        {idx + 1}
                      </div>
                      <div>
                        <p className="font-medium">{patient.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {patient.count} {patient.count === 1 ? 'consulta' : 'consultas'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-green-600">{formatCurrency(patient.total)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Payments Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Consultas do Período
            </CardTitle>
            <CardDescription>Detalhamento das consultas no mês selecionado</CardDescription>
          </CardHeader>
          <CardContent>
            {filteredAppointments.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                Nenhuma consulta no período selecionado
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Data/Hora</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Paciente</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
                      <th className="text-right py-3 px-4 font-medium text-muted-foreground">Valor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAppointments.slice(0, 20).map((apt) => (
                      <tr key={apt.id} className="border-b hover:bg-muted/30">
                        <td className="py-3 px-4">
                          {format(parseLocalDate(apt.appointment_date), 'dd/MM/yyyy', { locale: ptBR })} às {apt.appointment_time.slice(0, 5)}
                        </td>
                        <td className="py-3 px-4 font-medium">{apt.patient_name}</td>
                        <td className="py-3 px-4">
                          {apt.payment_status === 'paid' ? (
                            <Badge className="bg-green-500/10 text-green-600 border-green-500/20 gap-1">
                              <CheckCircle className="h-3 w-3" /> Pago
                            </Badge>
                          ) : apt.status === 'cancelled' ? (
                            <Badge variant="destructive" className="gap-1">
                              <XCircle className="h-3 w-3" /> Cancelado
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="gap-1">
                              <Clock className="h-3 w-3" /> Pendente
                            </Badge>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-semibold">
                          {formatCurrency(apt.amount_cents)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredAppointments.length > 20 && (
                  <p className="text-center text-muted-foreground py-4 text-sm">
                    Mostrando 20 de {filteredAppointments.length} consultas. Exporte o PDF para ver todas.
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </FuncionarioLayout>
  );
}
