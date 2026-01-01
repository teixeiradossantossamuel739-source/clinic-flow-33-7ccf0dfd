import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  Calendar,
  Clock,
  Search,
  Loader2,
  User,
  Mail,
  Phone,
  X,
  RefreshCw,
  Eye,
  CreditCard,
  FileText,
  Download,
  Pencil,
} from 'lucide-react';
import { format, addDays, isBefore, startOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import jsPDF from 'jspdf';

interface Service {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number;
  price_cents: number;
}

interface Appointment {
  id: string;
  patient_name: string;
  patient_email: string;
  patient_phone: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  payment_status: string;
  amount_cents: number;
  professional_uuid: string | null;
  service_id: string | null;
}

interface Professional {
  id: string;
  name: string;
  phone: string | null;
}

const statusConfig: Record<string, { label: string; className: string }> = {
  pending: { 
    label: 'Aguardando', 
    className: 'bg-warning/20 text-warning border-warning/30'
  },
  awaiting_confirmation: { 
    label: 'Em análise', 
    className: 'bg-orange-100 text-orange-700 border-orange-300'
  },
  confirmed: { 
    label: 'Confirmado', 
    className: 'bg-success/20 text-success border-success/30'
  },
  cancelled: { 
    label: 'Cancelado', 
    className: 'bg-destructive/20 text-destructive border-destructive/30'
  },
  rescheduled: { 
    label: 'Reagendando', 
    className: 'bg-clinic-primary/20 text-clinic-primary border-clinic-primary/30'
  },
  completed: { 
    label: 'Concluído', 
    className: 'bg-muted text-muted-foreground border-border'
  },
};

type StatusFilter = 'all' | 'confirmed' | 'cancelled' | 'completed' | 'pending';

const filterOptions: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'confirmed', label: 'Confirmados' },
  { value: 'pending', label: 'Aguardando' },
  { value: 'cancelled', label: 'Cancelados' },
  { value: 'completed', label: 'Concluídos' },
];

