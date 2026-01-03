import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { DollarSign, TrendingUp, Users, Calendar, Filter, UserCheck, ArrowUp, ArrowDown, Minus, Target, Pencil, FileDown, PieChart } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine, Cell, PieChart as RechartsPieChart, Pie } from 'recharts';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import jsPDF from 'jspdf';

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
  previousEarnings?: number;
  previousAppointments?: number;
  goalAmount?: number;
  goalId?: string;
}

interface MonthlyChartData {
  month: string;
  [professionalId: string]: number | string;
}

interface SpecialtyData {
  specialty: string;
  label: string;
  revenue: number;
  appointments: number;
  averageTicket: number;
  professionalsCount: number;
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
  const [selectedProfessionals, setSelectedProfessionals] = useState<string[]>([]);
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('all');
  const [specialties, setSpecialties] = useState<string[]>([]);
  const [previousMonthTotals, setPreviousMonthTotals] = useState<{ revenue: number; appointments: number }>({ revenue: 0, appointments: 0 });
  const [goalsDialogOpen, setGoalsDialogOpen] = useState(false);
  const [goalInputs, setGoalInputs] = useState<Record<string, string>>({});
  const [savingGoals, setSavingGoals] = useState(false);

  const checkGoalAchievement = async (professionalId: string, professionalName: string, currentEarnings: number, goalAmount: number, year: number, month: number) => {
    const monthName = format(new Date(year, month - 1), 'MMMM yyyy', { locale: ptBR });

    // Check if notification already exists for this goal achievement this month
    const { data: existingNotif } = await supabase
      .from('notifications')
      .select('id')
      .eq('professional_id', professionalId)
      .eq('type', 'goal_achieved')
      .gte('created_at', startOfMonth(new Date(year, month - 1)).toISOString())
      .lte('created_at', endOfMonth(new Date(year, month - 1)).toISOString())
      .limit(1);

    if (existingNotif && existingNotif.length > 0) return; // Already notified

    // Create notification in database
    await supabase.from('notifications').insert({
      professional_id: professionalId,
      type: 'goal_achieved',
      title: '🎉 Meta Atingida!',
      message: `Parabéns! Você atingiu sua meta de ${formatCurrency(goalAmount)} em ${monthName}. Faturamento atual: ${formatCurrency(currentEarnings)}`,
    });

    // Fetch professional phone for WhatsApp
    const { data: profData } = await supabase
      .from('professionals')
      .select('phone')
      .eq('id', professionalId)
      .single();

    if (profData?.phone) {
      try {
        const { data: whatsappData } = await supabase.functions.invoke('whatsapp-notify', {
          body: {
            professionalPhone: profData.phone,
            patientName: professionalName,
            appointmentDate: '',
            appointmentTime: '',
            appointmentId: '',
            type: 'goal_achieved',
            goalAmountCents: goalAmount,
            currentEarningsCents: currentEarnings,
            monthName,
          },
        });

        if (whatsappData?.whatsappLink) {
          // Open WhatsApp link for admin to send
          window.open(whatsappData.whatsappLink, '_blank');
          toast.success(`Link do WhatsApp gerado para ${professionalName}!`);
        }
      } catch (error) {
        console.error('Error generating WhatsApp link:', error);
      }
    }
  };

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
      
      // Extract unique specialties
      const uniqueSpecialties = [...new Set((profData || []).map(p => p.specialty_id))].filter(Boolean);
      setSpecialties(uniqueSpecialties);
      
      // Initialize selected professionals if empty
      if (selectedProfessionals.length === 0 && profData && profData.length > 0) {
        setSelectedProfessionals(profData.map(p => p.id));
      }

      // Fetch goals for the selected month
      const { data: goalsData } = await supabase
        .from('professional_goals')
        .select('id, professional_id, goal_amount_cents')
        .eq('month', month)
        .eq('year', year);

