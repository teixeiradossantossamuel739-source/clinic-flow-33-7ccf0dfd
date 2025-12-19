import { AdminLayout } from '@/components/layout/AdminLayout';
import { dashboardStats, weeklyAppointmentsData, specialtyDistribution } from '@/data/mockData';
import { Button } from '@/components/ui/button';
import {
  Calendar,
  Users,
  DollarSign,
  TrendingUp,
  Download,
  FileText,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { toast } from 'sonner';

const monthlyData = [
  { month: 'Jan', appointments: 180, revenue: 32000 },
  { month: 'Fev', appointments: 210, revenue: 38000 },
  { month: 'Mar', appointments: 195, revenue: 35000 },
  { month: 'Abr', appointments: 240, revenue: 42000 },
  { month: 'Mai', appointments: 220, revenue: 40000 },
  { month: 'Jun', appointments: 260, revenue: 45000 },
];

export default function AdminReports() {
  const handleExport = (type: string) => {
    toast.success(`Relatório ${type} exportado com sucesso!`);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Relatórios</h1>
            <p className="text-clinic-text-secondary">
              Análise de performance e métricas
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => handleExport('PDF')}>
              <FileText className="h-4 w-4" />
              PDF
            </Button>
            <Button variant="clinic" onClick={() => handleExport('Excel')}>
              <Download className="h-4 w-4" />
              Exportar Excel
            </Button>
          </div>
        </div>

        {/* Period Stats */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-background rounded-2xl p-6 shadow-clinic-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="h-12 w-12 rounded-xl bg-clinic-primary/10 flex items-center justify-center">
                <Calendar className="h-6 w-6 text-clinic-primary" />
              </div>
            </div>
            <p className="text-3xl font-bold">{dashboardStats.appointmentsThisWeek}</p>
            <p className="text-sm text-clinic-text-secondary">Consultas esta semana</p>
          </div>

          <div className="bg-background rounded-2xl p-6 shadow-clinic-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="h-12 w-12 rounded-xl bg-success/10 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-success" />
              </div>
            </div>
            <p className="text-3xl font-bold">
              R$ {(dashboardStats.weeklyRevenue / 1000).toFixed(1)}k
            </p>
            <p className="text-sm text-clinic-text-secondary">Receita semanal</p>
          </div>

          <div className="bg-background rounded-2xl p-6 shadow-clinic-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="h-12 w-12 rounded-xl bg-warning/10 flex items-center justify-center">
                <Users className="h-6 w-6 text-warning" />
              </div>
            </div>
            <p className="text-3xl font-bold">{dashboardStats.newPatientsThisMonth}</p>
            <p className="text-sm text-clinic-text-secondary">Novos pacientes (mês)</p>
          </div>

          <div className="bg-background rounded-2xl p-6 shadow-clinic-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="h-12 w-12 rounded-xl bg-clinic-primary/10 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-clinic-primary" />
              </div>
            </div>
            <p className="text-3xl font-bold">{dashboardStats.averageRating}</p>
            <p className="text-sm text-clinic-text-secondary">Avaliação média</p>
          </div>
        </div>

        {/* Charts Row */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Monthly Revenue */}
          <div className="bg-background rounded-2xl p-6 shadow-clinic-sm">
            <h3 className="font-semibold mb-6">Receita Mensal (6 meses)</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(210 20% 92%)" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(215 15% 50%)" />
                  <YAxis tick={{ fontSize: 12 }} stroke="hsl(215 15% 50%)" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(0 0% 100%)',
                      border: '1px solid hsl(210 20% 92%)',
                      borderRadius: '12px',
                    }}
                    formatter={(value: number) => [`R$ ${value.toLocaleString()}`, 'Receita']}
                  />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="hsl(197 55% 70%)"
                    strokeWidth={3}
                    dot={{ fill: 'hsl(197 55% 70%)', strokeWidth: 2 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Monthly Appointments */}
          <div className="bg-background rounded-2xl p-6 shadow-clinic-sm">
            <h3 className="font-semibold mb-6">Consultas por Mês</h3>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(210 20% 92%)" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(215 15% 50%)" />
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
        </div>

        {/* Bottom Row */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Specialty Distribution */}
          <div className="bg-background rounded-2xl p-6 shadow-clinic-sm">
            <h3 className="font-semibold mb-6">Consultas por Especialidade</h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={specialtyDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
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
              {specialtyDistribution.map((item) => (
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

          {/* Weekly Performance */}
          <div className="lg:col-span-2 bg-background rounded-2xl p-6 shadow-clinic-sm">
            <h3 className="font-semibold mb-6">Performance Semanal</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyAppointmentsData} barGap={8}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(210 20% 92%)" />
                  <XAxis dataKey="day" tick={{ fontSize: 12 }} stroke="hsl(215 15% 50%)" />
                  <YAxis yAxisId="left" tick={{ fontSize: 12 }} stroke="hsl(215 15% 50%)" />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12 }} stroke="hsl(215 15% 50%)" />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'hsl(0 0% 100%)',
                      border: '1px solid hsl(210 20% 92%)',
                      borderRadius: '12px',
                    }}
                  />
                  <Bar yAxisId="left" dataKey="appointments" fill="hsl(197 55% 70%)" radius={[4, 4, 0, 0]} name="Consultas" />
                  <Bar yAxisId="right" dataKey="revenue" fill="hsl(152 60% 45%)" radius={[4, 4, 0, 0]} name="Receita (R$)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex justify-center gap-6 mt-4">
              <div className="flex items-center gap-2 text-sm">
                <div className="h-3 w-3 rounded-full bg-clinic-primary" />
                <span className="text-clinic-text-secondary">Consultas</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className="h-3 w-3 rounded-full bg-success" />
                <span className="text-clinic-text-secondary">Receita (R$)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
