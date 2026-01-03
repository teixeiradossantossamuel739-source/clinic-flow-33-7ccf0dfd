import { useState, useEffect, useMemo } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Calendar as CalendarIcon,
  Users,
  DollarSign,
  TrendingUp,
  Download,
  FileText,
  Clock,
  Building2,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import * as XLSX from 'xlsx';

interface Professional {
  id: string;
  name: string;
  specialty_id: string;
  profession: string;
  payment_type: string;
  payment_percentage: number | null;
  fixed_room_value_cents: number | null;
  room_id: string | null;
}

interface Room {
  id: string;
  name: string;
  rental_value_cents: number;
}

interface Appointment {
  id: string;
  professional_uuid: string | null;
  appointment_date: string;
  amount_cents: number;
  payment_status: string;
  status: string;
}

interface Payment {
  id: string;
  professional_id: string;
  month: number;
  year: number;
  amount_due_cents: number;
  amount_paid_cents: number;
  status: string;
}

interface Schedule {
  professional_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
}

const MONTHS = [
  { value: 1, label: 'Janeiro' },
  { value: 2, label: 'Fevereiro' },
  { value: 3, label: 'Março' },
  { value: 4, label: 'Abril' },
  { value: 5, label: 'Maio' },
  { value: 6, label: 'Junho' },
  { value: 7, label: 'Julho' },
  { value: 8, label: 'Agosto' },
  { value: 9, label: 'Setembro' },
  { value: 10, label: 'Outubro' },
  { value: 11, label: 'Novembro' },
  { value: 12, label: 'Dezembro' },
];

const DAYS_OF_WEEK = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

const CHART_COLORS = ['hsl(197, 55%, 60%)', 'hsl(152, 60%, 45%)', 'hsl(45, 90%, 55%)', 'hsl(0, 70%, 60%)', 'hsl(280, 60%, 60%)'];