export default function MinhasConsultas() {
  const { user, profile } = useAuth();
  const [email, setEmail] = useState('');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [cancelling, setCancelling] = useState(false);
  
  // Reschedule state
  const [rescheduleDialogOpen, setRescheduleDialogOpen] = useState(false);
  const [rescheduleDate, setRescheduleDate] = useState<Date | undefined>(undefined);
  const [rescheduleTime, setRescheduleTime] = useState<string | null>(null);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [rescheduling, setRescheduling] = useState(false);

  // Details modal state
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);

  // Edit profile state
  const [editProfileDialogOpen, setEditProfileDialogOpen] = useState(false);
  const [editFullName, setEditFullName] = useState('');
  const [editWhatsapp, setEditWhatsapp] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  // Auto-fetch for logged-in users
  useEffect(() => {
    if (user?.email) {
      setEmail(user.email);
      fetchAppointments(user.email);
    }
  }, [user?.email]);

  const fetchAppointments = async (searchEmail: string) => {
    setLoading(true);
    setSearched(true);

    const [apptRes, profRes, servRes] = await Promise.all([
      supabase
        .from('appointments')
        .select('*')
        .eq('patient_email', searchEmail.toLowerCase().trim())
        .order('appointment_date', { ascending: false }),
      supabase.from('professionals').select('id, name, phone'),
      supabase.from('services').select('id, name, description, duration_minutes, price_cents'),
    ]);

    if (apptRes.error) {
      toast.error('Erro ao buscar consultas');
      console.error(apptRes.error);
    } else {
      setAppointments(apptRes.data || []);
    }

    if (profRes.data) {
      setProfessionals(profRes.data);
    }

    if (servRes.data) {
      setServices(servRes.data);
    }

    setLoading(false);
  };

  const handleSearch = async () => {
    if (!email.trim()) {
      toast.error('Por favor, insira seu email');
      return;
    }
    fetchAppointments(email);
  };

  const getProfessionalName = (uuid: string | null) => {
    if (!uuid) return 'Profissional não definido';
    const prof = professionals.find((p) => p.id === uuid);
    return prof?.name || 'Profissional';
  };

  const getService = (serviceId: string | null) => {
    if (!serviceId) return null;
    return services.find((s) => s.id === serviceId) || null;
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes} minutos`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
  };

  const canModifyAppointment = (status: string) => {
    return ['pending', 'confirmed', 'awaiting_confirmation'].includes(status);
  };

  const handleRescheduleClick = (apt: Appointment) => {
    setSelectedAppointment(apt);
    setRescheduleDate(undefined);
    setRescheduleTime(null);
    setAvailableSlots([]);
    setRescheduleDialogOpen(true);
  };

  const fetchAvailableSlots = async (date: Date, professionalId: string) => {
    setLoadingSlots(true);
    setAvailableSlots([]);
    setRescheduleTime(null);

    const dayOfWeek = date.getDay();
    const dateStr = format(date, 'yyyy-MM-dd');

    // Fetch professional schedule for this day
    const { data: schedules } = await supabase
      .from('professional_schedules')
      .select('*')
      .eq('professional_id', professionalId)
      .eq('day_of_week', dayOfWeek)
      .eq('is_active', true);

    if (!schedules || schedules.length === 0) {
      setLoadingSlots(false);
      return;
    }

    // Fetch existing appointments for this date
    const { data: existingAppts } = await supabase
      .from('appointments')
      .select('appointment_time')
      .eq('professional_uuid', professionalId)
      .eq('appointment_date', dateStr)
      .in('status', ['pending', 'confirmed', 'awaiting_confirmation']);

    const bookedTimes = new Set((existingAppts || []).map((a) => a.appointment_time));

    // Fetch blocked times
    const { data: blockedTimes } = await supabase
      .from('professional_blocked_times')
      .select('*')
      .eq('professional_id', professionalId)
      .eq('block_date', dateStr);

    // Generate available slots
    const slots: string[] = [];
    for (const schedule of schedules) {
      const [startH, startM] = schedule.start_time.split(':').map(Number);
      const [endH, endM] = schedule.end_time.split(':').map(Number);
      const slotDuration = schedule.slot_duration_minutes || 30;

      let currentMinutes = startH * 60 + startM;
      const endMinutes = endH * 60 + endM;

      while (currentMinutes + slotDuration <= endMinutes) {
        const h = Math.floor(currentMinutes / 60);
        const m = currentMinutes % 60;
        const timeStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;

        // Check if not booked
        if (!bookedTimes.has(timeStr) && !bookedTimes.has(`${timeStr}:00`)) {
          // Check if not blocked
          const isBlocked = (blockedTimes || []).some((block) => {
            if (!block.start_time || !block.end_time) return true; // Full day block
            const blockStart = block.start_time.substring(0, 5);
            const blockEnd = block.end_time.substring(0, 5);
            return timeStr >= blockStart && timeStr < blockEnd;
          });

          if (!isBlocked) {
            slots.push(timeStr);
          }
        }

        currentMinutes += slotDuration;
      }
    }

    setAvailableSlots(slots);
    setLoadingSlots(false);
  };

  const handleDateSelect = (date: Date | undefined) => {
    setRescheduleDate(date);
    setRescheduleTime(null);
    if (date && selectedAppointment?.professional_uuid) {
      fetchAvailableSlots(date, selectedAppointment.professional_uuid);
    }
  };

  const handleConfirmReschedule = async () => {
    if (!selectedAppointment || !rescheduleDate || !rescheduleTime) return;

    const oldDate = selectedAppointment.appointment_date;
    const oldTime = selectedAppointment.appointment_time;

    setRescheduling(true);
    const { error } = await supabase
      .from('appointments')
      .update({
        appointment_date: format(rescheduleDate, 'yyyy-MM-dd'),
        appointment_time: rescheduleTime,
        status: 'pending',
      })
      .eq('id', selectedAppointment.id);

    if (error) {
      console.error('Error rescheduling appointment:', error);
      toast.error('Erro ao reagendar consulta');
    } else {
      toast.success('Consulta reagendada com sucesso');
      setAppointments((prev) =>
        prev.map((apt) =>
          apt.id === selectedAppointment.id
            ? { ...apt, appointment_date: format(rescheduleDate, 'yyyy-MM-dd'), appointment_time: rescheduleTime, status: 'pending' }
            : apt
        )
      );

      // Send WhatsApp notification to professional
      const professional = getProfessional(selectedAppointment.professional_uuid);
      const service = getService(selectedAppointment.service_id);
      if (professional?.phone) {
        try {
          const { data } = await supabase.functions.invoke('whatsapp-notify', {
            body: {
              professionalPhone: professional.phone,
              patientName: selectedAppointment.patient_name,
              patientPhone: selectedAppointment.patient_phone,
              appointmentDate: oldDate,
              appointmentTime: oldTime,
              newAppointmentDate: format(rescheduleDate, 'yyyy-MM-dd'),
              newAppointmentTime: rescheduleTime,
              serviceName: service?.name,
              appointmentId: selectedAppointment.id,
              type: 'rescheduled_by_patient',
            },
          });

          if (data?.whatsappLink) {
            window.open(data.whatsappLink, '_blank');
          }
        } catch (err) {
          console.error('Error sending WhatsApp notification:', err);
        }
      }
    }

    setRescheduling(false);
    setRescheduleDialogOpen(false);
    setSelectedAppointment(null);
  };

  const handleCancelClick = (apt: Appointment) => {
    setSelectedAppointment(apt);
    setCancelDialogOpen(true);
  };

  const handleDetailsClick = (apt: Appointment) => {
    setSelectedAppointment(apt);
    setDetailsDialogOpen(true);
  };

  const getProfessional = (uuid: string | null) => {
    if (!uuid) return null;
    return professionals.find((p) => p.id === uuid) || null;
  };

  const paymentStatusConfig: Record<string, { label: string; className: string }> = {
    pending: { label: 'Aguardando', className: 'bg-warning/20 text-warning border-warning/30' },
    paid: { label: 'Pago', className: 'bg-success/20 text-success border-success/30' },
    failed: { label: 'Falhou', className: 'bg-destructive/20 text-destructive border-destructive/30' },
    refunded: { label: 'Reembolsado', className: 'bg-muted text-muted-foreground border-border' },
  };

  const handleDownloadPDF = (apt: Appointment) => {
    const service = getService(apt.service_id);
    const professional = getProfessional(apt.professional_uuid);
    const status = statusConfig[apt.status] || statusConfig.pending;
    const paymentStatus = paymentStatusConfig[apt.payment_status] || paymentStatusConfig.pending;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();

    // Header
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('COMPROVANTE DE AGENDAMENTO', pageWidth / 2, 25, { align: 'center' });

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100);
    doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`, pageWidth / 2, 33, { align: 'center' });

    // Divider line
    doc.setDrawColor(200);
    doc.line(20, 40, pageWidth - 20, 40);

    // Reset text color
    doc.setTextColor(0);
    let yPos = 55;

    // Service Section
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('SERVIÇO', 20, yPos);
    yPos += 8;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`Nome: ${service?.name || 'Consulta'}`, 25, yPos);
    yPos += 7;
    doc.text(`Duração: ${service ? formatDuration(service.duration_minutes) : '30 minutos'}`, 25, yPos);
    yPos += 7;
    doc.text(`Valor: R$ ${(apt.amount_cents / 100).toFixed(2).replace('.', ',')}`, 25, yPos);
    yPos += 15;

    // Date & Time Section
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('DATA E HORÁRIO', 20, yPos);
    yPos += 8;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`Data: ${format(new Date(apt.appointment_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}`, 25, yPos);
    yPos += 7;
    doc.text(`Horário: ${apt.appointment_time}`, 25, yPos);
    yPos += 15;

    // Professional Section
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('PROFISSIONAL', 20, yPos);
    yPos += 8;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`Nome: ${professional?.name || 'Profissional não definido'}`, 25, yPos);
    yPos += 7;
    if (professional?.phone) {
      doc.text(`Telefone: ${professional.phone}`, 25, yPos);
      yPos += 7;
    }
    yPos += 8;

    // Patient Section
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('DADOS DO PACIENTE', 20, yPos);
    yPos += 8;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`Nome: ${apt.patient_name}`, 25, yPos);
    yPos += 7;
    doc.text(`Email: ${apt.patient_email}`, 25, yPos);
    yPos += 7;
    doc.text(`Telefone: ${apt.patient_phone}`, 25, yPos);
    yPos += 15;

    // Status Section
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('STATUS', 20, yPos);
    yPos += 8;

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(`Consulta: ${status.label}`, 25, yPos);
    yPos += 7;
    doc.text(`Pagamento: ${paymentStatus.label}`, 25, yPos);
    yPos += 20;

    // Footer divider
    doc.setDrawColor(200);
    doc.line(20, yPos, pageWidth - 20, yPos);
    yPos += 10;

    // Footer
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text('Este é um comprovante de agendamento gerado automaticamente.', pageWidth / 2, yPos, { align: 'center' });
    yPos += 5;
    doc.text(`ID do Agendamento: ${apt.id}`, pageWidth / 2, yPos, { align: 'center' });

    // Save PDF
    const fileName = `comprovante-${format(new Date(apt.appointment_date), 'dd-MM-yyyy')}-${apt.appointment_time.replace(':', 'h')}.pdf`;
    doc.save(fileName);
    toast.success('Comprovante baixado com sucesso!');
  };

  const handleEditProfileClick = () => {
    setEditFullName(profile?.full_name || '');
    setEditWhatsapp(profile?.whatsapp || '');
    setEditProfileDialogOpen(true);
  };

  const handleSaveProfile = async () => {
    if (!user) return;

    setSavingProfile(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: editFullName.trim(),
        whatsapp: editWhatsapp.trim(),
      })
      .eq('user_id', user.id);

    if (error) {
      console.error('Error updating profile:', error);
      toast.error('Erro ao atualizar perfil');
    } else {
      toast.success('Perfil atualizado com sucesso!');
      // Reload page to refresh profile data from context
      window.location.reload();
    }

    setSavingProfile(false);
    setEditProfileDialogOpen(false);
  };

  const handleConfirmCancel = async () => {
    if (!selectedAppointment) return;

    setCancelling(true);
    const { error } = await supabase
      .from('appointments')
      .update({ status: 'cancelled' })
      .eq('id', selectedAppointment.id);

    if (error) {
      console.error('Error cancelling appointment:', error);
      toast.error('Erro ao cancelar agendamento');
    } else {
      toast.success('Agendamento cancelado com sucesso');
      // Update local state
      setAppointments((prev) =>
        prev.map((apt) =>
          apt.id === selectedAppointment.id ? { ...apt, status: 'cancelled' } : apt
        )
      );

      // Send WhatsApp notification to professional
      const professional = getProfessional(selectedAppointment.professional_uuid);
      const service = getService(selectedAppointment.service_id);
      if (professional?.phone) {
        try {
          const { data } = await supabase.functions.invoke('whatsapp-notify', {
            body: {
              professionalPhone: professional.phone,
              patientName: selectedAppointment.patient_name,
              patientPhone: selectedAppointment.patient_phone,
              appointmentDate: selectedAppointment.appointment_date,
              appointmentTime: selectedAppointment.appointment_time,
              serviceName: service?.name,
              appointmentId: selectedAppointment.id,
              type: 'cancelled_by_patient',
            },
          });

          if (data?.whatsappLink) {
            window.open(data.whatsappLink, '_blank');
          }
        } catch (err) {
          console.error('Error sending WhatsApp notification:', err);
        }
      }
    }

    setCancelling(false);
    setCancelDialogOpen(false);
    setSelectedAppointment(null);
  };

  // Filter and sort appointments
  const filteredAppointments = appointments.filter((apt) => {
    if (statusFilter === 'all') return true;
    return apt.status === statusFilter;
  });

  const sortedAppointments = [...filteredAppointments].sort((a, b) => {
    const dateA = new Date(`${a.appointment_date}T${a.appointment_time}`);
    const dateB = new Date(`${b.appointment_date}T${b.appointment_time}`);
    return dateB.getTime() - dateA.getTime();
  });

  const renderAppointmentCard = (apt: Appointment) => {
    const status = statusConfig[apt.status] || statusConfig.pending;
    const service = getService(apt.service_id);
    const showActions = canModifyAppointment(apt.status);

    return (
      <div
        key={apt.id}
        className="bg-background rounded-xl p-5 border border-clinic-border-subtle"
      >
        <div className="flex items-start justify-between gap-4">
          {/* Left: Content */}
          <div className="flex flex-col gap-2 flex-1">
            {/* Service Name */}
            <h3 className="font-bold text-foreground text-base">
              {service?.name || 'Consulta'}
            </h3>

            {/* Date */}
            <div className="flex items-center gap-2 text-sm text-clinic-text-secondary">
              <Calendar className="h-4 w-4" />
              <span>
                {format(new Date(apt.appointment_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </span>
            </div>

            {/* Time + Duration */}
            <div className="flex items-center gap-2 text-sm text-clinic-text-secondary">
              <Clock className="h-4 w-4" />
              <span>
                {apt.appointment_time} • {service ? formatDuration(service.duration_minutes) : '30 minutos'}
              </span>
            </div>

            {/* Professional */}
            <div className="flex items-center gap-2 text-sm text-clinic-text-secondary">
              <User className="h-4 w-4" />
              <span>{getProfessionalName(apt.professional_uuid)}</span>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-2 mt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDetailsClick(apt)}
                className="w-fit text-foreground hover:bg-muted"
              >
                <Eye className="h-4 w-4 mr-1" />
                Ver detalhes
              </Button>
              {showActions && (
                <>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRescheduleClick(apt)}
                    className="w-fit text-clinic-primary hover:text-clinic-primary hover:bg-clinic-primary/10"
                  >
                    <RefreshCw className="h-4 w-4 mr-1" />
                    Reagendar
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCancelClick(apt)}
                    className="w-fit text-destructive hover:text-destructive hover:bg-destructive/10"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Cancelar
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Right: Status Badge */}
          <Badge 
            variant="outline" 
            className={`whitespace-nowrap text-xs font-medium px-3 py-1 ${status.className}`}
          >
            {status.label}
          </Badge>
        </div>
      </div>
    );
  };

  const clientName = profile?.full_name?.toUpperCase() || user?.email?.split('@')[0].toUpperCase() || 'CLIENTE';

  return (
    <PublicLayout>
      <div className="min-h-[calc(100vh-200px)] bg-clinic-surface">
        <div className="container py-8 lg:py-12">
          <div className="max-w-3xl mx-auto">
            {/* Personalized Header */}
            <h1 className="text-2xl font-bold mb-2">
              Olá, {clientName}!
            </h1>
            <p className="text-clinic-text-secondary mb-6">
              Aqui você pode ver e gerenciar seus agendamentos
            </p>

            {/* Client Profile Card */}
            {user && profile && (
              <div className="bg-background rounded-xl p-5 border border-clinic-border-subtle mb-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex flex-col gap-3 flex-1">
                    {/* Nome */}
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-clinic-primary/10 flex items-center justify-center">
                        <User className="h-5 w-5 text-clinic-primary" />
                      </div>
                      <div>
                        <p className="font-bold text-foreground">
                          {profile.full_name || 'Cliente'}
                        </p>
                        <p className="text-xs text-clinic-text-muted">Cliente</p>
                      </div>
                    </div>
                    
                    {/* Email */}
                    <div className="flex items-center gap-2 text-sm text-clinic-text-secondary">
                      <Mail className="h-4 w-4" />
                      <span>{profile.email}</span>
                    </div>
                    
                    {/* WhatsApp */}
                    {profile.whatsapp && (
                      <div className="flex items-center gap-2 text-sm text-clinic-text-secondary">
                        <Phone className="h-4 w-4" />
                        <span>{profile.whatsapp}</span>
                      </div>
                    )}
                  </div>

                  {/* Edit Button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleEditProfileClick}
                    className="text-clinic-primary hover:text-clinic-primary hover:bg-clinic-primary/10"
                  >
                    <Pencil className="h-4 w-4 mr-1" />
                    Editar
                  </Button>
                </div>
              </div>
            )}

            {/* Novo Agendamento Button */}
            <Link to="/agendar">
              <Button 
                variant="outline" 
                className="mb-8 bg-background text-foreground hover:bg-muted border-border"
              >
                <Calendar className="h-4 w-4 mr-2" />
                Novo Agendamento
              </Button>
            </Link>

            {/* Search - only show if not logged in */}
            {!user && (
              <div className="bg-background rounded-xl p-6 border border-clinic-border-subtle mb-8">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <Label htmlFor="email">Seu email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="email@exemplo.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    />
                  </div>
                  <div className="flex items-end">
                    <Button
                      variant="clinic"
                      onClick={handleSearch}
                      disabled={loading}
                    >
                      {loading ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Search className="h-4 w-4 mr-2" />
                      )}
                      Buscar
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Loading */}
            {loading && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-clinic-primary" />
              </div>
            )}

            {/* Results */}
            {searched && !loading && (
              <>
                {appointments.length === 0 ? (
                  <div className="bg-background rounded-xl p-12 border border-clinic-border-subtle text-center">
                    <Calendar className="h-12 w-12 mx-auto mb-4 text-clinic-text-muted opacity-50" />
                    <p className="text-clinic-text-secondary">
                      Nenhuma consulta encontrada
                    </p>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Status Filters */}
                    <div className="flex flex-wrap gap-2">
                      {filterOptions.map((option) => (
                        <Button
                          key={option.value}
                          variant={statusFilter === option.value ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setStatusFilter(option.value)}
                          className={statusFilter === option.value 
                            ? 'bg-clinic-primary text-primary-foreground hover:bg-clinic-primary/90' 
                            : 'bg-background text-foreground hover:bg-muted border-border'
                          }
                        >
                          {option.label}
                        </Button>
                      ))}
                    </div>

                    {/* Appointments List */}
                    {sortedAppointments.length === 0 ? (
                      <div className="bg-background rounded-xl p-8 border border-clinic-border-subtle text-center">
                        <p className="text-clinic-text-secondary">
                          Nenhum agendamento com este status
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {sortedAppointments.map((apt) => renderAppointmentCard(apt))}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Cancel Confirmation Dialog */}
      <AlertDialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancelar agendamento?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja cancelar este agendamento? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={cancelling}>Não, manter</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmCancel}
              disabled={cancelling}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {cancelling ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Sim, cancelar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reschedule Dialog */}
      <Dialog open={rescheduleDialogOpen} onOpenChange={setRescheduleDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reagendar consulta</DialogTitle>
            <DialogDescription>
              Selecione uma nova data e horário para sua consulta.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Date Picker */}
            <div>
              <Label className="mb-2 block">Data</Label>
              <div className="flex justify-center">
                <CalendarComponent
                  mode="single"
                  selected={rescheduleDate}
                  onSelect={handleDateSelect}
                  disabled={(date) => isBefore(date, startOfDay(new Date()))}
                  locale={ptBR}
                  className={cn("rounded-md border pointer-events-auto")}
                />
              </div>
            </div>

            {/* Time Slots */}
            {rescheduleDate && (
              <div>
                <Label className="mb-2 block">Horário</Label>
                {loadingSlots ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-clinic-primary" />
                  </div>
                ) : availableSlots.length === 0 ? (
                  <p className="text-sm text-clinic-text-muted text-center py-4">
                    Nenhum horário disponível nesta data
                  </p>
                ) : (
                  <div className="grid grid-cols-4 gap-2 max-h-40 overflow-y-auto">
                    {availableSlots.map((slot) => (
                      <Button
                        key={slot}
                        variant={rescheduleTime === slot ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setRescheduleTime(slot)}
                        className={cn(
                          rescheduleTime === slot
                            ? 'bg-clinic-primary text-primary-foreground'
                            : 'bg-background text-foreground hover:bg-muted border-border'
                        )}
                      >
                        {slot}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRescheduleDialogOpen(false)}
              disabled={rescheduling}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmReschedule}
              disabled={!rescheduleDate || !rescheduleTime || rescheduling}
              className="bg-clinic-primary text-primary-foreground hover:bg-clinic-primary/90"
            >
              {rescheduling ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Details Dialog */}
      <Dialog open={detailsDialogOpen} onOpenChange={setDetailsDialogOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Detalhes da Consulta</DialogTitle>
            <DialogDescription>
              Informações completas do seu agendamento
            </DialogDescription>
          </DialogHeader>

          {selectedAppointment && (() => {
            const service = getService(selectedAppointment.service_id);
            const professional = getProfessional(selectedAppointment.professional_uuid);
            const status = statusConfig[selectedAppointment.status] || statusConfig.pending;
            const paymentStatus = paymentStatusConfig[selectedAppointment.payment_status] || paymentStatusConfig.pending;

            return (
              <div className="space-y-6 py-4">
                {/* Service Info */}
                <div className="space-y-2">
                  <h3 className="font-semibold text-foreground flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Serviço
                  </h3>
                  <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                    <p className="font-medium text-foreground">{service?.name || 'Consulta'}</p>
                    {service?.description && (
                      <p className="text-sm text-clinic-text-secondary">{service.description}</p>
                    )}
                    <div className="flex flex-wrap gap-4 text-sm text-clinic-text-secondary">
                      <span>Duração: {service ? formatDuration(service.duration_minutes) : '30 minutos'}</span>
                      <span>Valor: R$ {(selectedAppointment.amount_cents / 100).toFixed(2).replace('.', ',')}</span>
                    </div>
                  </div>
                </div>

                {/* Date & Time */}
                <div className="space-y-2">
                  <h3 className="font-semibold text-foreground flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Data e Horário
                  </h3>
                  <div className="bg-muted/50 rounded-lg p-4 space-y-1">
                    <p className="font-medium text-foreground">
                      {format(new Date(selectedAppointment.appointment_date), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                    </p>
                    <p className="text-sm text-clinic-text-secondary flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      {selectedAppointment.appointment_time}
                    </p>
                  </div>
                </div>

                {/* Professional */}
                <div className="space-y-2">
                  <h3 className="font-semibold text-foreground flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Profissional
                  </h3>
                  <div className="bg-muted/50 rounded-lg p-4 space-y-1">
                    <p className="font-medium text-foreground">{professional?.name || 'Profissional não definido'}</p>
                    {professional?.phone && (
                      <p className="text-sm text-clinic-text-secondary flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        {professional.phone}
                      </p>
                    )}
                  </div>
                </div>

                {/* Patient Info */}
                <div className="space-y-2">
                  <h3 className="font-semibold text-foreground flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Dados do Paciente
                  </h3>
                  <div className="bg-muted/50 rounded-lg p-4 space-y-1">
                    <p className="font-medium text-foreground">{selectedAppointment.patient_name}</p>
                    <p className="text-sm text-clinic-text-secondary">{selectedAppointment.patient_email}</p>
                    <p className="text-sm text-clinic-text-secondary flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      {selectedAppointment.patient_phone}
                    </p>
                  </div>
                </div>

                {/* Status & Payment */}
                <div className="space-y-2">
                  <h3 className="font-semibold text-foreground flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    Status
                  </h3>
                  <div className="flex flex-wrap gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-clinic-text-secondary">Consulta:</span>
                      <Badge variant="outline" className={`text-xs font-medium px-3 py-1 ${status.className}`}>
                        {status.label}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-clinic-text-secondary">Pagamento:</span>
                      <Badge variant="outline" className={`text-xs font-medium px-3 py-1 ${paymentStatus.className}`}>
                        {paymentStatus.label}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => selectedAppointment && handleDownloadPDF(selectedAppointment)}
              className="w-full sm:w-auto"
            >
              <Download className="h-4 w-4 mr-2" />
              Baixar PDF
            </Button>
            <Button
              variant="outline"
              onClick={() => setDetailsDialogOpen(false)}
              className="w-full sm:w-auto"
            >
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Profile Dialog */}
      <Dialog open={editProfileDialogOpen} onOpenChange={setEditProfileDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Perfil</DialogTitle>
            <DialogDescription>
              Atualize suas informações pessoais
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-full-name">Nome completo</Label>
              <Input
                id="edit-full-name"
                value={editFullName}
                onChange={(e) => setEditFullName(e.target.value)}
                placeholder="Seu nome completo"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-whatsapp">WhatsApp</Label>
              <Input
                id="edit-whatsapp"
                value={editWhatsapp}
                onChange={(e) => setEditWhatsapp(e.target.value)}
                placeholder="(11) 99999-9999"
              />
            </div>

            <div className="space-y-2">
              <Label>Email</Label>
              <Input
                value={profile?.email || ''}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-clinic-text-muted">
                O email não pode ser alterado
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditProfileDialogOpen(false)}
              disabled={savingProfile}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSaveProfile}
              disabled={savingProfile || !editFullName.trim()}
              className="bg-clinic-primary text-primary-foreground hover:bg-clinic-primary/90"
            >
              {savingProfile ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PublicLayout>
  );
}
