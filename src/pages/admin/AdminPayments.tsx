import { useState, useEffect, useMemo } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  DollarSign,
  Users,
  Clock,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  Plus,
  Edit,
  CalendarIcon,
  Search,
  History,
  User,
  FileSpreadsheet,
  FileText,
  Filter,
  X,
  Bell,
  MessageCircle,
  AlertTriangle,
} from 'lucide-react';
import { DelinquencyDashboard } from '@/components/admin/DelinquencyDashboard';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, parse } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { useAuth } from '@/contexts/AuthContext';

interface Professional {
  id: string;
  name: string;
  specialty_id: string;
  payment_type: string;
  payment_percentage: number;
  fixed_room_value_cents: number;
  room_id: string | null;
}

type PaymentStatus = 'pending' | 'paid' | 'next_month';

interface Payment {
  id: string;
  professional_id: string;
  month: number;
  year: number;
  amount_due_cents: number;
  amount_paid_cents: number;
  status: PaymentStatus;
  payment_type: string;
  due_date: string | null;
  paid_at: string | null;
  notes: string | null;
  professional?: Professional;
}

interface PaymentHistory {
  id: string;
  payment_id: string;
  action: string;
  changed_by: string | null;
  changed_by_name: string | null;
  previous_status: string | null;
  new_status: string | null;
  previous_amount_cents: number | null;
  new_amount_cents: number | null;
  notes: string | null;
  created_at: string;
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

const STATUS_CONFIG = {
  pending: { label: 'Pendente', color: 'bg-yellow-500', textColor: 'text-yellow-700', bgColor: 'bg-yellow-100' },
  paid: { label: 'Pago', color: 'bg-green-500', textColor: 'text-green-700', bgColor: 'bg-green-100' },
  next_month: { label: 'Próximo Mês', color: 'bg-blue-500', textColor: 'text-blue-700', bgColor: 'bg-blue-100' },
};

export default function AdminPayments() {
  const { user, profile } = useAuth();
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [selectedProfessional, setSelectedProfessional] = useState<string>('');
  const [formData, setFormData] = useState({
    amount_due_cents: 0,
    amount_paid_cents: 0,
    status: 'pending' as 'pending' | 'paid' | 'next_month',
    payment_type: 'percentage',
    due_date: null as Date | null,
    notes: '',
  });

  // History dialog state
  const [isHistoryDialogOpen, setIsHistoryDialogOpen] = useState(false);
  const [selectedPaymentForHistory, setSelectedPaymentForHistory] = useState<Payment | null>(null);
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Report state
  const [isReportDialogOpen, setIsReportDialogOpen] = useState(false);
  const [reportStartMonth, setReportStartMonth] = useState(1);
  const [reportStartYear, setReportStartYear] = useState(currentDate.getFullYear());
  const [reportEndMonth, setReportEndMonth] = useState(currentDate.getMonth() + 1);
  const [reportEndYear, setReportEndYear] = useState(currentDate.getFullYear());
  const [reportProfessionalId, setReportProfessionalId] = useState<string>('all');
  const [reportData, setReportData] = useState<Payment[]>([]);
  const [loadingReport, setLoadingReport] = useState(false);
  const [sendingReminders, setSendingReminders] = useState(false);
  const [isDelinquencyOpen, setIsDelinquencyOpen] = useState(false);

  useEffect(() => {
    fetchData();
  }, [selectedMonth, selectedYear]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch professionals
      const { data: profData, error: profError } = await supabase
        .from('professionals')
        .select('id, name, specialty_id, payment_type, payment_percentage, fixed_room_value_cents, room_id')
        .eq('is_active', true);

      if (profError) throw profError;
      setProfessionals(profData || []);

      // Fetch payments for selected month
      const { data: paymentData, error: paymentError } = await supabase
        .from('professional_payments')
        .select('*')
        .eq('month', selectedMonth)
        .eq('year', selectedYear);

      if (paymentError) throw paymentError;
      // Cast status to PaymentStatus type
      const typedPayments = (paymentData || []).map(p => ({
        ...p,
        status: p.status as PaymentStatus
      }));
      setPayments(typedPayments);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const paymentsWithProfessionals = useMemo(() => {
    return payments.map(payment => ({
      ...payment,
      professional: professionals.find(p => p.id === payment.professional_id),
    }));
  }, [payments, professionals]);

  const filteredPayments = useMemo(() => {
    let filtered = paymentsWithProfessionals;
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter(p => p.status === statusFilter);
    }
    
    if (searchQuery) {
      filtered = filtered.filter(p => 
        p.professional?.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    return filtered;
  }, [paymentsWithProfessionals, statusFilter, searchQuery]);

  const professionalsWithoutPayment = useMemo(() => {
    const paymentProfIds = payments.map(p => p.professional_id);
    return professionals.filter(p => !paymentProfIds.includes(p.id));
  }, [professionals, payments]);

  const stats = useMemo(() => {
    const totalDue = payments.reduce((sum, p) => sum + p.amount_due_cents, 0);
    const totalPaid = payments.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount_paid_cents, 0);
    const totalPending = payments.filter(p => p.status === 'pending').reduce((sum, p) => sum + p.amount_due_cents, 0);
    const paidCount = payments.filter(p => p.status === 'paid').length;
    const pendingCount = payments.filter(p => p.status === 'pending').length;
    const nextMonthCount = payments.filter(p => p.status === 'next_month').length;

    return { totalDue, totalPaid, totalPending, paidCount, pendingCount, nextMonthCount };
  }, [payments]);

  const handleOpenPaymentDialog = (payment?: Payment) => {
    if (payment) {
      setEditingPayment(payment);
      setSelectedProfessional(payment.professional_id);
      setFormData({
        amount_due_cents: payment.amount_due_cents,
        amount_paid_cents: payment.amount_paid_cents,
        status: payment.status,
        payment_type: payment.payment_type,
        due_date: payment.due_date ? new Date(payment.due_date) : null,
        notes: payment.notes || '',
      });
    } else {
      setEditingPayment(null);
      setSelectedProfessional('');
      setFormData({
        amount_due_cents: 0,
        amount_paid_cents: 0,
        status: 'pending',
        payment_type: 'percentage',
        due_date: null,
        notes: '',
      });
    }
    setIsPaymentDialogOpen(true);
  };

  const logPaymentHistory = async (
    paymentId: string,
    action: string,
    previousStatus?: string,
    newStatus?: string,
    previousAmount?: number,
    newAmount?: number,
    notes?: string
  ) => {
    try {
      await supabase.from('professional_payment_history').insert({
        payment_id: paymentId,
        action,
        changed_by: user?.id || null,
        changed_by_name: profile?.full_name || user?.email || 'Sistema',
        previous_status: previousStatus || null,
        new_status: newStatus || null,
        previous_amount_cents: previousAmount || null,
        new_amount_cents: newAmount || null,
        notes: notes || null,
      });
    } catch (error) {
      console.error('Error logging payment history:', error);
    }
  };

  const handleSavePayment = async () => {
    if (!selectedProfessional) {
      toast.error('Selecione um profissional');
      return;
    }

    try {
      const paymentData = {
        professional_id: selectedProfessional,
        month: selectedMonth,
        year: selectedYear,
        amount_due_cents: formData.amount_due_cents,
        amount_paid_cents: formData.status === 'paid' ? formData.amount_due_cents : formData.amount_paid_cents,
        status: formData.status,
        payment_type: formData.payment_type,
        due_date: formData.due_date ? format(formData.due_date, 'yyyy-MM-dd') : null,
        paid_at: formData.status === 'paid' ? new Date().toISOString() : null,
        notes: formData.notes || null,
      };

      if (editingPayment) {
        const { error } = await supabase
          .from('professional_payments')
          .update(paymentData)
          .eq('id', editingPayment.id);

        if (error) throw error;

        // Log history
        await logPaymentHistory(
          editingPayment.id,
          'updated',
          editingPayment.status,
          formData.status,
          editingPayment.amount_due_cents,
          formData.amount_due_cents,
          formData.notes
        );

        toast.success('Pagamento atualizado com sucesso!');
      } else {
        const { data: newPayment, error } = await supabase
          .from('professional_payments')
          .insert(paymentData)
          .select('id')
          .single();

        if (error) throw error;

        // Log history for new payment
        if (newPayment) {
          await logPaymentHistory(
            newPayment.id,
            'created',
            undefined,
            formData.status,
            undefined,
            formData.amount_due_cents,
            'Pagamento criado'
          );
        }

        toast.success('Pagamento registrado com sucesso!');
      }

      setIsPaymentDialogOpen(false);
      fetchData();
    } catch (error: any) {
      console.error('Error saving payment:', error);
      toast.error(error.message || 'Erro ao salvar pagamento');
    }
  };

  const handleMarkAsPaid = async (payment: Payment) => {
    try {
      const { error } = await supabase
        .from('professional_payments')
        .update({
          status: 'paid',
          amount_paid_cents: payment.amount_due_cents,
          paid_at: new Date().toISOString(),
        })
        .eq('id', payment.id);

      if (error) throw error;

      // Log history
      await logPaymentHistory(
        payment.id,
        'status_changed',
        payment.status,
        'paid',
        undefined,
        undefined,
        'Marcado como pago'
      );

      toast.success('Pagamento marcado como pago!');
      fetchData();
    } catch (error) {
      console.error('Error marking as paid:', error);
      toast.error('Erro ao atualizar pagamento');
    }
  };

  const handleDeferPayment = async (payment: Payment) => {
    try {
      const { error } = await supabase
        .from('professional_payments')
        .update({ status: 'next_month' })
        .eq('id', payment.id);

      if (error) throw error;

      // Log history
      await logPaymentHistory(
        payment.id,
        'status_changed',
        payment.status,
        'next_month',
        undefined,
        undefined,
        'Adiado para próximo mês'
      );

      toast.success('Pagamento adiado para o próximo mês!');
      fetchData();
    } catch (error) {
      console.error('Error deferring payment:', error);
      toast.error('Erro ao adiar pagamento');
    }
  };

  const handleOpenHistory = async (payment: Payment) => {
    setSelectedPaymentForHistory(payment);
    setIsHistoryDialogOpen(true);
    setLoadingHistory(true);

    try {
      const { data, error } = await supabase
        .from('professional_payment_history')
        .select('*')
        .eq('payment_id', payment.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPaymentHistory(data || []);
    } catch (error) {
      console.error('Error fetching history:', error);
      toast.error('Erro ao carregar histórico');
    } finally {
      setLoadingHistory(false);
    }
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'created': return 'Criado';
      case 'updated': return 'Atualizado';
      case 'status_changed': return 'Status alterado';
      default: return action;
    }
  };

  const formatCurrency = (cents: number) => {
    return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const fetchReportData = async () => {
    setLoadingReport(true);
    try {
      let query = supabase
        .from('professional_payments')
        .select('*')
        .order('year', { ascending: true })
        .order('month', { ascending: true });

      // Filter by period
      const startPeriod = reportStartYear * 100 + reportStartMonth;
      const endPeriod = reportEndYear * 100 + reportEndMonth;

      const { data, error } = await query;
      if (error) throw error;

      // Filter by period in JS (more flexible)
      let filtered = (data || []).filter(p => {
        const period = p.year * 100 + p.month;
        return period >= startPeriod && period <= endPeriod;
      });

      // Filter by professional
      if (reportProfessionalId !== 'all') {
        filtered = filtered.filter(p => p.professional_id === reportProfessionalId);
      }

      const typedPayments = filtered.map(p => ({
        ...p,
        status: p.status as PaymentStatus
      }));

      setReportData(typedPayments);
    } catch (error) {
      console.error('Error fetching report:', error);
      toast.error('Erro ao gerar relatório');
    } finally {
      setLoadingReport(false);
    }
  };

  const handleOpenReport = () => {
    setIsReportDialogOpen(true);
    setReportData([]);
  };

  const handleGenerateReport = () => {
    fetchReportData();
  };

  const reportWithProfessionals = useMemo(() => {
    return reportData.map(payment => ({
      ...payment,
      professional: professionals.find(p => p.id === payment.professional_id),
    }));
  }, [reportData, professionals]);

  const reportStats = useMemo(() => {
    const totalDue = reportData.reduce((sum, p) => sum + p.amount_due_cents, 0);
    const totalPaid = reportData.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount_paid_cents, 0);
    const paidCount = reportData.filter(p => p.status === 'paid').length;
    const pendingCount = reportData.filter(p => p.status === 'pending').length;
    return { totalDue, totalPaid, paidCount, pendingCount };
  }, [reportData]);

  const exportToExcel = () => {
    if (reportWithProfessionals.length === 0) {
      toast.error('Gere o relatório antes de exportar');
      return;
    }

    const data = reportWithProfessionals.map(p => ({
      'Profissional': p.professional?.name || 'Desconhecido',
      'Mês/Ano': `${MONTHS.find(m => m.value === p.month)?.label}/${p.year}`,
      'Tipo': p.payment_type === 'percentage' ? 'Percentual' : 'Sala Fixa',
      'Valor Devido': formatCurrency(p.amount_due_cents),
      'Valor Pago': formatCurrency(p.amount_paid_cents),
      'Status': STATUS_CONFIG[p.status]?.label || p.status,
      'Vencimento': p.due_date ? format(new Date(p.due_date), 'dd/MM/yyyy') : '-',
      'Data Pagamento': p.paid_at ? format(new Date(p.paid_at), 'dd/MM/yyyy') : '-',
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Pagamentos');

    const startPeriod = `${MONTHS.find(m => m.value === reportStartMonth)?.label}_${reportStartYear}`;
    const endPeriod = `${MONTHS.find(m => m.value === reportEndMonth)?.label}_${reportEndYear}`;
    XLSX.writeFile(wb, `relatorio_pagamentos_${startPeriod}_a_${endPeriod}.xlsx`);
    toast.success('Relatório exportado para Excel!');
  };

  const exportToPDF = () => {
    if (reportWithProfessionals.length === 0) {
      toast.error('Gere o relatório antes de exportar');
      return;
    }

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Title
    doc.setFontSize(18);
    doc.text('Relatório de Pagamentos', pageWidth / 2, 20, { align: 'center' });

    // Period
    doc.setFontSize(12);
    const periodText = `Período: ${MONTHS.find(m => m.value === reportStartMonth)?.label}/${reportStartYear} a ${MONTHS.find(m => m.value === reportEndMonth)?.label}/${reportEndYear}`;
    doc.text(periodText, pageWidth / 2, 30, { align: 'center' });

    if (reportProfessionalId !== 'all') {
      const prof = professionals.find(p => p.id === reportProfessionalId);
      doc.text(`Profissional: ${prof?.name || 'Todos'}`, pageWidth / 2, 38, { align: 'center' });
    }

    // Stats
    doc.setFontSize(11);
    let y = 50;
    doc.text(`Total Esperado: ${formatCurrency(reportStats.totalDue)}`, 14, y);
    doc.text(`Total Pago: ${formatCurrency(reportStats.totalPaid)}`, 14, y + 7);
    doc.text(`Pagos: ${reportStats.paidCount} | Pendentes: ${reportStats.pendingCount}`, 14, y + 14);

    // Table header
    y = 75;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    const cols = ['Profissional', 'Mês/Ano', 'Tipo', 'Valor', 'Status'];
    const colWidths = [50, 30, 30, 35, 25];
    let x = 14;
    cols.forEach((col, i) => {
      doc.text(col, x, y);
      x += colWidths[i];
    });

    // Table data
    doc.setFont('helvetica', 'normal');
    y += 7;

    reportWithProfessionals.forEach((p) => {
      if (y > 280) {
        doc.addPage();
        y = 20;
      }

      x = 14;
      const row = [
        (p.professional?.name || 'Desconhecido').substring(0, 20),
        `${MONTHS.find(m => m.value === p.month)?.label?.substring(0, 3)}/${p.year}`,
        p.payment_type === 'percentage' ? 'Percent.' : 'Sala Fixa',
        formatCurrency(p.amount_due_cents),
        STATUS_CONFIG[p.status]?.label || p.status,
      ];

      row.forEach((cell, i) => {
        doc.text(cell, x, y);
        x += colWidths[i];
      });
      y += 6;
    });

    // Footer
    doc.setFontSize(8);
    doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`, 14, 290);

    const startPeriod = `${MONTHS.find(m => m.value === reportStartMonth)?.label}_${reportStartYear}`;
    const endPeriod = `${MONTHS.find(m => m.value === reportEndMonth)?.label}_${reportEndYear}`;
    doc.save(`relatorio_pagamentos_${startPeriod}_a_${endPeriod}.pdf`);
    toast.success('Relatório exportado para PDF!');
  };

  const handleSendReminders = async () => {
    setSendingReminders(true);
    try {
      const { data, error } = await supabase.functions.invoke('payment-reminders', {
        body: {}
      });

      if (error) throw error;

      if (data?.results && data.results.length > 0) {
        const successful = data.results.filter((r: any) => r.success);
        if (successful.length > 0) {
          // Open WhatsApp links for each professional
          successful.forEach((result: any, index: number) => {
            setTimeout(() => {
              window.open(result.whatsappLink, '_blank');
            }, index * 500); // Stagger opening to avoid popup blockers
          });
          toast.success(`${successful.length} lembretes gerados! Clique nos links para enviar.`);
        } else {
          toast.info('Nenhum pagamento próximo do vencimento encontrado.');
        }
      } else {
        toast.info(data?.message || 'Nenhum lembrete para enviar.');
      }
    } catch (error: any) {
      console.error('Error sending reminders:', error);
      toast.error('Erro ao enviar lembretes');
    } finally {
      setSendingReminders(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Pagamentos</h1>
            <p className="text-muted-foreground">
              Controle de pagamentos dos funcionários
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setIsDelinquencyOpen(true)} className="text-destructive border-destructive/30 hover:bg-destructive/10">
              <AlertTriangle className="h-4 w-4 mr-2" />
              Inadimplência
            </Button>
            <Button variant="outline" onClick={handleSendReminders} disabled={sendingReminders}>
              <Bell className="h-4 w-4 mr-2" />
              {sendingReminders ? 'Enviando...' : 'Enviar Lembretes'}
            </Button>
            <Button variant="outline" onClick={handleOpenReport}>
              <FileText className="h-4 w-4 mr-2" />
              Relatório
            </Button>
            <Button onClick={() => handleOpenPaymentDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Pagamento
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
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
          </div>
          
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

          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar funcionário..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{formatCurrency(stats.totalDue)}</p>
                <p className="text-sm text-muted-foreground">Total Esperado</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-green-100 flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{formatCurrency(stats.totalPaid)}</p>
                <p className="text-sm text-muted-foreground">Total Recebido ({stats.paidCount})</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-yellow-100 flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{formatCurrency(stats.totalPending)}</p>
                <p className="text-sm text-muted-foreground">Pendente ({stats.pendingCount})</p>
              </div>
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-blue-100 flex items-center justify-center">
                <ArrowRight className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.nextMonthCount}</p>
                <p className="text-sm text-muted-foreground">Adiados</p>
              </div>
            </div>
          </Card>
        </div>

        {/* Professionals without payment alert */}
        {professionalsWithoutPayment.length > 0 && (
          <Card className="p-4 border-yellow-200 bg-yellow-50">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                <p className="font-medium text-yellow-800">Funcionários sem pagamento registrado</p>
                <p className="text-sm text-yellow-700">
                  {professionalsWithoutPayment.map(p => p.name).join(', ')}
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Payments Table */}
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Funcionário</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Valor Devido</TableHead>
                <TableHead>Valor Pago</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : filteredPayments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Nenhum pagamento encontrado
                  </TableCell>
                </TableRow>
              ) : (
                filteredPayments.map((payment) => {
                  const statusConfig = STATUS_CONFIG[payment.status];
                  return (
                    <TableRow key={payment.id}>
                      <TableCell className="font-medium">
                        {payment.professional?.name || 'Desconhecido'}
                      </TableCell>
                      <TableCell>
                        {payment.payment_type === 'percentage' ? 'Percentual' : 'Sala Fixa'}
                      </TableCell>
                      <TableCell>{formatCurrency(payment.amount_due_cents)}</TableCell>
                      <TableCell>{formatCurrency(payment.amount_paid_cents)}</TableCell>
                      <TableCell>
                        {payment.due_date 
                          ? format(new Date(payment.due_date), 'dd/MM/yyyy')
                          : '-'
                        }
                      </TableCell>
                      <TableCell>
                        <Badge className={cn(statusConfig.bgColor, statusConfig.textColor, 'border-0')}>
                          {statusConfig.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenPaymentDialog(payment)}
                            title="Editar"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenHistory(payment)}
                            title="Histórico"
                          >
                            <History className="h-4 w-4" />
                          </Button>
                          {payment.status === 'pending' && (
                            <>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-green-600"
                                onClick={() => handleMarkAsPaid(payment)}
                                title="Marcar como pago"
                              >
                                <CheckCircle className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-blue-600"
                                onClick={() => handleDeferPayment(payment)}
                                title="Adiar"
                              >
                                <ArrowRight className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </Card>
      </div>

      {/* Payment Dialog */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingPayment ? 'Editar Pagamento' : 'Novo Pagamento'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <Label>Funcionário</Label>
              <Select
                value={selectedProfessional}
                onValueChange={setSelectedProfessional}
                disabled={!!editingPayment}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o funcionário" />
                </SelectTrigger>
                <SelectContent>
                  {(editingPayment ? professionals : professionalsWithoutPayment).map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Tipo de Pagamento</Label>
              <Select
                value={formData.payment_type}
                onValueChange={(v) => setFormData({ ...formData, payment_type: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Percentual</SelectItem>
                  <SelectItem value="fixed_room">Sala Fixa</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Valor Devido (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={(formData.amount_due_cents / 100).toFixed(2)}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  amount_due_cents: Math.round(parseFloat(e.target.value || '0') * 100)
                })}
              />
            </div>

            <div>
              <Label>Status</Label>
              <Select
                value={formData.status}
                onValueChange={(v) => setFormData({ ...formData, status: v as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="paid">Pago</SelectItem>
                  <SelectItem value="next_month">Próximo Mês</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Data de Vencimento</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.due_date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.due_date 
                      ? format(formData.due_date, 'dd/MM/yyyy')
                      : 'Selecionar data'
                    }
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.due_date || undefined}
                    onSelect={(date) => setFormData({ ...formData, due_date: date || null })}
                    locale={ptBR}
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Label>Observações</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Acordo, desconto, atraso..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPaymentDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSavePayment}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={isHistoryDialogOpen} onOpenChange={setIsHistoryDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Histórico de Alterações
            </DialogTitle>
          </DialogHeader>
          
          {selectedPaymentForHistory && (
            <div className="mb-4 p-3 bg-muted rounded-lg">
              <p className="font-medium">
                {selectedPaymentForHistory.professional?.name || 'Profissional'}
              </p>
              <p className="text-sm text-muted-foreground">
                {MONTHS.find(m => m.value === selectedPaymentForHistory.month)?.label} / {selectedPaymentForHistory.year}
              </p>
            </div>
          )}

          <ScrollArea className="max-h-[400px]">
            {loadingHistory ? (
              <div className="text-center py-8 text-muted-foreground">
                Carregando histórico...
              </div>
            ) : paymentHistory.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum histórico encontrado
              </div>
            ) : (
              <div className="space-y-4">
                {paymentHistory.map((entry) => (
                  <div key={entry.id} className="border-l-2 border-primary pl-4 pb-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline">{getActionLabel(entry.action)}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(entry.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm mb-1">
                      <User className="h-3 w-3 text-muted-foreground" />
                      <span>{entry.changed_by_name || 'Sistema'}</span>
                    </div>

                    {entry.previous_status && entry.new_status && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">Status: </span>
                        <span className={cn(STATUS_CONFIG[entry.previous_status as PaymentStatus]?.textColor)}>
                          {STATUS_CONFIG[entry.previous_status as PaymentStatus]?.label}
                        </span>
                        <span className="mx-1">→</span>
                        <span className={cn(STATUS_CONFIG[entry.new_status as PaymentStatus]?.textColor)}>
                          {STATUS_CONFIG[entry.new_status as PaymentStatus]?.label}
                        </span>
                      </div>
                    )}

                    {entry.previous_amount_cents !== null && entry.new_amount_cents !== null && 
                     entry.previous_amount_cents !== entry.new_amount_cents && (
                      <div className="text-sm">
                        <span className="text-muted-foreground">Valor: </span>
                        <span>{formatCurrency(entry.previous_amount_cents)}</span>
                        <span className="mx-1">→</span>
                        <span>{formatCurrency(entry.new_amount_cents)}</span>
                      </div>
                    )}

                    {entry.notes && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {entry.notes}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsHistoryDialogOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Report Dialog */}
      <Dialog open={isReportDialogOpen} onOpenChange={setIsReportDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Relatório de Pagamentos
            </DialogTitle>
          </DialogHeader>
          
          {/* Filters */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 p-4 bg-muted rounded-lg">
            <div>
              <Label className="text-xs">Mês Início</Label>
              <Select value={String(reportStartMonth)} onValueChange={(v) => setReportStartMonth(Number(v))}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map(m => (
                    <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Ano Início</Label>
              <Select value={String(reportStartYear)} onValueChange={(v) => setReportStartYear(Number(v))}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[2024, 2025, 2026].map(y => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Mês Fim</Label>
              <Select value={String(reportEndMonth)} onValueChange={(v) => setReportEndMonth(Number(v))}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map(m => (
                    <SelectItem key={m.value} value={String(m.value)}>{m.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Ano Fim</Label>
              <Select value={String(reportEndYear)} onValueChange={(v) => setReportEndYear(Number(v))}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[2024, 2025, 2026].map(y => (
                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Profissional</Label>
              <Select value={reportProfessionalId} onValueChange={setReportProfessionalId}>
                <SelectTrigger className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {professionals.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex gap-2 justify-center">
            <Button onClick={handleGenerateReport} disabled={loadingReport}>
              <Filter className="h-4 w-4 mr-2" />
              {loadingReport ? 'Gerando...' : 'Gerar Relatório'}
            </Button>
          </div>

          {/* Stats */}
          {reportData.length > 0 && (
            <div className="grid grid-cols-4 gap-3">
              <Card className="p-3 text-center">
                <p className="text-lg font-bold">{formatCurrency(reportStats.totalDue)}</p>
                <p className="text-xs text-muted-foreground">Total Esperado</p>
              </Card>
              <Card className="p-3 text-center">
                <p className="text-lg font-bold text-green-600">{formatCurrency(reportStats.totalPaid)}</p>
                <p className="text-xs text-muted-foreground">Total Pago</p>
              </Card>
              <Card className="p-3 text-center">
                <p className="text-lg font-bold">{reportStats.paidCount}</p>
                <p className="text-xs text-muted-foreground">Pagos</p>
              </Card>
              <Card className="p-3 text-center">
                <p className="text-lg font-bold text-yellow-600">{reportStats.pendingCount}</p>
                <p className="text-xs text-muted-foreground">Pendentes</p>
              </Card>
            </div>
          )}

          {/* Report Table */}
          <ScrollArea className="flex-1 max-h-[300px]">
            {loadingReport ? (
              <div className="text-center py-8 text-muted-foreground">
                Carregando...
              </div>
            ) : reportData.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Clique em "Gerar Relatório" para visualizar os dados
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Profissional</TableHead>
                    <TableHead>Mês/Ano</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Valor Devido</TableHead>
                    <TableHead>Valor Pago</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reportWithProfessionals.map((p) => {
                    const statusConfig = STATUS_CONFIG[p.status];
                    return (
                      <TableRow key={p.id}>
                        <TableCell className="font-medium">{p.professional?.name || 'Desconhecido'}</TableCell>
                        <TableCell>{MONTHS.find(m => m.value === p.month)?.label}/{p.year}</TableCell>
                        <TableCell>{p.payment_type === 'percentage' ? 'Percentual' : 'Sala Fixa'}</TableCell>
                        <TableCell>{formatCurrency(p.amount_due_cents)}</TableCell>
                        <TableCell>{formatCurrency(p.amount_paid_cents)}</TableCell>
                        <TableCell>
                          <Badge className={cn(statusConfig.bgColor, statusConfig.textColor, 'border-0')}>
                            {statusConfig.label}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </ScrollArea>

          <DialogFooter className="flex-row justify-between sm:justify-between">
            <div className="flex gap-2">
              {reportData.length > 0 && (
                <>
                  <Button variant="outline" size="sm" onClick={exportToExcel}>
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    Excel
                  </Button>
                  <Button variant="outline" size="sm" onClick={exportToPDF}>
                    <FileText className="h-4 w-4 mr-2" />
                    PDF
                  </Button>
                </>
              )}
            </div>
            <Button variant="outline" onClick={() => setIsReportDialogOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delinquency Dashboard */}
      <DelinquencyDashboard 
        isOpen={isDelinquencyOpen} 
        onClose={() => setIsDelinquencyOpen(false)} 
      />
    </AdminLayout>
  );
}
