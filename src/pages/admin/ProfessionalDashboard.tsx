import { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import {
  Calendar,
  Clock,
  DollarSign,
  TrendingUp,
  Users,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Loader2,
  Star,
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface Professional {
  id: string;
  name: string;
  email: string;
  specialty_id: string;
  crm: string | null;
  bio: string | null;
  avatar_url: string | null;
  rating: number | null;
  review_count: number | null;
}

interface Appointment {
  id: string;
  professional_uuid: string | null;
  patient_name: string;
  patient_email: string;
  patient_phone: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  payment_status: string;
  amount_cents: number;
}

export default function ProfessionalDashboard() {
  const { id } = useParams<{ id: string }>();
  const [professional, setProfessional] = useState<Professional | null>(null);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      if (!id) return;

      const [profRes, apptRes] = await Promise.all([
        supabase.from('professionals').select('*').eq('id', id).maybeSingle(),
        supabase
          .from('appointments')
          .select('*')
          .eq('professional_uuid', id)
          .order('appointment_date', { ascending: false }),
      ]);

      if (profRes.data) {
        setProfessional(profRes.data);
      }

      if (apptRes.data) {
        setAppointments(apptRes.data);
      }

      setLoading(false);
    }

    fetchData();
  }, [id]);

  const stats = useMemo(() => {
    const now = new Date();
    const monthStart = startOfMonth(now);
    const monthEnd = endOfMonth(now);
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 1 });

    const paidAppointments = appointments.filter((a) => a.payment_status === 'paid');
    const monthlyAppointments = paidAppointments.filter((a) => {
      const date = new Date(a.appointment_date);
      return date >= monthStart && date <= monthEnd;
    });
    const weeklyAppointments = paidAppointments.filter((a) => {
      const date = new Date(a.appointment_date);
      return date >= weekStart && date <= weekEnd;
    });

    const totalRevenue = paidAppointments.reduce((sum, a) => sum + a.amount_cents, 0);
    const monthlyRevenue = monthlyAppointments.reduce((sum, a) => sum + a.amount_cents, 0);
    const weeklyRevenue = weeklyAppointments.reduce((sum, a) => sum + a.amount_cents, 0);

    const upcomingAppointments = appointments.filter(
      (a) => new Date(a.appointment_date) >= now && a.payment_status === 'paid'
    );

    return {
      totalAppointments: paidAppointments.length,
      monthlyAppointments: monthlyAppointments.length,
      weeklyAppointments: weeklyAppointments.length,
      totalRevenue,
      monthlyRevenue,
      weeklyRevenue,
      upcomingCount: upcomingAppointments.length,
      upcomingAppointments: upcomingAppointments.slice(0, 5),
    };
  }, [appointments]);

  const chartData = useMemo(() => {
    const days = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
    const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    
    return days.map((day, index) => {
      const date = new Date(weekStart);
      date.setDate(date.getDate() + index);
      const dateStr = format(date, 'yyyy-MM-dd');
      
      const dayAppointments = appointments.filter(
        (a) => a.appointment_date === dateStr && a.payment_status === 'paid'
      );
      
      return {
        day,
        appointments: dayAppointments.length,
        revenue: dayAppointments.reduce((sum, a) => sum + a.amount_cents / 100, 0),
      };
    });
  }, [appointments]);

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-clinic-primary" />
        </div>
      </AdminLayout>
    );
  }

  if (!professional) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <p className="text-clinic-text-muted">Profissional não encontrado</p>
          <Link to="/admin/profissionais">
            <Button variant="ghost" className="mt-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Button>
          </Link>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <Link to="/admin/profissionais">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4" />
              Voltar
            </Button>
          </Link>
          <div className="flex items-center gap-4">
            <img
              src={professional.avatar_url || '/placeholder.svg'}
              alt={professional.name}
              className="h-16 w-16 rounded-xl object-cover"
            />
            <div>
              <h1 className="text-2xl font-bold">{professional.name}</h1>
              <p className="text-clinic-text-secondary">{professional.crm}</p>
              <div className="flex items-center gap-1 mt-1">
                <Star className="h-4 w-4 fill-warning text-warning" />
                <span className="text-sm font-medium">{professional.rating || 5.0}</span>
                <span className="text-sm text-clinic-text-muted">
                  ({professional.review_count || 0} avaliações)
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-background rounded-2xl p-6 shadow-clinic-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="h-12 w-12 rounded-xl bg-clinic-primary/10 flex items-center justify-center">
                <Calendar className="h-6 w-6 text-clinic-primary" />
              </div>
            </div>
            <p className="text-3xl font-bold">{stats.monthlyAppointments}</p>
            <p className="text-sm text-clinic-text-secondary">Consultas este mês</p>
          </div>

          <div className="bg-background rounded-2xl p-6 shadow-clinic-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="h-12 w-12 rounded-xl bg-success/10 flex items-center justify-center">
                <Clock className="h-6 w-6 text-success" />
              </div>
            </div>
            <p className="text-3xl font-bold">{stats.upcomingCount}</p>
            <p className="text-sm text-clinic-text-secondary">Próximas consultas</p>
          </div>

          <div className="bg-background rounded-2xl p-6 shadow-clinic-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="h-12 w-12 rounded-xl bg-warning/10 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-warning" />
              </div>
            </div>
            <p className="text-3xl font-bold">
              R$ {(stats.monthlyRevenue / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-sm text-clinic-text-secondary">Receita do mês</p>
          </div>

          <div className="bg-background rounded-2xl p-6 shadow-clinic-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="h-12 w-12 rounded-xl bg-clinic-primary/10 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-clinic-primary" />
              </div>
            </div>
            <p className="text-3xl font-bold">
              R$ {(stats.totalRevenue / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
            <p className="text-sm text-clinic-text-secondary">Receita total</p>
          </div>
        </div>

        {/* Chart + Upcoming */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Chart */}
          <div className="bg-background rounded-2xl p-6 shadow-clinic-sm">
            <h3 className="font-semibold mb-6">Consultas da Semana</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(210 20% 92%)" />
                  <XAxis dataKey="day" tick={{ fontSize: 12 }} stroke="hsl(215 15% 50%)" />
                  <YAxis tick={{ fontSize: 12 }} stroke="hsl(215 15% 50%)" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(0 0% 100%)',
                      border: '1px solid hsl(210 20% 92%)',
                      borderRadius: '12px',
                    }}
                  />
                  <Bar dataKey="appointments" fill="hsl(197 55% 70%)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Upcoming Appointments */}
          <div className="bg-background rounded-2xl p-6 shadow-clinic-sm">
            <h3 className="font-semibold mb-4">Próximas Consultas</h3>
            {stats.upcomingAppointments.length > 0 ? (
              <div className="space-y-3">
                {stats.upcomingAppointments.map((apt) => (
                  <div
                    key={apt.id}
                    className="flex items-center gap-4 p-3 rounded-lg bg-clinic-surface"
                  >
                    <div className="text-center min-w-[50px]">
                      <p className="text-sm font-semibold">{apt.appointment_time}</p>
                      <p className="text-xs text-clinic-text-muted">
                        {format(new Date(apt.appointment_date), 'dd/MM')}
                      </p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{apt.patient_name}</p>
                      <p className="text-sm text-clinic-text-muted truncate">{apt.patient_email}</p>
                    </div>
                    <div className="flex items-center gap-1 text-xs">
                      {apt.payment_status === 'paid' ? (
                        <CheckCircle2 className="h-4 w-4 text-success" />
                      ) : (
                        <XCircle className="h-4 w-4 text-warning" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-clinic-text-muted">
                <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Nenhuma consulta agendada</p>
              </div>
            )}
          </div>
        </div>

        {/* All Appointments History */}
        <div className="bg-background rounded-2xl shadow-clinic-sm overflow-hidden">
          <div className="p-6 border-b border-clinic-border-subtle">
            <h3 className="font-semibold">Histórico de Consultas</h3>
          </div>
          <div className="divide-y divide-clinic-border-subtle">
            {appointments.slice(0, 10).map((apt) => (
              <div key={apt.id} className="p-4 flex items-center gap-4 hover:bg-clinic-surface/50">
                <div className="text-center min-w-[80px]">
                  <p className="font-semibold">{apt.appointment_time}</p>
                  <p className="text-sm text-clinic-text-muted">
                    {format(new Date(apt.appointment_date), 'dd/MM/yyyy')}
                  </p>
                </div>
                <div className="h-8 w-px bg-clinic-border-subtle" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{apt.patient_name}</p>
                  <p className="text-sm text-clinic-text-muted truncate">{apt.patient_phone}</p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-clinic-primary">
                    R$ {(apt.amount_cents / 100).toFixed(2)}
                  </p>
                  <p className={`text-xs ${apt.payment_status === 'paid' ? 'text-success' : 'text-warning'}`}>
                    {apt.payment_status === 'paid' ? 'Pago' : 'Pendente'}
                  </p>
                </div>
              </div>
            ))}
            {appointments.length === 0 && (
              <div className="p-8 text-center text-clinic-text-muted">
                <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Nenhuma consulta registrada</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
