import { AdminLayout } from '@/components/layout/AdminLayout';
import { dashboardStats, appointments, weeklyAppointmentsData, specialtyDistribution } from '@/data/mockData';
import { 
  Calendar, 
  Users, 
  DollarSign, 
  TrendingUp,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  ArrowRight,
  Phone,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
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

const statusConfig = {
  agendado: { label: 'Agendado', color: 'bg-warning/10 text-warning', icon: Clock },
  confirmado: { label: 'Confirmado', color: 'bg-success/10 text-success', icon: CheckCircle2 },
  'em-atendimento': { label: 'Em Atendimento', color: 'bg-clinic-primary/10 text-clinic-primary', icon: AlertCircle },
  concluido: { label: 'Concluído', color: 'bg-muted text-muted-foreground', icon: CheckCircle2 },
  cancelado: { label: 'Cancelado', color: 'bg-destructive/10 text-destructive', icon: XCircle },
  falta: { label: 'Falta', color: 'bg-destructive/10 text-destructive', icon: XCircle },
};

export default function AdminDashboard() {
  const todayAppointments = appointments.filter((a) => a.date === '2024-12-19');

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Dashboard</h1>
            <p className="text-clinic-text-secondary">
              Visão geral da clínica - Quinta, 19 de Dezembro
            </p>
          </div>
          <Link to="/admin/agenda">
            <Button variant="clinic">
              <Calendar className="h-4 w-4" />
              Ver Agenda Completa
            </Button>
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-background rounded-2xl p-6 shadow-clinic-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="h-12 w-12 rounded-xl bg-clinic-primary/10 flex items-center justify-center">
                <Calendar className="h-6 w-6 text-clinic-primary" />
              </div>
              <span className="text-xs font-medium text-success bg-success/10 px-2 py-1 rounded-full">
                +12%
              </span>
            </div>
            <p className="text-3xl font-bold">{dashboardStats.todayAppointments}</p>
            <p className="text-sm text-clinic-text-secondary">Consultas Hoje</p>
          </div>

          <div className="bg-background rounded-2xl p-6 shadow-clinic-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="h-12 w-12 rounded-xl bg-success/10 flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6 text-success" />
              </div>
              <span className="text-sm font-medium text-clinic-text-muted">
                {Math.round((dashboardStats.confirmedAppointments / dashboardStats.todayAppointments) * 100)}%
              </span>
            </div>
            <p className="text-3xl font-bold">{dashboardStats.confirmedAppointments}</p>
            <p className="text-sm text-clinic-text-secondary">Confirmadas</p>
          </div>

          <div className="bg-background rounded-2xl p-6 shadow-clinic-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="h-12 w-12 rounded-xl bg-warning/10 flex items-center justify-center">
                <Users className="h-6 w-6 text-warning" />
              </div>
              <span className="text-xs font-medium text-success bg-success/10 px-2 py-1 rounded-full">
                +{dashboardStats.newPatientsThisMonth}
              </span>
            </div>
            <p className="text-3xl font-bold">{dashboardStats.totalPatients}</p>
            <p className="text-sm text-clinic-text-secondary">Total de Pacientes</p>
          </div>

          <div className="bg-background rounded-2xl p-6 shadow-clinic-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="h-12 w-12 rounded-xl bg-clinic-primary/10 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-clinic-primary" />
              </div>
              <span className="text-xs font-medium text-success bg-success/10 px-2 py-1 rounded-full flex items-center gap-1">
                <TrendingUp className="h-3 w-3" />
                8%
              </span>
            </div>
            <p className="text-3xl font-bold">
              R$ {(dashboardStats.monthlyRevenue / 1000).toFixed(1)}k
            </p>
            <p className="text-sm text-clinic-text-secondary">Receita do Mês</p>
          </div>
        </div>

        {/* Charts + Appointments */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Chart */}
          <div className="lg:col-span-2 bg-background rounded-2xl p-6 shadow-clinic-sm">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-semibold">Consultas da Semana</h3>
              <select className="text-sm bg-clinic-surface rounded-lg px-3 py-2 border-none outline-none">
                <option>Esta semana</option>
                <option>Semana passada</option>
              </select>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyAppointmentsData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(210 20% 92%)" />
                  <XAxis dataKey="day" tick={{ fontSize: 12 }} stroke="hsl(215 15% 50%)" />
                  <YAxis tick={{ fontSize: 12 }} stroke="hsl(215 15% 50%)" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(0 0% 100%)',
                      border: '1px solid hsl(210 20% 92%)',
                      borderRadius: '12px',
                      boxShadow: '0 4px 6px -1px hsl(220 20% 20% / 0.05)',
                    }}
                  />
                  <Bar dataKey="appointments" fill="hsl(197 55% 70%)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Specialty Distribution */}
          <div className="bg-background rounded-2xl p-6 shadow-clinic-sm">
            <h3 className="font-semibold mb-6">Por Especialidade</h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={specialtyDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {specialtyDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2 mt-4">
              {specialtyDistribution.slice(0, 4).map((item) => (
                <div key={item.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div
                      className="h-3 w-3 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-clinic-text-secondary">{item.name}</span>
                  </div>
                  <span className="font-medium">{item.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Today's Appointments */}
        <div className="bg-background rounded-2xl shadow-clinic-sm overflow-hidden">
          <div className="p-6 border-b border-clinic-border-subtle flex items-center justify-between">
            <h3 className="font-semibold">Consultas de Hoje</h3>
            <Link to="/admin/agenda">
              <Button variant="ghost" size="sm">
                Ver todas
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>

          <div className="divide-y divide-clinic-border-subtle">
            {todayAppointments.slice(0, 6).map((appointment) => {
              const status = statusConfig[appointment.status];
              const StatusIcon = status.icon;

              return (
                <div
                  key={appointment.id}
                  className="p-4 flex items-center gap-4 hover:bg-clinic-surface/50 transition-colors"
                >
                  <div className="text-center min-w-[60px]">
                    <p className="text-lg font-semibold">{appointment.time}</p>
                  </div>

                  <div className="h-10 w-px bg-clinic-border-subtle" />

                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{appointment.patientName}</p>
                    <p className="text-sm text-clinic-text-secondary truncate">
                      {appointment.professionalName} • {appointment.specialty}
                    </p>
                  </div>

                  <div
                    className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${status.color}`}
                  >
                    <StatusIcon className="h-3.5 w-3.5" />
                    {status.label}
                  </div>

                  <a
                    href={`https://wa.me/${appointment.phone.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button variant="ghost" size="icon-sm">
                      <Phone className="h-4 w-4" />
                    </Button>
                  </a>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
