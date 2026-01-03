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
} from 'lucide-react';
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
          <Button onClick={() => handleOpenPaymentDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Pagamento
          </Button>
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
    </AdminLayout>
  );
}