export default function AdminReports() {
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);

  const currentDate = new Date();
  const [filterMode, setFilterMode] = useState<'month' | 'custom'>('month');
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>(startOfMonth(currentDate));
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>(currentDate);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedProfessional, setSelectedProfessional] = useState<string>('all');

  useEffect(() => {
    fetchData();
  }, [filterMode, selectedMonth, selectedYear, customStartDate, customEndDate]);

  const getDateRange = () => {
    if (filterMode === 'month') {
      const startDate = new Date(selectedYear, selectedMonth - 1, 1);
      const endDate = endOfMonth(startDate);
      return { startDate, endDate };
    } else {
      return {
        startDate: customStartDate || startOfMonth(currentDate),
        endDate: customEndDate || currentDate,
      };
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const { startDate, endDate } = getDateRange();
      const startStr = format(startDate, 'yyyy-MM-dd');
      const endStr = format(endDate, 'yyyy-MM-dd');

      // Fetch all data in parallel
      const [profResult, roomsResult, apptsResult, paymentsResult, schedulesResult] = await Promise.all([
        supabase.from('professionals').select('*').eq('is_active', true),
        supabase.from('clinic_rooms').select('*').eq('is_active', true),
        supabase.from('appointments').select('*').gte('appointment_date', startStr).lte('appointment_date', endStr),
        supabase.from('professional_payments').select('*').eq('month', selectedMonth).eq('year', selectedYear),
        supabase.from('professional_schedules').select('*').eq('is_active', true),
      ]);

      if (profResult.error) throw profResult.error;
      if (roomsResult.error) throw roomsResult.error;
      if (apptsResult.error) throw apptsResult.error;
      if (paymentsResult.error) throw paymentsResult.error;
      if (schedulesResult.error) throw schedulesResult.error;

      setProfessionals(profResult.data || []);
      setRooms(roomsResult.data || []);
      setAppointments(apptsResult.data || []);
      setPayments(paymentsResult.data || []);
      setSchedules(schedulesResult.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  // Calculate report data for each professional
  const reportData = useMemo(() => {
    return professionals.map(prof => {
      const profAppointments = appointments.filter(a => a.professional_uuid === prof.id);
      const profPayment = payments.find(p => p.professional_id === prof.id);
      const profSchedules = schedules.filter(s => s.professional_id === prof.id);
      const profRoom = rooms.find(r => r.id === prof.room_id);

      const totalRevenue = profAppointments.reduce((sum, a) => sum + a.amount_cents, 0);
      const paidRevenue = profAppointments.filter(a => a.payment_status === 'paid').reduce((sum, a) => sum + a.amount_cents, 0);
      const appointmentCount = profAppointments.length;

      // Calculate what professional owes clinic or vice-versa
      let owesToClinic = 0;
      let clinicOwes = 0;
      
      if (prof.payment_type === 'percentage') {
        // Clinic takes percentage of revenue
        owesToClinic = Math.round(paidRevenue * ((prof.payment_percentage || 50) / 100));
        clinicOwes = paidRevenue - owesToClinic;
      } else {
        // Fixed room value
        owesToClinic = prof.fixed_room_value_cents || (profRoom?.rental_value_cents || 0);
        clinicOwes = paidRevenue - owesToClinic;
      }

      // Format schedules
      const scheduleText = profSchedules.map(s => 
        `${DAYS_OF_WEEK[s.day_of_week]}: ${s.start_time.slice(0, 5)} - ${s.end_time.slice(0, 5)}`
      ).join(', ') || 'Não configurado';

      return {
        id: prof.id,
        name: prof.name,
        specialty: prof.specialty_id,
        profession: prof.profession,
        room: profRoom?.name || '-',
        paymentType: prof.payment_type === 'percentage' ? 'Percentual' : 'Sala Fixa',
        paymentDetail: prof.payment_type === 'percentage' 
          ? `${prof.payment_percentage || 50}%`
          : formatCurrency(prof.fixed_room_value_cents || profRoom?.rental_value_cents || 0),
        schedule: scheduleText,
        appointmentCount,
        totalRevenue,
        paidRevenue,
        owesToClinic,
        clinicOwes: clinicOwes > 0 ? clinicOwes : 0,
        paymentStatus: profPayment?.status || 'pending',
        amountPaid: profPayment?.amount_paid_cents || 0,
      };
    });
  }, [professionals, appointments, payments, schedules, rooms]);

  // Filtered report data
  const filteredReportData = useMemo(() => {
    let data = reportData;
    
    if (statusFilter !== 'all') {
      data = data.filter(d => d.paymentStatus === statusFilter);
    }
    
    if (selectedProfessional !== 'all') {
      data = data.filter(d => d.id === selectedProfessional);
    }
    
    return data;
  }, [reportData, statusFilter, selectedProfessional]);

  // Summary stats
  const stats = useMemo(() => {
    const totalClinicRevenue = filteredReportData.reduce((sum, d) => sum + d.paidRevenue, 0);
    const totalReceived = filteredReportData.reduce((sum, d) => sum + d.amountPaid, 0);
    const totalPending = filteredReportData.filter(d => d.paymentStatus === 'pending').reduce((sum, d) => sum + d.owesToClinic, 0);
    const totalPaid = filteredReportData.filter(d => d.paymentStatus === 'paid').reduce((sum, d) => sum + d.amountPaid, 0);
    const totalAppointments = filteredReportData.reduce((sum, d) => sum + d.appointmentCount, 0);

    return { totalClinicRevenue, totalReceived, totalPending, totalPaid, totalAppointments };
  }, [filteredReportData]);

  // Specialty distribution chart data
  const specialtyChartData = useMemo(() => {
    const specialtyMap = new Map<string, number>();
    filteredReportData.forEach(d => {
      const current = specialtyMap.get(d.specialty) || 0;
      specialtyMap.set(d.specialty, current + d.paidRevenue);
    });
    return Array.from(specialtyMap.entries()).map(([name, value], index) => ({
      name,
      value: value / 100,
      color: CHART_COLORS[index % CHART_COLORS.length],
    }));
  }, [filteredReportData]);

  const formatCurrency = (cents: number) => {
    return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const getPeriodLabel = () => {
    if (filterMode === 'month') {
      return `${MONTHS.find(m => m.value === selectedMonth)?.label} ${selectedYear}`;
    } else {
      const start = customStartDate ? format(customStartDate, 'dd/MM/yyyy') : '';
      const end = customEndDate ? format(customEndDate, 'dd/MM/yyyy') : '';
      return `${start} - ${end}`;
    }
  };

  const handleExportExcel = () => {
    const worksheetData = filteredReportData.map(d => ({
      'Funcionário': d.name,
      'Cargo/Especialidade': `${d.profession} - ${d.specialty}`,
      'Sala': d.room,
      'Tipo Pagamento': d.paymentType,
      'Valor/Percentual': d.paymentDetail,
      'Horários': d.schedule,
      'Atendimentos': d.appointmentCount,
      'Faturamento Total (R$)': (d.totalRevenue / 100).toFixed(2),
      'Faturamento Pago (R$)': (d.paidRevenue / 100).toFixed(2),
      'Deve à Clínica (R$)': (d.owesToClinic / 100).toFixed(2),
      'Clínica Deve (R$)': (d.clinicOwes / 100).toFixed(2),
      'Status': d.paymentStatus === 'paid' ? 'Pago' : d.paymentStatus === 'pending' ? 'Pendente' : 'Próximo Mês',
    }));

    // Add summary
    const summaryData = [
      {},
      { 'Funcionário': 'RESUMO FINANCEIRO' },
      { 'Funcionário': 'Total Faturado Clínica', 'Cargo/Especialidade': formatCurrency(stats.totalClinicRevenue) },
      { 'Funcionário': 'Total Recebido', 'Cargo/Especialidade': formatCurrency(stats.totalReceived) },
      { 'Funcionário': 'Total Pendente', 'Cargo/Especialidade': formatCurrency(stats.totalPending) },
      { 'Funcionário': 'Total Pago', 'Cargo/Especialidade': formatCurrency(stats.totalPaid) },
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet([...worksheetData, ...summaryData]);
    XLSX.utils.book_append_sheet(wb, ws, 'Relatório');
    
    const filename = `relatorio_${getPeriodLabel().replace(/\//g, '-').replace(/ /g, '_')}.xlsx`;
    XLSX.writeFile(wb, filename);
    toast.success('Relatório Excel exportado com sucesso!');
  };

  const handleExportPDF = () => {
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Relatório Funcionários - ${getPeriodLabel()}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; font-size: 12px; }
          h1 { color: #333; font-size: 18px; margin-bottom: 5px; }
          h2 { color: #666; font-size: 14px; margin-top: 20px; }
          .period { color: #666; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin: 15px 0; font-size: 11px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f5f5f5; font-weight: bold; }
          .summary-box { background: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0; }
          .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; }
          .summary-item { text-align: center; }
          .summary-value { font-size: 18px; font-weight: bold; color: #333; }
          .summary-label { font-size: 11px; color: #666; }
          .status-paid { color: green; }
          .status-pending { color: orange; }
          .status-next { color: blue; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <h1>Relatório de Funcionários</h1>
        <p class="period">Período: ${getPeriodLabel()}</p>

        <div class="summary-box">
          <h2>Resumo Financeiro</h2>
          <div class="summary-grid">
            <div class="summary-item">
              <div class="summary-value">${formatCurrency(stats.totalClinicRevenue)}</div>
              <div class="summary-label">Total Faturado</div>
            </div>
            <div class="summary-item">
              <div class="summary-value">${formatCurrency(stats.totalReceived)}</div>
              <div class="summary-label">Total Recebido</div>
            </div>
            <div class="summary-item">
              <div class="summary-value">${formatCurrency(stats.totalPending)}</div>
              <div class="summary-label">Total Pendente</div>
            </div>
            <div class="summary-item">
              <div class="summary-value">${formatCurrency(stats.totalPaid)}</div>
              <div class="summary-label">Total Pago</div>
            </div>
          </div>
        </div>

        <h2>Detalhamento por Funcionário</h2>
        <table>
          <thead>
            <tr>
              <th>Funcionário</th>
              <th>Cargo/Especialidade</th>
              <th>Sala</th>
              <th>Tipo Pgto</th>
              <th>Horários</th>
              <th>Atend.</th>
              <th>Faturado</th>
              <th>Deve à Clínica</th>
              <th>Clínica Deve</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${filteredReportData.map(d => `
              <tr>
                <td>${d.name}</td>
                <td>${d.profession} - ${d.specialty}</td>
                <td>${d.room}</td>
                <td>${d.paymentType} (${d.paymentDetail})</td>
                <td style="font-size: 10px;">${d.schedule}</td>
                <td>${d.appointmentCount}</td>
                <td>${formatCurrency(d.paidRevenue)}</td>
                <td>${formatCurrency(d.owesToClinic)}</td>
                <td>${formatCurrency(d.clinicOwes)}</td>
                <td class="status-${d.paymentStatus === 'paid' ? 'paid' : d.paymentStatus === 'pending' ? 'pending' : 'next'}">
                  ${d.paymentStatus === 'paid' ? 'Pago' : d.paymentStatus === 'pending' ? 'Pendente' : 'Próx. Mês'}
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <p style="margin-top: 30px; font-size: 10px; color: #999;">
          Gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
        </p>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.print();
    }
    toast.success('PDF pronto para impressão!');
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Relatórios</h1>
            <p className="text-muted-foreground">
              Relatório completo de funcionários e financeiro
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExportPDF}>
              <FileText className="h-4 w-4 mr-2" />
              PDF
            </Button>
            <Button onClick={handleExportExcel}>
              <Download className="h-4 w-4 mr-2" />
              Excel
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card className="p-4">
          <div className="flex flex-wrap gap-4">
            <Select value={filterMode} onValueChange={(v) => setFilterMode(v as 'month' | 'custom')}>
              <SelectTrigger className="w-[130px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="month">Por Mês</SelectItem>
                <SelectItem value="custom">Período</SelectItem>
              </SelectContent>
            </Select>

            {filterMode === 'month' ? (
              <>
                <Select value={String(selectedMonth)} onValueChange={(v) => setSelectedMonth(Number(v))}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Mês" />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map(m => (
                      <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
                  <SelectTrigger className="w-[100px]">
                    <SelectValue placeholder="Ano" />
                  </SelectTrigger>
                  <SelectContent>
                    {[2024, 2025, 2026].map(y => (
                      <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </>
            ) : (
              <>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-[150px] justify-start text-left font-normal", !customStartDate && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {customStartDate ? format(customStartDate, 'dd/MM/yyyy') : 'Data inicial'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={customStartDate} onSelect={setCustomStartDate} locale={ptBR} className="pointer-events-auto" />
                  </PopoverContent>
                </Popover>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-[150px] justify-start text-left font-normal", !customEndDate && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {customEndDate ? format(customEndDate, 'dd/MM/yyyy') : 'Data final'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={customEndDate} onSelect={setCustomEndDate} locale={ptBR} className="pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </>
            )}

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="paid">Pago</SelectItem>
                <SelectItem value="next_month">Próximo Mês</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedProfessional} onValueChange={setSelectedProfessional}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Funcionário" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {professionals.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </Card>

        {/* Summary Stats */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-lg font-bold">{formatCurrency(stats.totalClinicRevenue)}</p>
                <p className="text-xs text-muted-foreground">Total Faturado</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-green-100 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-lg font-bold">{formatCurrency(stats.totalReceived)}</p>
                <p className="text-xs text-muted-foreground">Total Recebido</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-yellow-100 flex items-center justify-center">
                <Clock className="h-5 w-5 text-yellow-600" />
              </div>
              <div>
                <p className="text-lg font-bold">{formatCurrency(stats.totalPending)}</p>
                <p className="text-xs text-muted-foreground">Total Pendente</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-blue-100 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-lg font-bold">{formatCurrency(stats.totalPaid)}</p>
                <p className="text-xs text-muted-foreground">Total Pago</p>
              </div>
            </div>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-purple-100 flex items-center justify-center">
                <Users className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-lg font-bold">{stats.totalAppointments}</p>
                <p className="text-xs text-muted-foreground">Atendimentos</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Specialty Distribution */}
          <Card className="p-6">
            <h3 className="font-semibold mb-4">Faturamento por Especialidade</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={specialtyChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`}
                  >
                    {specialtyChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value * 100)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </Card>

          {/* Revenue by Professional */}
          <Card className="p-6">
            <h3 className="font-semibold mb-4">Faturamento por Funcionário</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={filteredReportData.slice(0, 10)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tickFormatter={(v) => `R$ ${(v / 100).toFixed(0)}`} />
                  <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Bar dataKey="paidRevenue" fill="hsl(197, 55%, 60%)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>

        {/* Professionals Table */}
        <Card>
          <div className="p-4 border-b">
            <h3 className="font-semibold">Detalhamento por Funcionário</h3>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Funcionário</TableHead>
                  <TableHead>Cargo/Especialidade</TableHead>
                  <TableHead>Sala</TableHead>
                  <TableHead>Tipo Pagamento</TableHead>
                  <TableHead>Atend.</TableHead>
                  <TableHead>Faturado</TableHead>
                  <TableHead>Deve à Clínica</TableHead>
                  <TableHead>Clínica Deve</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8">Carregando...</TableCell>
                  </TableRow>
                ) : filteredReportData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                      Nenhum funcionário encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredReportData.map(d => (
                    <TableRow key={d.id}>
                      <TableCell className="font-medium">{d.name}</TableCell>
                      <TableCell>{d.profession} - {d.specialty}</TableCell>
                      <TableCell>{d.room}</TableCell>
                      <TableCell>{d.paymentType} ({d.paymentDetail})</TableCell>
                      <TableCell>{d.appointmentCount}</TableCell>
                      <TableCell>{formatCurrency(d.paidRevenue)}</TableCell>
                      <TableCell className="text-red-600">{formatCurrency(d.owesToClinic)}</TableCell>
                      <TableCell className="text-green-600">{formatCurrency(d.clinicOwes)}</TableCell>
                      <TableCell>
                        <span className={cn(
                          'px-2 py-1 rounded-full text-xs',
                          d.paymentStatus === 'paid' ? 'bg-green-100 text-green-700' :
                          d.paymentStatus === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-blue-100 text-blue-700'
                        )}>
                          {d.paymentStatus === 'paid' ? 'Pago' : d.paymentStatus === 'pending' ? 'Pendente' : 'Próx. Mês'}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>
    </AdminLayout>
  );
}
