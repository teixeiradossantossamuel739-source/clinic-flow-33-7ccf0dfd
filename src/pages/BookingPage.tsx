import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { supabase } from '@/integrations/supabase/client';
import { 
  Calendar, 
  Clock, 
  CheckCircle2, 
  ArrowLeft, 
  ArrowRight,
  Star,
  CreditCard,
  Loader2,
  Stethoscope,
  Heart,
  Sparkles,
  Baby,
  Bone,
  Eye,
  HeartPulse,
  Brain,
} from 'lucide-react';
import { toast } from 'sonner';
import { format, addDays, startOfWeek, getDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Service {
  id: string;
  name: string;
  description: string | null;
  specialty_id: string;
  price_cents: number;
  stripe_price_id: string;
  stripe_product_id: string;
  duration_minutes: number;
  is_active: boolean;
}

interface Professional {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  specialty_id: string;
  crm: string | null;
  bio: string | null;
  avatar_url: string | null;
  rating: number | null;
  review_count: number | null;
  is_active: boolean;
}

interface ProfessionalSchedule {
  id: string;
  professional_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  slot_duration_minutes: number;
  is_active: boolean;
}

const iconMap: Record<string, React.ReactNode> = {
  Stethoscope: <Stethoscope className="h-5 w-5" />,
  Heart: <Heart className="h-5 w-5" />,
  Sparkles: <Sparkles className="h-5 w-5" />,
  Baby: <Baby className="h-5 w-5" />,
  Bone: <Bone className="h-5 w-5" />,
  Eye: <Eye className="h-5 w-5" />,
  HeartPulse: <HeartPulse className="h-5 w-5" />,
  Brain: <Brain className="h-5 w-5" />,
};

type Step = 'service' | 'professional' | 'datetime' | 'confirm';

interface BookingData {
  serviceId: string | null;
  professionalId: string | null;
  date: string | null;
  time: string | null;
  patientName: string;
  patientPhone: string;
  patientEmail: string;
}

interface ExistingAppointment {
  id: string;
  professional_id: string;
  professional_uuid: string | null;
  appointment_date: string;
  appointment_time: string;
  status: string;
}

export default function BookingPage() {
  const [searchParams] = useSearchParams();
  const canceled = searchParams.get('canceled');
  
  const [step, setStep] = useState<Step>('service');
  const [services, setServices] = useState<Service[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [schedules, setSchedules] = useState<ProfessionalSchedule[]>([]);
  const [existingAppointments, setExistingAppointments] = useState<ExistingAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  
  const [booking, setBooking] = useState<BookingData>({
    serviceId: null,
    professionalId: null,
    date: null,
    time: null,
    patientName: '',
    patientPhone: '',
    patientEmail: '',
  });

  const [weekOffset, setWeekOffset] = useState(0);

  // Show canceled toast
  useEffect(() => {
    if (canceled) {
      toast.error('Pagamento cancelado. Tente novamente.');
    }
  }, [canceled]);

  // Fetch services, professionals, schedules and existing appointments
  useEffect(() => {
    async function fetchData() {
      const [servicesRes, professionalsRes, schedulesRes, appointmentsRes] = await Promise.all([
        supabase.from('services').select('*').eq('is_active', true),
        supabase.from('professionals').select('*').eq('is_active', true),
        supabase.from('professional_schedules').select('*').eq('is_active', true),
        supabase
          .from('appointments')
          .select('id, professional_id, professional_uuid, appointment_date, appointment_time, status')
          .not('status', 'eq', 'cancelled'),
      ]);
      
      if (servicesRes.error) {
        console.error('Error fetching services:', servicesRes.error);
        toast.error('Erro ao carregar serviços');
      } else {
        setServices(servicesRes.data || []);
      }

      if (professionalsRes.error) {
        console.error('Error fetching professionals:', professionalsRes.error);
        toast.error('Erro ao carregar profissionais');
      } else {
        setProfessionals(professionalsRes.data || []);
      }

      if (schedulesRes.error) {
        console.error('Error fetching schedules:', schedulesRes.error);
      } else {
        setSchedules(schedulesRes.data || []);
      }

      if (appointmentsRes.error) {
        console.error('Error fetching existing appointments:', appointmentsRes.error);
      } else {
        setExistingAppointments(appointmentsRes.data || []);
      }

      setLoading(false);
    }
    fetchData();
  }, []);

  const selectedService = useMemo(
    () => services.find((s) => s.id === booking.serviceId),
    [services, booking.serviceId]
  );

  const selectedProfessional = useMemo(
    () => professionals.find((p) => p.id === booking.professionalId),
    [professionals, booking.professionalId]
  );

  const filteredProfessionals = useMemo(() => {
    if (!selectedService) return [];
    return professionals.filter((p) => 
      p.specialty_id.toLowerCase() === selectedService.specialty_id.toLowerCase()
    );
  }, [selectedService, professionals]);

  const professionalSchedules = useMemo(() => {
    if (!booking.professionalId) return [];
    return schedules.filter((s) => s.professional_id === booking.professionalId);
  }, [schedules, booking.professionalId]);

  const weekDays = useMemo(() => {
    const start = addDays(startOfWeek(new Date(), { weekStartsOn: 1 }), weekOffset * 7);
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [weekOffset]);

  // Generate time slots based on professional schedule and check for existing appointments
  const timeSlots = useMemo(() => {
    if (!booking.date || !booking.professionalId) return [];
    
    const selectedDate = new Date(booking.date);
    const dayOfWeek = getDay(selectedDate);
    const schedule = professionalSchedules.find((s) => s.day_of_week === dayOfWeek);
    
    if (!schedule) return [];

    const slots: { id: string; time: string; available: boolean }[] = [];
    const [startHour, startMin] = schedule.start_time.split(':').map(Number);
    const [endHour, endMin] = schedule.end_time.split(':').map(Number);
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    const duration = schedule.slot_duration_minutes;

    // Get booked times for this professional on this date
    const bookedTimes = existingAppointments
      .filter(
        (apt) =>
          (apt.professional_id === booking.professionalId || apt.professional_uuid === booking.professionalId) &&
          apt.appointment_date === booking.date
      )
      .map((apt) => apt.appointment_time.slice(0, 5)); // Get HH:MM format

    for (let m = startMinutes; m + duration <= endMinutes; m += duration) {
      const hour = Math.floor(m / 60);
      const min = m % 60;
      const time = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
      const isBooked = bookedTimes.includes(time);
      slots.push({ id: `slot-${time}`, time, available: !isBooked });
    }

    return slots;
  }, [booking.date, booking.professionalId, professionalSchedules, existingAppointments]);

  const handleSelectService = (id: string) => {
    setBooking((prev) => ({ ...prev, serviceId: id, professionalId: null }));
    setStep('professional');
  };

  const handleSelectProfessional = (id: string) => {
    setBooking((prev) => ({ ...prev, professionalId: id }));
    setStep('datetime');
  };

  const handleSelectDate = (date: Date) => {
    setBooking((prev) => ({ ...prev, date: format(date, 'yyyy-MM-dd'), time: null }));
  };

  const handleSelectTime = (time: string) => {
    setBooking((prev) => ({ ...prev, time }));
  };

  const handlePayment = async () => {
    if (!booking.patientName || !booking.patientEmail) {
      toast.error('Por favor, preencha nome e email para continuar');
      return;
    }

    if (!selectedService || !selectedProfessional || !booking.date || !booking.time) {
      toast.error('Dados incompletos. Por favor, revise seu agendamento.');
      return;
    }

    setProcessing(true);

    try {
      const { data, error } = await supabase.functions.invoke('create-payment', {
        body: {
          serviceName: selectedService.name,
          servicePrice: selectedService.price_cents,
          stripePriceId: selectedService.stripe_price_id,
          professionalName: selectedProfessional.name,
          professionalId: selectedProfessional.id,
          appointmentDate: booking.date,
          appointmentTime: booking.time,
          patientName: booking.patientName,
          patientEmail: booking.patientEmail,
          patientPhone: booking.patientPhone
        }
      });

      if (error) throw error;

      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast.error('Erro ao processar pagamento. Tente novamente.');
      setProcessing(false);
    }
  };

  const goBack = () => {
    if (step === 'professional') setStep('service');
    else if (step === 'datetime') setStep('professional');
    else if (step === 'confirm') setStep('datetime');
  };

  const canProceedToConfirm = booking.date && booking.time;

  if (loading) {
    return (
      <PublicLayout>
        <div className="min-h-[calc(100vh-200px)] flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-clinic-primary" />
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div className="min-h-[calc(100vh-200px)] bg-clinic-surface">
        <div className="container py-8 lg:py-12">
          {/* Progress */}
          <div className="max-w-3xl mx-auto mb-8">
            <div className="flex items-center justify-between">
              {[
                { key: 'service', label: 'Serviço' },
                { key: 'professional', label: 'Profissional' },
                { key: 'datetime', label: 'Data e Hora' },
                { key: 'confirm', label: 'Pagamento' },
              ].map((s, i) => (
                <div key={s.key} className="flex items-center">
                  <div
                    className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                      step === s.key
                        ? 'bg-clinic-primary text-foreground'
                        : ['service', 'professional', 'datetime', 'confirm'].indexOf(step) >
                          ['service', 'professional', 'datetime', 'confirm'].indexOf(s.key)
                        ? 'bg-clinic-primary/20 text-clinic-primary'
                        : 'bg-clinic-border-subtle text-clinic-text-muted'
                    }`}
                  >
                    {i + 1}
                  </div>
                  <span className="hidden sm:block ml-2 text-sm text-clinic-text-secondary">
                    {s.label}
                  </span>
                  {i < 3 && (
                    <div className="w-8 sm:w-16 h-px bg-clinic-border-default mx-2 sm:mx-4" />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="max-w-4xl mx-auto">
            {step !== 'service' && (
              <button
                onClick={goBack}
                className="flex items-center gap-2 text-sm text-clinic-text-secondary hover:text-foreground mb-6 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Voltar
              </button>
            )}

            {/* Step 1: Service */}
            {step === 'service' && (
              <div className="animate-fade-in">
                <h1 className="text-2xl font-bold mb-2">Escolha o Serviço</h1>
                <p className="text-clinic-text-secondary mb-8">
                  Selecione a consulta desejada
                </p>

                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {services.map((service) => (
                    <button
                      key={service.id}
                      onClick={() => handleSelectService(service.id)}
                      className="text-left bg-background border border-clinic-border-subtle rounded-xl p-5 hover:border-clinic-primary hover:shadow-clinic-md transition-all group"
                    >
                      <div className="h-10 w-10 rounded-lg bg-clinic-primary/10 flex items-center justify-center text-clinic-primary mb-3 group-hover:bg-clinic-primary group-hover:text-foreground transition-colors">
                        <Stethoscope className="h-5 w-5" />
                      </div>
                      <h3 className="font-semibold mb-1">{service.name}</h3>
                      <p className="text-sm text-clinic-text-muted line-clamp-2">
                        {service.description}
                      </p>
                      <div className="mt-3 flex items-center justify-between text-sm">
                        <span className="text-clinic-text-secondary">{service.duration_minutes} min</span>
                        <span className="font-medium text-clinic-primary">
                          R$ {(service.price_cents / 100).toFixed(2)}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 2: Professional */}
            {step === 'professional' && (
              <div className="animate-fade-in">
                <h1 className="text-2xl font-bold mb-2">Escolha o Profissional</h1>
                <p className="text-clinic-text-secondary mb-8">
                  {selectedService?.name} - Selecione um de nossos especialistas
                </p>

                <div className="grid sm:grid-cols-2 gap-4">
                  {filteredProfessionals.map((professional) => (
                    <button
                      key={professional.id}
                      onClick={() => handleSelectProfessional(professional.id)}
                      className="text-left bg-background border border-clinic-border-subtle rounded-xl p-5 hover:border-clinic-primary hover:shadow-clinic-md transition-all flex gap-4"
                    >
                      <img
                        src={professional.avatar_url || '/placeholder.svg'}
                        alt={professional.name}
                        className="h-16 w-16 rounded-xl object-cover shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold">{professional.name}</h3>
                        <p className="text-sm text-clinic-text-muted">{professional.crm}</p>
                        <div className="flex items-center gap-1 mt-1">
                          <Star className="h-4 w-4 fill-warning text-warning" />
                          <span className="text-sm font-medium">{professional.rating || 5.0}</span>
                          <span className="text-sm text-clinic-text-muted">
                            ({professional.review_count || 0})
                          </span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 3: Date & Time */}
            {step === 'datetime' && (
              <div className="animate-fade-in">
                <h1 className="text-2xl font-bold mb-2">Escolha Data e Horário</h1>
                <p className="text-clinic-text-secondary mb-8">
                  {selectedProfessional?.name} - {selectedService?.name}
                </p>

                <div className="grid lg:grid-cols-2 gap-8">
                  {/* Calendar */}
                  <div className="bg-background border border-clinic-border-subtle rounded-xl p-6">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold">Selecione o Dia</h3>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => setWeekOffset((w) => w - 1)}
                          disabled={weekOffset === 0}
                        >
                          <ArrowLeft className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => setWeekOffset((w) => w + 1)}
                        >
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-7 gap-2">
                      {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map((day) => (
                        <div
                          key={day}
                          className="text-center text-xs font-medium text-clinic-text-muted py-2"
                        >
                          {day}
                        </div>
                      ))}
                      {weekDays.map((date) => {
                        const isSelected = booking.date === format(date, 'yyyy-MM-dd');
                        const isPast = date < new Date();
                        const dayOfWeek = getDay(date);
                        const isAvailable = professionalSchedules.some(
                          (s) => s.day_of_week === dayOfWeek
                        );

                        return (
                          <button
                            key={date.toISOString()}
                            onClick={() => !isPast && isAvailable && handleSelectDate(date)}
                            disabled={isPast || !isAvailable}
                            className={`aspect-square rounded-lg flex flex-col items-center justify-center text-sm transition-all ${
                              isSelected
                                ? 'bg-clinic-primary text-foreground font-medium'
                                : isPast || !isAvailable
                                ? 'bg-clinic-surface text-clinic-text-muted cursor-not-allowed opacity-50'
                                : 'bg-clinic-surface hover:bg-clinic-primary/10 hover:text-clinic-primary'
                            }`}
                          >
                            <span className="text-lg font-medium">{format(date, 'd')}</span>
                            <span className="text-xs opacity-70">
                              {format(date, 'MMM', { locale: ptBR })}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Time slots */}
                  <div className="bg-background border border-clinic-border-subtle rounded-xl p-6">
                    <h3 className="font-semibold mb-4">Horários Disponíveis</h3>

                    {booking.date ? (
                      <div className="space-y-4">
                        <p className="text-sm text-clinic-text-secondary">
                          {format(new Date(booking.date), "EEEE, dd 'de' MMMM", { locale: ptBR })}
                        </p>

                        {timeSlots.length > 0 ? (
                          <div className="grid grid-cols-3 gap-2">
                            {timeSlots.map((slot) => (
                              <button
                                key={slot.id}
                                onClick={() => slot.available && handleSelectTime(slot.time)}
                                disabled={!slot.available}
                                className={`py-3 px-4 rounded-lg text-sm font-medium transition-all ${
                                  booking.time === slot.time
                                    ? 'bg-clinic-primary text-foreground'
                                    : slot.available
                                    ? 'bg-clinic-surface hover:bg-clinic-primary/10 hover:text-clinic-primary'
                                    : 'bg-clinic-surface/50 text-clinic-text-muted cursor-not-allowed line-through'
                                }`}
                              >
                                {slot.time}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8 text-clinic-text-muted">
                            <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                            <p className="text-sm">Nenhum horário disponível para este dia</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-12 text-clinic-text-muted">
                        <Calendar className="h-12 w-12 mb-4 opacity-50" />
                        <p className="text-sm">Selecione uma data primeiro</p>
                      </div>
                    )}
                  </div>
                </div>

                {canProceedToConfirm && (
                  <div className="mt-8 flex justify-end">
                    <Button
                      variant="clinic"
                      size="lg"
                      onClick={() => setStep('confirm')}
                    >
                      Continuar
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Step 4: Payment */}
            {step === 'confirm' && (
              <div className="animate-fade-in">
                <h1 className="text-2xl font-bold mb-2">Finalizar Agendamento</h1>
                <p className="text-clinic-text-secondary mb-8">
                  Preencha seus dados e realize o pagamento
                </p>

                <div className="grid lg:grid-cols-2 gap-8">
                  {/* Summary */}
                  <div className="bg-background border border-clinic-border-subtle rounded-xl p-6">
                    <h3 className="font-semibold mb-4">Resumo do Agendamento</h3>

                    <div className="space-y-4">
                      <div className="flex items-start gap-4">
                        <img
                          src={selectedProfessional?.avatar_url || '/placeholder.svg'}
                          alt={selectedProfessional?.name}
                          className="h-14 w-14 rounded-xl object-cover"
                        />
                        <div>
                          <p className="font-medium">{selectedProfessional?.name}</p>
                          <p className="text-sm text-clinic-text-secondary">
                            {selectedService?.name}
                          </p>
                          <div className="flex items-center gap-1 mt-1">
                            <Star className="h-3.5 w-3.5 fill-warning text-warning" />
                            <span className="text-sm">{selectedProfessional?.rating || 5.0}</span>
                          </div>
                        </div>
                      </div>

                      <div className="border-t border-clinic-border-subtle pt-4 space-y-3">
                        <div className="flex items-center gap-3 text-sm">
                          <Calendar className="h-4 w-4 text-clinic-primary" />
                          <span>
                            {booking.date &&
                              format(new Date(booking.date), "EEEE, dd 'de' MMMM 'de' yyyy", {
                                locale: ptBR,
                              })}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-sm">
                          <Clock className="h-4 w-4 text-clinic-primary" />
                          <span>{booking.time} - {selectedService?.duration_minutes} minutos</span>
                        </div>
                      </div>

                      <div className="border-t border-clinic-border-subtle pt-4 flex items-center justify-between">
                        <span className="text-clinic-text-secondary">Valor da Consulta</span>
                        <span className="text-xl font-bold text-clinic-primary">
                          R$ {selectedService ? (selectedService.price_cents / 100).toFixed(2) : '0.00'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Form */}
                  <div className="bg-background border border-clinic-border-subtle rounded-xl p-6">
                    <h3 className="font-semibold mb-4">Seus Dados</h3>

                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Nome Completo *</Label>
                        <Input
                          id="name"
                          placeholder="Digite seu nome"
                          value={booking.patientName}
                          onChange={(e) =>
                            setBooking((prev) => ({ ...prev, patientName: e.target.value }))
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="email">E-mail *</Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="seu@email.com"
                          value={booking.patientEmail}
                          onChange={(e) =>
                            setBooking((prev) => ({ ...prev, patientEmail: e.target.value }))
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="phone">WhatsApp (opcional)</Label>
                        <Input
                          id="phone"
                          placeholder="(11) 99999-9999"
                          value={booking.patientPhone}
                          onChange={(e) =>
                            setBooking((prev) => ({ ...prev, patientPhone: e.target.value }))
                          }
                        />
                      </div>

                      <div className="pt-4">
                        <Button
                          variant="clinic"
                          size="lg"
                          className="w-full"
                          onClick={handlePayment}
                          disabled={processing}
                        >
                          {processing ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Processando...
                            </>
                          ) : (
                            <>
                              <CreditCard className="h-4 w-4" />
                              Pagar R$ {selectedService ? (selectedService.price_cents / 100).toFixed(2) : '0.00'}
                            </>
                          )}
                        </Button>

                        <p className="text-xs text-clinic-text-muted text-center mt-3">
                          Pagamento seguro via Stripe. Você será redirecionado para finalizar.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
