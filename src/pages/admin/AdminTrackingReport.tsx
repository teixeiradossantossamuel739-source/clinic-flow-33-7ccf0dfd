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
import { Badge } from '@/components/ui/badge';
import {
  Calendar as CalendarIcon,
  Users,
  FileText,
  Download,
  Activity,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  Stethoscope,
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
  LineChart,
  Line,
} from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays, parseISO, eachDayOfInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import * as XLSX from 'xlsx';

interface Professional {
  id: string;
  name: string;
  specialty_id: string;
  profession: string;
}

interface Appointment {
  id: string;
  professional_uuid: string | null;
  professional_id: string;
  appointment_date: string;
  appointment_time: string;
  amount_cents: number;
  payment_status: string;
  status: string;
  patient_name: string;
  service_id: string | null;
}

interface MedicalRecord {
  id: string;
  patient_id: string;
  professional_id: string;
  record_type: string;
  record_date: string;
  procedure_performed: string | null;
  diagnosis: string | null;
}

interface Service {
  id: string;
  name: string;
  specialty_id: string;
}

type PeriodFilter = 'day' | 'week' | 'month' | 'custom';

const CHART_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendente',
  confirmed: 'Confirmado',
  completed: 'Concluído',
  cancelled: 'Cancelado',
  no_show: 'Não compareceu',
};

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-500/20 text-yellow-700 border-yellow-500/30',
  confirmed: 'bg-blue-500/20 text-blue-700 border-blue-500/30',
  completed: 'bg-green-500/20 text-green-700 border-green-500/30',
  cancelled: 'bg-red-500/20 text-red-700 border-red-500/30',
  no_show: 'bg-gray-500/20 text-gray-700 border-gray-500/30',
};

const RECORD_TYPE_LABELS: Record<string, string> = {
  consultation: 'Consulta',
  procedure: 'Procedimento',
  follow_up: 'Retorno',
  exam: 'Exame',
  other: 'Outro',
};