      const goalsMap = new Map<string, { amount: number; id: string }>();
      (goalsData || []).forEach((goal) => {
        goalsMap.set(goal.professional_id, { amount: goal.goal_amount_cents, id: goal.id });
      });

      // Fetch completed appointments in the month
      const { data: appointments } = await supabase
        .from('appointments')
        .select('professional_uuid, amount_cents, status, payment_status')
        .gte('appointment_date', format(startDate, 'yyyy-MM-dd'))
        .lte('appointment_date', format(endDate, 'yyyy-MM-dd'))
        .eq('status', 'completed')
        .eq('payment_status', 'paid');

      // Fetch previous month data for comparison
      const prevMonthDate = subMonths(new Date(year, month - 1), 1);
      const prevStartDate = startOfMonth(prevMonthDate);
      const prevEndDate = endOfMonth(prevMonthDate);

      const { data: prevAppointments } = await supabase
        .from('appointments')
        .select('professional_uuid, amount_cents, status, payment_status')
        .gte('appointment_date', format(prevStartDate, 'yyyy-MM-dd'))
        .lte('appointment_date', format(prevEndDate, 'yyyy-MM-dd'))
        .eq('status', 'completed')
        .eq('payment_status', 'paid');

      // Calculate previous month totals
      const prevTotal = (prevAppointments || []).reduce((sum, apt) => sum + apt.amount_cents, 0);
      const prevCount = (prevAppointments || []).length;
      setPreviousMonthTotals({ revenue: prevTotal, appointments: prevCount });

