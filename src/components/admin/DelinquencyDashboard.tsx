import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertTriangle,
  TrendingDown,
  User,
  Calendar,
  DollarSign,
  Clock,
  ChevronRight,
  X,
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
  Legend,
} from 'recharts';
import { supabase } from '@/integrations/supabase/client';
import { format, differenceInDays, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface OverduePayment {
  id: string;
  professional_id: string;
  professional_name: string;
  month: number;
  year: number;
  amount_due_cents: number;
  due_date: string;
  days_overdue: number;
}

interface ProfessionalDelinquency {
  professional_id: string;
  professional_name: string;
  total_overdue_cents: number;
  overdue_count: number;
  oldest_overdue_date: string;
  max_days_overdue: number;
}

interface DelinquencyDashboardProps {
  isOpen: boolean;
  onClose: () => void;
}

const MONTHS = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
];

const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6'];

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(cents / 100);
}

export function DelinquencyDashboard({ isOpen, onClose }: DelinquencyDashboardProps) {
  const [loading, setLoading] = useState(true);
  const [overduePayments, setOverduePayments] = useState<OverduePayment[]>([]);
  const [professionalDelinquency, setProfessionalDelinquency] = useState<ProfessionalDelinquency[]>([]);
  const [selectedProfessional, setSelectedProfessional] = useState<string>('all');
  const [monthlyData, setMonthlyData] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen) {
      fetchDelinquencyData();
    }
  }, [isOpen]);

  const fetchDelinquencyData = async () => {
    setLoading(true);
    try {
      const today = new Date().toISOString().split('T')[0];

      // Fetch all overdue payments (pending with due_date in the past)
      const { data: payments, error } = await supabase
        .from('professional_payments')
        .select('*, professionals(id, name)')
        .eq('status', 'pending')
        .lt('due_date', today)
        .order('due_date', { ascending: true });

      if (error) throw error;

      const todayDate = new Date();
      
      // Process overdue payments
      const overdueList: OverduePayment[] = (payments || []).map((p: any) => ({
        id: p.id,
        professional_id: p.professional_id,
        professional_name: p.professionals?.name || 'Desconhecido',
        month: p.month,
        year: p.year,
        amount_due_cents: p.amount_due_cents,
        due_date: p.due_date,
        days_overdue: differenceInDays(todayDate, parseISO(p.due_date)),
      }));

      setOverduePayments(overdueList);

      // Aggregate by professional
      const profMap = new Map<string, ProfessionalDelinquency>();
      overdueList.forEach(payment => {
        const existing = profMap.get(payment.professional_id);
        if (existing) {
          existing.total_overdue_cents += payment.amount_due_cents;
          existing.overdue_count += 1;
          if (payment.days_overdue > existing.max_days_overdue) {
            existing.max_days_overdue = payment.days_overdue;
            existing.oldest_overdue_date = payment.due_date;
          }
        } else {
          profMap.set(payment.professional_id, {
            professional_id: payment.professional_id,
            professional_name: payment.professional_name,
            total_overdue_cents: payment.amount_due_cents,
            overdue_count: 1,
            oldest_overdue_date: payment.due_date,
            max_days_overdue: payment.days_overdue,
          });
        }
      });

      const profDelinquency = Array.from(profMap.values())
        .sort((a, b) => b.total_overdue_cents - a.total_overdue_cents);
      
      setProfessionalDelinquency(profDelinquency);

      // Generate monthly distribution data
      const monthlyMap = new Map<string, number>();
      overdueList.forEach(payment => {
        const key = `${payment.year}-${String(payment.month).padStart(2, '0')}`;
        monthlyMap.set(key, (monthlyMap.get(key) || 0) + payment.amount_due_cents);
      });

      const sortedMonths = Array.from(monthlyMap.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .slice(-6)
        .map(([key, value]) => {
          const [year, month] = key.split('-');
          return {
            month: `${MONTHS[parseInt(month) - 1]}/${year.slice(2)}`,
            value: value / 100,
          };
        });

      setMonthlyData(sortedMonths);

    } catch (error) {
      console.error('Error fetching delinquency data:', error);
    } finally {
      setLoading(false);
    }
  };

  const totalOverdue = overduePayments.reduce((sum, p) => sum + p.amount_due_cents, 0);
  const totalCount = overduePayments.length;
  const avgDaysOverdue = totalCount > 0 
    ? Math.round(overduePayments.reduce((sum, p) => sum + p.days_overdue, 0) / totalCount) 
    : 0;

  const filteredPayments = selectedProfessional === 'all'
    ? overduePayments
    : overduePayments.filter(p => p.professional_id === selectedProfessional);

  const pieData = professionalDelinquency.slice(0, 5).map((p, index) => ({
    name: p.professional_name.split(' ')[0],
    value: p.total_overdue_cents / 100,
    color: COLORS[index % COLORS.length],
  }));

  const getSeverityBadge = (daysOverdue: number) => {
    if (daysOverdue > 60) {
      return <Badge variant="destructive">Crítico ({daysOverdue}d)</Badge>;
    } else if (daysOverdue > 30) {
      return <Badge className="bg-orange-500 hover:bg-orange-600">{daysOverdue} dias</Badge>;
    } else if (daysOverdue > 15) {
      return <Badge className="bg-yellow-500 hover:bg-yellow-600">{daysOverdue} dias</Badge>;
    }
    return <Badge variant="secondary">{daysOverdue} dias</Badge>;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Dashboard de Inadimplência
            </DialogTitle>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 pr-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="p-4 border-destructive/30 bg-destructive/5">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                      <DollarSign className="h-5 w-5 text-destructive" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Total em Atraso</p>
                      <p className="text-xl font-bold text-destructive">{formatCurrency(totalOverdue)}</p>
                    </div>
                  </div>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-orange-100 flex items-center justify-center">
                      <TrendingDown className="h-5 w-5 text-orange-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Pagamentos Atrasados</p>
                      <p className="text-xl font-bold">{totalCount}</p>
                    </div>
                  </div>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-yellow-100 flex items-center justify-center">
                      <User className="h-5 w-5 text-yellow-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Profissionais Inadimplentes</p>
                      <p className="text-xl font-bold">{professionalDelinquency.length}</p>
                    </div>
                  </div>
                </Card>

                <Card className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-red-100 flex items-center justify-center">
                      <Clock className="h-5 w-5 text-red-600" />
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Média de Atraso</p>
                      <p className="text-xl font-bold">{avgDaysOverdue} dias</p>
                    </div>
                  </div>
                </Card>
              </div>

              {/* Charts */}
              {totalCount > 0 && (
                <div className="grid lg:grid-cols-2 gap-6">
                  {/* Bar Chart - Monthly Distribution */}
                  <Card className="p-4">
                    <h3 className="font-semibold mb-4">Evolução de Inadimplência por Mês</h3>
                    <div className="h-[250px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={monthlyData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" fontSize={12} />
                          <YAxis fontSize={12} tickFormatter={(v) => `R$${v}`} />
                          <Tooltip 
                            formatter={(value: number) => [formatCurrency(value * 100), 'Valor']}
                          />
                          <Bar dataKey="value" fill="#ef4444" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>

                  {/* Pie Chart - Distribution by Professional */}
                  <Card className="p-4">
                    <h3 className="font-semibold mb-4">Distribuição por Profissional</h3>
                    <div className="h-[250px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={90}
                            paddingAngle={2}
                            dataKey="value"
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            labelLine={false}
                          >
                            {pieData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value: number) => formatCurrency(value * 100)} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>
                </div>
              )}

              {/* Top Delinquent Professionals */}
              {professionalDelinquency.length > 0 && (
                <Card className="p-4">
                  <h3 className="font-semibold mb-4">Profissionais com Maior Inadimplência</h3>
                  <div className="space-y-3">
                    {professionalDelinquency.slice(0, 5).map((prof, index) => (
                      <div 
                        key={prof.professional_id}
                        className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-destructive/10 flex items-center justify-center text-sm font-bold text-destructive">
                            {index + 1}
                          </div>
                          <div>
                            <p className="font-medium">{prof.professional_name}</p>
                            <p className="text-sm text-muted-foreground">
                              {prof.overdue_count} pagamento{prof.overdue_count > 1 ? 's' : ''} atrasado{prof.overdue_count > 1 ? 's' : ''}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-destructive">{formatCurrency(prof.total_overdue_cents)}</p>
                          {getSeverityBadge(prof.max_days_overdue)}
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* Detailed Table */}
              <Card className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold">Histórico Detalhado de Atrasos</h3>
                  <Select value={selectedProfessional} onValueChange={setSelectedProfessional}>
                    <SelectTrigger className="w-[200px]">
                      <SelectValue placeholder="Filtrar profissional" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os profissionais</SelectItem>
                      {professionalDelinquency.map(prof => (
                        <SelectItem key={prof.professional_id} value={prof.professional_id}>
                          {prof.professional_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {filteredPayments.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <AlertTriangle className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>Nenhum pagamento em atraso encontrado.</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Profissional</TableHead>
                        <TableHead>Referência</TableHead>
                        <TableHead>Vencimento</TableHead>
                        <TableHead>Valor</TableHead>
                        <TableHead>Atraso</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredPayments.map(payment => (
                        <TableRow key={payment.id}>
                          <TableCell className="font-medium">{payment.professional_name}</TableCell>
                          <TableCell>
                            {MONTHS[payment.month - 1]}/{payment.year}
                          </TableCell>
                          <TableCell>
                            {format(parseISO(payment.due_date), 'dd/MM/yyyy')}
                          </TableCell>
                          <TableCell className="font-semibold text-destructive">
                            {formatCurrency(payment.amount_due_cents)}
                          </TableCell>
                          <TableCell>
                            {getSeverityBadge(payment.days_overdue)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </Card>
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