export default function AdminTrackingReport() {
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [medicalRecords, setMedicalRecords] = useState<MedicalRecord[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);

  const currentDate = new Date();
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('week');
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>(subDays(currentDate, 7));
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>(currentDate);
  const [selectedProfessional, setSelectedProfessional] = useState<string>('all');
  const [selectedRecordType, setSelectedRecordType] = useState<string>('all');

  useEffect(() => {
    fetchData();
  }, [periodFilter, customStartDate, customEndDate]);

  const getDateRange = () => {
    const today = new Date();
    switch (periodFilter) {
      case 'day':
        return { startDate: startOfDay(today), endDate: endOfDay(today) };
      case 'week':
        return { startDate: startOfWeek(today, { weekStartsOn: 0 }), endDate: endOfWeek(today, { weekStartsOn: 0 }) };
      case 'month':
        return { startDate: startOfMonth(today), endDate: endOfMonth(today) };
      case 'custom':
        return {
          startDate: customStartDate || subDays(today, 7),
          endDate: customEndDate || today,
        };
      default:
        return { startDate: startOfWeek(today), endDate: endOfWeek(today) };
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const { startDate, endDate } = getDateRange();
      const startStr = format(startDate, 'yyyy-MM-dd');
      const endStr = format(endDate, 'yyyy-MM-dd');

      const [profResult, apptsResult, recordsResult, servicesResult] = await Promise.all([
        supabase.from('professionals').select('id, name, specialty_id, profession').eq('is_active', true),
        supabase.from('appointments').select('*').gte('appointment_date', startStr).lte('appointment_date', endStr),
        supabase.from('medical_records').select('*').gte('record_date', startStr).lte('record_date', endStr),
        supabase.from('services').select('id, name, specialty_id').eq('is_active', true),
      ]);

      if (profResult.error) throw profResult.error;
      if (apptsResult.error) throw apptsResult.error;
      if (servicesResult.error) throw servicesResult.error;

      setProfessionals(profResult.data || []);
      setAppointments(apptsResult.data || []);
      setMedicalRecords(recordsResult.data || []);
      setServices(servicesResult.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  // Filtered data
  const filteredAppointments = useMemo(() => {
    let data = appointments;
    if (selectedProfessional !== 'all') {
      data = data.filter(a => a.professional_uuid === selectedProfessional);
    }
    return data;
  }, [appointments, selectedProfessional]);

  const filteredRecords = useMemo(() => {
    let data = medicalRecords;
    if (selectedProfessional !== 'all') {
      data = data.filter(r => r.professional_id === selectedProfessional);
    }
    if (selectedRecordType !== 'all') {
      data = data.filter(r => r.record_type === selectedRecordType);
    }
    return data;
  }, [medicalRecords, selectedProfessional, selectedRecordType]);

  // Statistics
  const stats = useMemo(() => {
    const total = filteredAppointments.length;
    const completed = filteredAppointments.filter(a => a.status === 'completed').length;
    const cancelled = filteredAppointments.filter(a => a.status === 'cancelled').length;
    const pending = filteredAppointments.filter(a => a.status === 'pending' || a.status === 'confirmed').length;
    const noShow = filteredAppointments.filter(a => a.status === 'no_show').length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    const totalRecords = filteredRecords.length;

    return { total, completed, cancelled, pending, noShow, completionRate, totalRecords };
  }, [filteredAppointments, filteredRecords]);

  // Status distribution chart
  const statusChartData = useMemo(() => {
    const statusCounts: Record<string, number> = {};
    filteredAppointments.forEach(a => {
      statusCounts[a.status] = (statusCounts[a.status] || 0) + 1;
    });
    return Object.entries(statusCounts).map(([status, count], index) => ({
      name: STATUS_LABELS[status] || status,
      value: count,
      color: CHART_COLORS[index % CHART_COLORS.length],
    }));
  }, [filteredAppointments]);

  // Professional productivity chart
  const professionalChartData = useMemo(() => {
    const profCounts: Record<string, { name: string; appointments: number; records: number }> = {};
    
    filteredAppointments.forEach(a => {
      const prof = professionals.find(p => p.id === a.professional_uuid);
      if (prof) {
        if (!profCounts[prof.id]) {
          profCounts[prof.id] = { name: prof.name, appointments: 0, records: 0 };
        }
        profCounts[prof.id].appointments += 1;
      }
    });

    filteredRecords.forEach(r => {
      const prof = professionals.find(p => p.id === r.professional_id);
      if (prof) {
        if (!profCounts[prof.id]) {
          profCounts[prof.id] = { name: prof.name, appointments: 0, records: 0 };
        }
        profCounts[prof.id].records += 1;
      }
    });

    return Object.values(profCounts).sort((a, b) => b.appointments - a.appointments);
  }, [filteredAppointments, filteredRecords, professionals]);

  // Daily trend chart
  const dailyTrendData = useMemo(() => {
    const { startDate, endDate } = getDateRange();
    const days = eachDayOfInterval({ start: startDate, end: endDate });
    
    return days.map(day => {
      const dayStr = format(day, 'yyyy-MM-dd');
      const dayAppointments = filteredAppointments.filter(a => a.appointment_date === dayStr);
      const dayRecords = filteredRecords.filter(r => r.record_date === dayStr);
      
      return {
        date: format(day, 'dd/MM', { locale: ptBR }),
        agendamentos: dayAppointments.length,
        prontuarios: dayRecords.length,
      };
    });
  }, [filteredAppointments, filteredRecords, periodFilter, customStartDate, customEndDate]);

  // Record type distribution
  const recordTypeData = useMemo(() => {
    const typeCounts: Record<string, number> = {};
    filteredRecords.forEach(r => {
      typeCounts[r.record_type] = (typeCounts[r.record_type] || 0) + 1;
    });
    return Object.entries(typeCounts).map(([type, count], index) => ({
      name: RECORD_TYPE_LABELS[type] || type,
      value: count,
      color: CHART_COLORS[index % CHART_COLORS.length],
    }));
  }, [filteredRecords]);

  const getPeriodLabel = () => {
    const { startDate, endDate } = getDateRange();
    if (periodFilter === 'day') {
      return format(startDate, "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
    }
    return `${format(startDate, 'dd/MM/yyyy')} - ${format(endDate, 'dd/MM/yyyy')}`;
  };

  const handleExportExcel = () => {
    // Appointments sheet
    const appointmentsData = filteredAppointments.map(a => {
      const prof = professionals.find(p => p.id === a.professional_uuid);
      return {
        'Data': format(parseISO(a.appointment_date), 'dd/MM/yyyy'),
        'Horário': a.appointment_time?.slice(0, 5) || '-',
        'Paciente': a.patient_name,
        'Profissional': prof?.name || '-',
        'Status': STATUS_LABELS[a.status] || a.status,
        'Valor (R$)': (a.amount_cents / 100).toFixed(2),
        'Pagamento': a.payment_status === 'paid' ? 'Pago' : 'Pendente',
      };
    });

    // Summary sheet
    const summaryData = [
      { 'Métrica': 'Total de Agendamentos', 'Valor': stats.total },
      { 'Métrica': 'Concluídos', 'Valor': stats.completed },
      { 'Métrica': 'Cancelados', 'Valor': stats.cancelled },
      { 'Métrica': 'Pendentes', 'Valor': stats.pending },
      { 'Métrica': 'Não Compareceu', 'Valor': stats.noShow },
      { 'Métrica': 'Taxa de Conclusão', 'Valor': `${stats.completionRate}%` },
      { 'Métrica': 'Total de Prontuários', 'Valor': stats.totalRecords },
    ];

    // Professional productivity sheet
    const productivityData = professionalChartData.map(p => ({
      'Profissional': p.name,
      'Agendamentos': p.appointments,
      'Prontuários': p.records,
    }));

    const wb = XLSX.utils.book_new();
    
    const ws1 = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, ws1, 'Resumo');
    
    const ws2 = XLSX.utils.json_to_sheet(appointmentsData);
    XLSX.utils.book_append_sheet(wb, ws2, 'Agendamentos');
    
    const ws3 = XLSX.utils.json_to_sheet(productivityData);
    XLSX.utils.book_append_sheet(wb, ws3, 'Produtividade');

    const filename = `relatorio_acompanhamento_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
    XLSX.writeFile(wb, filename);
    toast.success('Relatório Excel exportado com sucesso!');
  };

  const handleExportPDF = () => {
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Relatório de Acompanhamento - ${getPeriodLabel()}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; font-size: 12px; }
          h1 { color: #333; font-size: 20px; margin-bottom: 5px; }
          h2 { color: #666; font-size: 14px; margin-top: 25px; border-bottom: 1px solid #ddd; padding-bottom: 5px; }
          .period { color: #666; margin-bottom: 20px; }
          .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin: 20px 0; }
          .stat-card { background: #f9f9f9; padding: 15px; border-radius: 8px; text-align: center; }
          .stat-value { font-size: 24px; font-weight: bold; color: #333; }
          .stat-label { font-size: 11px; color: #666; margin-top: 5px; }
          table { width: 100%; border-collapse: collapse; margin: 15px 0; font-size: 11px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background-color: #f5f5f5; font-weight: bold; }
          .status-completed { color: green; }
          .status-cancelled { color: red; }
          .status-pending { color: orange; }
          @media print { body { padding: 0; } }
        </style>
      </head>
      <body>
        <h1>Relatório de Acompanhamento Clínico</h1>
        <p class="period">Período: ${getPeriodLabel()}</p>

        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-value">${stats.total}</div>
            <div class="stat-label">Total de Agendamentos</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${stats.completed}</div>
            <div class="stat-label">Concluídos</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${stats.completionRate}%</div>
            <div class="stat-label">Taxa de Conclusão</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">${stats.totalRecords}</div>
            <div class="stat-label">Prontuários Registrados</div>
          </div>
        </div>

        <h2>Produtividade por Profissional</h2>
        <table>
          <thead>
            <tr>
              <th>Profissional</th>
              <th>Agendamentos</th>
              <th>Prontuários</th>
            </tr>
          </thead>
          <tbody>
            ${professionalChartData.map(p => `
              <tr>
                <td>${p.name}</td>
                <td>${p.appointments}</td>
                <td>${p.records}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <h2>Detalhamento de Agendamentos</h2>
        <table>
          <thead>
            <tr>
              <th>Data</th>
              <th>Horário</th>
              <th>Paciente</th>
              <th>Profissional</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            ${filteredAppointments.slice(0, 50).map(a => {
              const prof = professionals.find(p => p.id === a.professional_uuid);
              return `
                <tr>
                  <td>${format(parseISO(a.appointment_date), 'dd/MM/yyyy')}</td>
                  <td>${a.appointment_time?.slice(0, 5) || '-'}</td>
                  <td>${a.patient_name}</td>
                  <td>${prof?.name || '-'}</td>
                  <td class="status-${a.status}">${STATUS_LABELS[a.status] || a.status}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
        ${filteredAppointments.length > 50 ? '<p style="color: #999; font-size: 10px;">* Exibindo apenas os primeiros 50 registros</p>' : ''}

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
            <h1 className="text-2xl font-bold">Relatório de Acompanhamento</h1>
            <p className="text-muted-foreground">
              Estatísticas de atendimentos, fluxo de pacientes e produtividade
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
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-1">
              <label className="text-sm font-medium">Período</label>
              <Select value={periodFilter} onValueChange={(v) => setPeriodFilter(v as PeriodFilter)}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Hoje</SelectItem>
                  <SelectItem value="week">Semana</SelectItem>
                  <SelectItem value="month">Mês</SelectItem>
                  <SelectItem value="custom">Personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {periodFilter === 'custom' && (
              <>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Data Início</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn('w-[140px] justify-start text-left font-normal', !customStartDate && 'text-muted-foreground')}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {customStartDate ? format(customStartDate, 'dd/MM/yyyy') : 'Início'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar mode="single" selected={customStartDate} onSelect={setCustomStartDate} initialFocus locale={ptBR} />
                    </PopoverContent>
                  </Popover>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium">Data Fim</label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" className={cn('w-[140px] justify-start text-left font-normal', !customEndDate && 'text-muted-foreground')}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {customEndDate ? format(customEndDate, 'dd/MM/yyyy') : 'Fim'}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar mode="single" selected={customEndDate} onSelect={setCustomEndDate} initialFocus locale={ptBR} />
                    </PopoverContent>
                  </Popover>
                </div>
              </>
            )}

            <div className="space-y-1">
              <label className="text-sm font-medium">Profissional</label>
              <Select value={selectedProfessional} onValueChange={setSelectedProfessional}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {professionals.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium">Tipo de Registro</label>
              <Select value={selectedRecordType} onValueChange={setSelectedRecordType}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="consultation">Consulta</SelectItem>
                  <SelectItem value="procedure">Procedimento</SelectItem>
                  <SelectItem value="follow_up">Retorno</SelectItem>
                  <SelectItem value="exam">Exame</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <Card className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Activity className="h-4 w-4" />
              <span className="text-xs font-medium">Total</span>
            </div>
            <p className="text-2xl font-bold">{stats.total}</p>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2 text-green-600 mb-1">
              <CheckCircle className="h-4 w-4" />
              <span className="text-xs font-medium">Concluídos</span>
            </div>
            <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2 text-red-600 mb-1">
              <XCircle className="h-4 w-4" />
              <span className="text-xs font-medium">Cancelados</span>
            </div>
            <p className="text-2xl font-bold text-red-600">{stats.cancelled}</p>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2 text-yellow-600 mb-1">
              <Clock className="h-4 w-4" />
              <span className="text-xs font-medium">Pendentes</span>
            </div>
            <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2 text-gray-600 mb-1">
              <Users className="h-4 w-4" />
              <span className="text-xs font-medium">Não Compareceu</span>
            </div>
            <p className="text-2xl font-bold text-gray-600">{stats.noShow}</p>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2 text-primary mb-1">
              <TrendingUp className="h-4 w-4" />
              <span className="text-xs font-medium">Taxa Conclusão</span>
            </div>
            <p className="text-2xl font-bold text-primary">{stats.completionRate}%</p>
          </Card>
          <Card className="p-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <Stethoscope className="h-4 w-4" />
              <span className="text-xs font-medium">Prontuários</span>
            </div>
            <p className="text-2xl font-bold">{stats.totalRecords}</p>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Daily Trend */}
          <Card className="p-4">
            <h3 className="font-semibold mb-4">Evolução Diária</h3>
            <div className="h-[250px]">
              {dailyTrendData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={dailyTrendData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="agendamentos" stroke="hsl(var(--primary))" name="Agendamentos" strokeWidth={2} />
                    <Line type="monotone" dataKey="prontuarios" stroke="hsl(var(--chart-2))" name="Prontuários" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  Sem dados para o período
                </div>
              )}
            </div>
          </Card>

          {/* Status Distribution */}
          <Card className="p-4">
            <h3 className="font-semibold mb-4">Distribuição por Status</h3>
            <div className="h-[250px]">
              {statusChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {statusChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  Sem dados para o período
                </div>
              )}
            </div>
          </Card>

          {/* Professional Productivity */}
          <Card className="p-4">
            <h3 className="font-semibold mb-4">Produtividade por Profissional</h3>
            <div className="h-[250px]">
              {professionalChartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={professionalChartData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis dataKey="name" type="category" width={100} tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Bar dataKey="appointments" fill="hsl(var(--primary))" name="Agendamentos" />
                    <Bar dataKey="records" fill="hsl(var(--chart-2))" name="Prontuários" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  Sem dados para o período
                </div>
              )}
            </div>
          </Card>

          {/* Record Type Distribution */}
          <Card className="p-4">
            <h3 className="font-semibold mb-4">Tipos de Registro</h3>
            <div className="h-[250px]">
              {recordTypeData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={recordTypeData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={3}
                      dataKey="value"
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {recordTypeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  Sem prontuários no período
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Appointments Table */}
        <Card className="p-4">
          <h3 className="font-semibold mb-4">Últimos Agendamentos</h3>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Horário</TableHead>
                  <TableHead>Paciente</TableHead>
                  <TableHead>Profissional</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : filteredAppointments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Nenhum agendamento encontrado no período
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAppointments.slice(0, 20).map(appt => {
                    const prof = professionals.find(p => p.id === appt.professional_uuid);
                    return (
                      <TableRow key={appt.id}>
                        <TableCell>{format(parseISO(appt.appointment_date), 'dd/MM/yyyy')}</TableCell>
                        <TableCell>{appt.appointment_time?.slice(0, 5) || '-'}</TableCell>
                        <TableCell className="font-medium">{appt.patient_name}</TableCell>
                        <TableCell>{prof?.name || '-'}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={STATUS_COLORS[appt.status] || ''}>
                            {STATUS_LABELS[appt.status] || appt.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          {(appt.amount_cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
            {filteredAppointments.length > 20 && (
              <p className="text-sm text-muted-foreground mt-2 text-center">
                Exibindo 20 de {filteredAppointments.length} agendamentos
              </p>
            )}
          </div>
        </Card>
      </div>
    </AdminLayout>
  );
}