      // Calculate previous earnings per professional
      const prevEarningsMap = new Map<string, { total: number; count: number }>();
      (prevAppointments || []).forEach((apt) => {
        if (apt.professional_uuid) {
          const current = prevEarningsMap.get(apt.professional_uuid) || { total: 0, count: 0 };
          prevEarningsMap.set(apt.professional_uuid, {
            total: current.total + apt.amount_cents,
            count: current.count + 1,
          });
        }
      });

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
        const prevData = prevEarningsMap.get(prof.id) || { total: 0, count: 0 };
        const goal = goalsMap.get(prof.id);
        return {
          professional: prof,
          totalEarnings: data.total,
          appointmentCount: data.count,
          averageTicket: data.count > 0 ? data.total / data.count : 0,
          previousEarnings: prevData.total,
          previousAppointments: prevData.count,
          goalAmount: goal?.amount,
          goalId: goal?.id,
        };
      });

      // Sort by earnings (highest first)
      earningsArray.sort((a, b) => b.totalEarnings - a.totalEarnings);

      setEarnings(earningsArray);

      // Check for goal achievements and send notifications
      for (const earning of earningsArray) {
        if (earning.goalAmount && earning.totalEarnings >= earning.goalAmount) {
          await checkGoalAchievement(earning.professional.id, earning.professional.name, earning.totalEarnings, earning.goalAmount, year, month);
        }
      }
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

  // Filter earnings by specialty
  const getFilteredEarnings = () => earnings.filter(e => 
    selectedSpecialty === 'all' || e.professional.specialty_id === selectedSpecialty
  );

  const filteredEarningsForCalc = getFilteredEarnings();
  const totalRevenue = filteredEarningsForCalc.reduce((sum, e) => sum + e.totalEarnings, 0);
  const totalAppointments = filteredEarningsForCalc.reduce((sum, e) => sum + e.appointmentCount, 0);

  const revenueVariation = previousMonthTotals.revenue > 0 
    ? ((totalRevenue - previousMonthTotals.revenue) / previousMonthTotals.revenue) * 100 
    : totalRevenue > 0 ? 100 : 0;
  
  const appointmentsVariation = previousMonthTotals.appointments > 0 
    ? ((totalAppointments - previousMonthTotals.appointments) / previousMonthTotals.appointments) * 100 
    : totalAppointments > 0 ? 100 : 0;

  const specialtyLabels: Record<string, string> = {
    'cardiologia': 'Cardiologia',
    'dermatologia': 'Dermatologia',
    'ortopedia': 'Ortopedia',
    'pediatria': 'Pediatria',
    'psicologia': 'Psicologia',
    'nutricao': 'Nutrição',
    'fisioterapia': 'Fisioterapia',
    'clinica-geral': 'Clínica Geral',
    'ginecologia': 'Ginecologia',
    'neurologia': 'Neurologia',
  };

  // Calculate specialty comparison data
  const specialtyComparisonData: SpecialtyData[] = specialties.map(spec => {
    const specProfessionals = earnings.filter(e => e.professional.specialty_id === spec);
    const revenue = specProfessionals.reduce((sum, e) => sum + e.totalEarnings, 0);
    const appointments = specProfessionals.reduce((sum, e) => sum + e.appointmentCount, 0);
    return {
      specialty: spec,
      label: specialtyLabels[spec] || spec,
      revenue,
      appointments,
      averageTicket: appointments > 0 ? revenue / appointments : 0,
      professionalsCount: specProfessionals.length,
    };
  }).sort((a, b) => b.revenue - a.revenue);

  const totalSpecialtyRevenue = specialtyComparisonData.reduce((sum, s) => sum + s.revenue, 0);

  const getVariationIcon = (variation: number) => {
    if (variation > 0) return <ArrowUp className="h-4 w-4 text-green-500" />;
    if (variation < 0) return <ArrowDown className="h-4 w-4 text-red-500" />;
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  const getVariationColor = (variation: number) => {
    if (variation > 0) return 'text-green-500';
    if (variation < 0) return 'text-red-500';
    return 'text-muted-foreground';
  };

  const openGoalsDialog = () => {
    const inputs: Record<string, string> = {};
    earnings.forEach(e => {
      inputs[e.professional.id] = e.goalAmount ? (e.goalAmount / 100).toString() : '';
    });
    setGoalInputs(inputs);
    setGoalsDialogOpen(true);
  };

  const checkAndNotifyGoalAchieved = async (professionalId: string, professionalName: string, currentEarnings: number, goalAmount: number) => {
    // Only notify if goal is achieved
    if (currentEarnings < goalAmount) return;

    const [year, month] = selectedMonth.split('-').map(Number);
    const monthName = format(new Date(year, month - 1), 'MMMM yyyy', { locale: ptBR });

    // Check if notification already exists for this goal achievement
    const { data: existingNotif } = await supabase
      .from('notifications')
      .select('id')
      .eq('professional_id', professionalId)
      .eq('type', 'goal_achieved')
      .gte('created_at', startOfMonth(new Date(year, month - 1)).toISOString())
      .lte('created_at', endOfMonth(new Date(year, month - 1)).toISOString())
      .limit(1);

    if (existingNotif && existingNotif.length > 0) return; // Already notified

    // Create notification
    await supabase.from('notifications').insert({
      professional_id: professionalId,
      type: 'goal_achieved',
      title: '🎉 Meta Atingida!',
      message: `Parabéns! Você atingiu sua meta de ${formatCurrency(goalAmount)} em ${monthName}. Faturamento atual: ${formatCurrency(currentEarnings)}`,
    });
  };

  const handleSaveGoals = async () => {
    setSavingGoals(true);
    try {
      const [year, month] = selectedMonth.split('-').map(Number);
      
      for (const earning of earnings) {
        const inputValue = goalInputs[earning.professional.id];
        const goalCents = inputValue ? Math.round(parseFloat(inputValue) * 100) : 0;
        const previousGoal = earning.goalAmount || 0;
        
        if (goalCents > 0) {
          if (earning.goalId) {
            // Update existing goal
            await supabase
              .from('professional_goals')
              .update({ goal_amount_cents: goalCents })
              .eq('id', earning.goalId);
          } else {
            // Insert new goal
            await supabase
              .from('professional_goals')
              .insert({
                professional_id: earning.professional.id,
                month,
                year,
                goal_amount_cents: goalCents,
              });
          }

          // Check if goal was just set or lowered and now earnings meet the goal
          if (earning.totalEarnings >= goalCents && (previousGoal === 0 || goalCents < previousGoal)) {
            await checkAndNotifyGoalAchieved(
              earning.professional.id,
              earning.professional.name,
              earning.totalEarnings,
              goalCents
            );
          }
        } else if (earning.goalId) {
          // Delete goal if value is 0 or empty
          await supabase
            .from('professional_goals')
            .delete()
            .eq('id', earning.goalId);
        }
      }

      toast.success('Metas salvas com sucesso!');
      setGoalsDialogOpen(false);
      fetchData();
    } catch (error) {
      console.error('Error saving goals:', error);
      toast.error('Erro ao salvar metas');
    } finally {
      setSavingGoals(false);
    }
  };

  const toggleProfessional = (profId: string) => {
    setSelectedProfessionals(prev => 
      prev.includes(profId) 
        ? prev.filter(id => id !== profId)
        : [...prev, profId]
    );
  };

  const toggleAllProfessionals = () => {
    if (selectedProfessionals.length === professionals.length) {
      setSelectedProfessionals([]);
    } else {
      setSelectedProfessionals(professionals.map(p => p.id));
    }
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    const [year, month] = selectedMonth.split('-').map(Number);
    const monthLabel = format(new Date(year, month - 1), 'MMMM yyyy', { locale: ptBR });
    
    // Title
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('Relatório Financeiro', 105, 20, { align: 'center' });
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1), 105, 28, { align: 'center' });
    
    // Summary section
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Resumo Geral', 14, 45);
    
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`Receita Total: ${formatCurrency(totalRevenue)}`, 14, 55);
    doc.text(`Consultas Realizadas: ${totalAppointments}`, 14, 62);
    doc.text(`Profissionais Ativos: ${professionals.length}`, 14, 69);
    doc.text(`Variação vs mês anterior: ${revenueVariation >= 0 ? '+' : ''}${revenueVariation.toFixed(1)}%`, 14, 76);
    
    // Evolution Chart Section
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Evolução Mensal (últimos 6 meses)', 14, 92);
    
    if (monthlyChartData.length > 0 && filteredProfessionals.length > 0) {
      const chartStartY = 100;
      const chartHeight = 50;
      const chartWidth = 180;
      const barGroupWidth = chartWidth / monthlyChartData.length;
      
      // Find max value for scaling
      let maxValue = 0;
      monthlyChartData.forEach(data => {
        filteredProfessionals.forEach(prof => {
          const val = data[prof.id] as number || 0;
          if (val > maxValue) maxValue = val;
        });
      });
      
      if (maxValue > 0) {
        // Draw Y-axis labels
        doc.setFontSize(7);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 100, 100);
        doc.text(formatCurrency(maxValue * 100), 14, chartStartY);
        doc.text(formatCurrency((maxValue / 2) * 100), 14, chartStartY + chartHeight / 2);
        doc.text('R$ 0', 14, chartStartY + chartHeight);
        
        // Draw bars
        const colors = [
          [99, 102, 241],   // Primary blue
          [34, 197, 94],    // Green
          [59, 130, 246],   // Blue
          [168, 85, 247],   // Purple
          [249, 115, 22],   // Orange
          [239, 68, 68],    // Red
        ];
        
        monthlyChartData.forEach((data, monthIndex) => {
          const groupX = 30 + monthIndex * barGroupWidth;
          const barWidth = Math.min(12, (barGroupWidth - 8) / Math.max(filteredProfessionals.length, 1));
          
          filteredProfessionals.slice(0, 4).forEach((prof, profIndex) => {
            const value = data[prof.id] as number || 0;
            const barHeight = (value / maxValue) * chartHeight;
            const barX = groupX + profIndex * (barWidth + 2);
            const barY = chartStartY + chartHeight - barHeight;
            
            const color = colors[profIndex % colors.length];
            doc.setFillColor(color[0], color[1], color[2]);
            doc.rect(barX, barY, barWidth, barHeight, 'F');
          });
          
          // Month label
          doc.setFontSize(7);
          doc.setTextColor(80, 80, 80);
          doc.text(data.month, groupX + barGroupWidth / 2 - 8, chartStartY + chartHeight + 6);
        });
        
        // Legend
        doc.setFontSize(7);
        let legendX = 14;
        const legendY = chartStartY + chartHeight + 15;
        filteredProfessionals.slice(0, 4).forEach((prof, index) => {
          const color = colors[index % colors.length];
          doc.setFillColor(color[0], color[1], color[2]);
          doc.rect(legendX, legendY - 3, 4, 4, 'F');
          doc.setTextColor(60, 60, 60);
          doc.text(prof.name.substring(0, 15), legendX + 6, legendY);
          legendX += 45;
        });
      }
    }
    
    // Table header
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Detalhamento por Profissional', 14, 175);
    
    // Table
    const tableStartY = 185;
    const colWidths = [60, 35, 30, 35, 30];
    const headers = ['Profissional', 'Faturamento', 'Consultas', 'Ticket Médio', 'Meta'];
    
    // Draw header
    doc.setFillColor(240, 240, 240);
    doc.rect(14, tableStartY - 6, 182, 10, 'F');
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    
    let xPos = 14;
    headers.forEach((header, i) => {
      doc.text(header, xPos + 2, tableStartY);
      xPos += colWidths[i];
    });
    
    // Draw rows
    doc.setFont('helvetica', 'normal');
    let yPos = tableStartY + 10;
    
    earnings.forEach((earning, index) => {
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }
      
      // Alternate row background
      if (index % 2 === 0) {
        doc.setFillColor(250, 250, 250);
        doc.rect(14, yPos - 5, 182, 8, 'F');
      }
      
      xPos = 14;
      const row = [
        earning.professional.name.substring(0, 25),
        formatCurrency(earning.totalEarnings),
        earning.appointmentCount.toString(),
        formatCurrency(earning.averageTicket),
        earning.goalAmount ? formatCurrency(earning.goalAmount) : '-'
      ];
      
      row.forEach((cell, i) => {
        doc.text(cell, xPos + 2, yPos);
        xPos += colWidths[i];
      });
      
      // Goal status indicator
      if (earning.goalAmount && earning.totalEarnings >= earning.goalAmount) {
        doc.setTextColor(34, 197, 94);
        doc.text('OK', xPos - 8, yPos);
        doc.setTextColor(0, 0, 0);
      }
      
      yPos += 8;
    });
    
    // Footer
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text(`Gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm")}`, 14, 285);
    
    // Save
    doc.save(`relatorio-financeiro-${selectedMonth}.pdf`);
    toast.success('Relatório exportado com sucesso!');
  };

  const filteredProfessionals = professionals.filter(p => 
    selectedProfessionals.includes(p.id) && 
    (selectedSpecialty === 'all' || p.specialty_id === selectedSpecialty)
  );


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

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={exportToPDF}
              className="gap-2"
            >
              <FileDown className="h-4 w-4" />
              Exportar PDF
            </Button>
            <Filter className="h-4 w-4 text-clinic-text-muted" />
            <Select value={selectedSpecialty} onValueChange={setSelectedSpecialty}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Especialidade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {specialties.map((spec) => (
                  <SelectItem key={spec} value={spec}>
                    {specialtyLabels[spec] || spec}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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

        {/* Summary Cards with Comparison */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-green-500/10">
                    <DollarSign className="h-6 w-6 text-green-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Receita Total</p>
                    <p className="text-2xl font-bold">{formatCurrency(totalRevenue)}</p>
                  </div>
                </div>
                <div className={`flex items-center gap-1 ${getVariationColor(revenueVariation)}`}>
                  {getVariationIcon(revenueVariation)}
                  <span className="text-sm font-medium">{Math.abs(revenueVariation).toFixed(1)}%</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                vs mês anterior: {formatCurrency(previousMonthTotals.revenue)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-xl bg-blue-500/10">
                    <Calendar className="h-6 w-6 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Consultas Realizadas</p>
                    <p className="text-2xl font-bold">{totalAppointments}</p>
                  </div>
                </div>
                <div className={`flex items-center gap-1 ${getVariationColor(appointmentsVariation)}`}>
                  {getVariationIcon(appointmentsVariation)}
                  <span className="text-sm font-medium">{Math.abs(appointmentsVariation).toFixed(1)}%</span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                vs mês anterior: {previousMonthTotals.appointments} consultas
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-purple-500/10">
                  <Users className="h-6 w-6 text-purple-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Profissionais Ativos</p>
                  <p className="text-2xl font-bold">{professionals.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Monthly Evolution Chart */}
        <Card>
          <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Evolução Mensal de Ganhos
            </CardTitle>
            
            {/* Professional Filter */}
            {professionals.length > 0 && (
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <UserCheck className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Filtrar:</span>
                </div>
                <div 
                  className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 px-2 py-1 rounded"
                  onClick={toggleAllProfessionals}
                >
                  <Checkbox 
                    checked={selectedProfessionals.length === professionals.length}
                    className="h-4 w-4"
                  />
                  <span className="text-sm font-medium">Todos</span>
                </div>
                {professionals.map((prof, index) => (
                  <div 
                    key={prof.id}
                    className="flex items-center gap-2 cursor-pointer hover:bg-muted/50 px-2 py-1 rounded"
                    onClick={() => toggleProfessional(prof.id)}
                  >
                    <Checkbox 
                      checked={selectedProfessionals.includes(prof.id)}
                      className="h-4 w-4"
                    />
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                    />
                    <span className="text-sm">{prof.name.split(' ')[0]}</span>
                  </div>
                ))}
              </div>
            )}
          </CardHeader>
          <CardContent>
            {professionals.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum profissional encontrado
              </div>
            ) : filteredProfessionals.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Selecione ao menos um profissional
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
                      selectedProfessionals.includes(prof.id) && (
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
                      )
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Comparison Bar Chart with Goals */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Comparativo: Mês Atual vs Mês Anterior vs Meta
            </CardTitle>
            <Dialog open={goalsDialogOpen} onOpenChange={setGoalsDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" onClick={openGoalsDialog}>
                  <Target className="h-4 w-4 mr-2" />
                  Definir Metas
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Definir Metas - {monthOptions.find(m => m.value === selectedMonth)?.label}
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  {earnings.map((e) => (
                    <div key={e.professional.id} className="flex items-center gap-4">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {e.professional.avatar_url ? (
                          <img
                            src={e.professional.avatar_url}
                            alt={e.professional.name}
                            className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium flex-shrink-0">
                            {e.professional.name.charAt(0)}
                          </div>
                        )}
                        <span className="font-medium truncate">{e.professional.name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Label className="text-muted-foreground">R$</Label>
                        <Input
                          type="number"
                          placeholder="0,00"
                          className="w-28"
                          value={goalInputs[e.professional.id] || ''}
                          onChange={(ev) => setGoalInputs(prev => ({
                            ...prev,
                            [e.professional.id]: ev.target.value
                          }))}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setGoalsDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleSaveGoals} disabled={savingGoals}>
                    {savingGoals ? 'Salvando...' : 'Salvar Metas'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {earnings.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum profissional encontrado
              </div>
            ) : (
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart 
                    data={filteredEarningsForCalc.map(e => ({
                      name: e.professional.name.split(' ')[0],
                      'Mês Atual': e.totalEarnings / 100,
                      'Mês Anterior': (e.previousEarnings || 0) / 100,
                      'Meta': e.goalAmount ? e.goalAmount / 100 : null,
                      goalReached: e.goalAmount ? e.totalEarnings >= e.goalAmount : null,
                    }))}
                    layout="vertical"
                    margin={{ left: 20, right: 30 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis 
                      type="number"
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                      tickFormatter={(value) => `R$ ${value.toLocaleString('pt-BR')}`}
                    />
                    <YAxis 
                      type="category"
                      dataKey="name"
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                      width={80}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'hsl(var(--background))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                      formatter={(value: number | null, name: string) => {
                        if (value === null) return ['Não definida', name];
                        return [`R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, name];
                      }}
                    />
                    <Legend />
                    <Bar 
                      dataKey="Mês Atual" 
                      radius={[0, 4, 4, 0]}
                    >
                      {filteredEarningsForCalc.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`}
                          fill={entry.goalAmount && entry.totalEarnings >= entry.goalAmount 
                            ? 'hsl(142, 76%, 36%)' 
                            : 'hsl(var(--primary))'
                          }
                        />
                      ))}
                    </Bar>
                    <Bar 
                      dataKey="Mês Anterior" 
                      fill="hsl(var(--muted-foreground))" 
                      radius={[0, 4, 4, 0]}
                      opacity={0.5}
                    />
                    <Bar 
                      dataKey="Meta" 
                      fill="hsl(38, 92%, 50%)" 
                      radius={[0, 4, 4, 0]}
                      opacity={0.8}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
            <div className="flex items-center justify-center gap-6 mt-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-primary" />
                <span className="text-muted-foreground">Abaixo da meta</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: 'hsl(142, 76%, 36%)' }} />
                <span className="text-muted-foreground">Meta atingida</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: 'hsl(38, 92%, 50%)' }} />
                <span className="text-muted-foreground">Meta definida</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Specialty Comparison */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5" />
              Comparativo por Especialidade
            </CardTitle>
          </CardHeader>
          <CardContent>
            {specialtyComparisonData.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma especialidade encontrada
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Pie Chart */}
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={specialtyComparisonData}
                        dataKey="revenue"
                        nameKey="label"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label={({ label, percent }) => `${label} (${(percent * 100).toFixed(0)}%)`}
                        labelLine={true}
                      >
                        {specialtyComparisonData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: 'hsl(var(--background))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '8px',
                        }}
                        formatter={(value: number) => [`${formatCurrency(value)}`, 'Receita']}
                      />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>

                {/* Specialty Table */}
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-3 px-4 text-sm font-medium text-muted-foreground">
                          Especialidade
                        </th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">
                          Receita
                        </th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">
                          %
                        </th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">
                          Consultas
                        </th>
                        <th className="text-right py-3 px-4 text-sm font-medium text-muted-foreground">
                          Ticket Médio
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {specialtyComparisonData.map((item, index) => (
                        <tr
                          key={item.specialty}
                          className="border-b border-border last:border-0 hover:bg-muted/50 transition-colors"
                        >
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <div 
                                className="w-3 h-3 rounded-full" 
                                style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                              />
                              <span className="font-medium">{item.label}</span>
                              <span className="text-xs text-muted-foreground">
                                ({item.professionalsCount} prof.)
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right font-semibold text-green-500">
                            {formatCurrency(item.revenue)}
                          </td>
                          <td className="py-3 px-4 text-right text-muted-foreground">
                            {totalSpecialtyRevenue > 0 
                              ? ((item.revenue / totalSpecialtyRevenue) * 100).toFixed(1)
                              : 0}%
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-blue-500/10 text-blue-500 text-sm">
                              {item.appointments}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right text-muted-foreground">
                            {formatCurrency(item.averageTicket)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
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
                    {filteredEarningsForCalc.map((item, index) => (
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
