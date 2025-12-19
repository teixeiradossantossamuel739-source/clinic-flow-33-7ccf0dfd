import { useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { specialties, professionals, timeSlots } from '@/data/mockData';
import { 
  Calendar, 
  Clock, 
  User, 
  CheckCircle2, 
  ArrowLeft, 
  ArrowRight,
  Star,
  Phone,
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
import { format, addDays, startOfWeek } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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

type Step = 'specialty' | 'professional' | 'datetime' | 'confirm';

interface BookingData {
  specialtyId: string | null;
  professionalId: string | null;
  date: string | null;
  time: string | null;
  patientName: string;
  patientPhone: string;
  patientEmail: string;
}

export default function BookingPage() {
  const [searchParams] = useSearchParams();
  const initialSpecialty = searchParams.get('especialidade');
  const initialProfessional = searchParams.get('profissional');

  const [step, setStep] = useState<Step>(
    initialProfessional ? 'datetime' : initialSpecialty ? 'professional' : 'specialty'
  );
  
  const [booking, setBooking] = useState<BookingData>({
    specialtyId: initialSpecialty,
    professionalId: initialProfessional,
    date: null,
    time: null,
    patientName: '',
    patientPhone: '',
    patientEmail: '',
  });

  const [weekOffset, setWeekOffset] = useState(0);

  const selectedSpecialty = useMemo(
    () => specialties.find((s) => s.id === booking.specialtyId),
    [booking.specialtyId]
  );

  const selectedProfessional = useMemo(
    () => professionals.find((p) => p.id === booking.professionalId),
    [booking.professionalId]
  );

  const filteredProfessionals = useMemo(
    () => professionals.filter((p) => p.specialtyId === booking.specialtyId),
    [booking.specialtyId]
  );

  const weekDays = useMemo(() => {
    const start = addDays(startOfWeek(new Date(), { weekStartsOn: 1 }), weekOffset * 7);
    return Array.from({ length: 7 }, (_, i) => addDays(start, i));
  }, [weekOffset]);

  const handleSelectSpecialty = (id: string) => {
    setBooking((prev) => ({ ...prev, specialtyId: id, professionalId: null }));
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

  const handleConfirm = () => {
    if (!booking.patientName || !booking.patientPhone) {
      toast.error('Por favor, preencha todos os campos obrigatórios');
      return;
    }

    // Simulate WhatsApp redirect
    const message = encodeURIComponent(
      `Olá! Gostaria de confirmar meu agendamento:\n\n` +
      `Paciente: ${booking.patientName}\n` +
      `Especialidade: ${selectedSpecialty?.name}\n` +
      `Profissional: ${selectedProfessional?.name}\n` +
      `Data: ${booking.date ? format(new Date(booking.date), "dd 'de' MMMM", { locale: ptBR }) : ''}\n` +
      `Horário: ${booking.time}\n\n` +
      `Aguardo confirmação. Obrigado!`
    );

    window.open(`https://wa.me/5511999999999?text=${message}`, '_blank');
    
    toast.success('Agendamento enviado! Aguarde a confirmação via WhatsApp.');
  };

  const goBack = () => {
    if (step === 'professional') setStep('specialty');
    else if (step === 'datetime') setStep('professional');
    else if (step === 'confirm') setStep('datetime');
  };

  const canProceedToConfirm = booking.date && booking.time;

  return (
    <PublicLayout>
      <div className="min-h-[calc(100vh-200px)] bg-clinic-surface">
        <div className="container py-8 lg:py-12">
          {/* Progress */}
          <div className="max-w-3xl mx-auto mb-8">
            <div className="flex items-center justify-between">
              {[
                { key: 'specialty', label: 'Especialidade' },
                { key: 'professional', label: 'Profissional' },
                { key: 'datetime', label: 'Data e Hora' },
                { key: 'confirm', label: 'Confirmação' },
              ].map((s, i) => (
                <div key={s.key} className="flex items-center">
                  <div
                    className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                      step === s.key
                        ? 'bg-clinic-primary text-foreground'
                        : ['specialty', 'professional', 'datetime', 'confirm'].indexOf(step) >
                          ['specialty', 'professional', 'datetime', 'confirm'].indexOf(s.key)
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
            {step !== 'specialty' && (
              <button
                onClick={goBack}
                className="flex items-center gap-2 text-sm text-clinic-text-secondary hover:text-foreground mb-6 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Voltar
              </button>
            )}

            {/* Step 1: Specialty */}
            {step === 'specialty' && (
              <div className="animate-fade-in">
                <h1 className="text-2xl font-bold mb-2">Escolha a Especialidade</h1>
                <p className="text-clinic-text-secondary mb-8">
                  Selecione a área médica para sua consulta
                </p>

                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {specialties.map((specialty) => (
                    <button
                      key={specialty.id}
                      onClick={() => handleSelectSpecialty(specialty.id)}
                      className="text-left bg-background border border-clinic-border-subtle rounded-xl p-5 hover:border-clinic-primary hover:shadow-clinic-md transition-all group"
                    >
                      <div className="h-10 w-10 rounded-lg bg-clinic-primary/10 flex items-center justify-center text-clinic-primary mb-3 group-hover:bg-clinic-primary group-hover:text-foreground transition-colors">
                        {iconMap[specialty.icon] || <Stethoscope className="h-5 w-5" />}
                      </div>
                      <h3 className="font-semibold mb-1">{specialty.name}</h3>
                      <p className="text-sm text-clinic-text-muted line-clamp-1">
                        {specialty.description}
                      </p>
                      <div className="mt-3 flex items-center justify-between text-sm">
                        <span className="text-clinic-text-secondary">{specialty.duration} min</span>
                        <span className="font-medium text-clinic-primary">
                          R$ {specialty.price.toFixed(2)}
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
                  {selectedSpecialty?.name} - Selecione um de nossos especialistas
                </p>

                <div className="grid sm:grid-cols-2 gap-4">
                  {filteredProfessionals.map((professional) => (
                    <button
                      key={professional.id}
                      onClick={() => handleSelectProfessional(professional.id)}
                      className="text-left bg-background border border-clinic-border-subtle rounded-xl p-5 hover:border-clinic-primary hover:shadow-clinic-md transition-all flex gap-4"
                    >
                      <img
                        src={professional.avatar}
                        alt={professional.name}
                        className="h-16 w-16 rounded-xl object-cover shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold">{professional.name}</h3>
                        <p className="text-sm text-clinic-text-muted">{professional.crm}</p>
                        <div className="flex items-center gap-1 mt-1">
                          <Star className="h-4 w-4 fill-warning text-warning" />
                          <span className="text-sm font-medium">{professional.rating}</span>
                          <span className="text-sm text-clinic-text-muted">
                            ({professional.reviewCount})
                          </span>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1">
                          {professional.availableDays.slice(0, 3).map((day) => (
                            <span
                              key={day}
                              className="text-xs px-2 py-0.5 rounded bg-clinic-surface text-clinic-text-muted"
                            >
                              {day.slice(0, 3)}
                            </span>
                          ))}
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
                  {selectedProfessional?.name} - {selectedSpecialty?.name}
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
                        const dayName = format(date, 'EEEE', { locale: ptBR });
                        const isAvailable = selectedProfessional?.availableDays.some(
                          (d) => d.toLowerCase() === dayName.toLowerCase()
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

            {/* Step 4: Confirmation */}
            {step === 'confirm' && (
              <div className="animate-fade-in">
                <h1 className="text-2xl font-bold mb-2">Confirme seus Dados</h1>
                <p className="text-clinic-text-secondary mb-8">
                  Revise as informações e preencha seus dados para finalizar
                </p>

                <div className="grid lg:grid-cols-2 gap-8">
                  {/* Summary */}
                  <div className="bg-background border border-clinic-border-subtle rounded-xl p-6">
                    <h3 className="font-semibold mb-4">Resumo do Agendamento</h3>

                    <div className="space-y-4">
                      <div className="flex items-start gap-4">
                        <img
                          src={selectedProfessional?.avatar}
                          alt={selectedProfessional?.name}
                          className="h-14 w-14 rounded-xl object-cover"
                        />
                        <div>
                          <p className="font-medium">{selectedProfessional?.name}</p>
                          <p className="text-sm text-clinic-text-secondary">
                            {selectedSpecialty?.name}
                          </p>
                          <div className="flex items-center gap-1 mt-1">
                            <Star className="h-3.5 w-3.5 fill-warning text-warning" />
                            <span className="text-sm">{selectedProfessional?.rating}</span>
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
                          <span>{booking.time} - {selectedSpecialty?.duration} minutos</span>
                        </div>
                      </div>

                      <div className="border-t border-clinic-border-subtle pt-4 flex items-center justify-between">
                        <span className="text-clinic-text-secondary">Valor da Consulta</span>
                        <span className="text-xl font-bold text-clinic-primary">
                          R$ {selectedSpecialty?.price.toFixed(2)}
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
                        <Label htmlFor="phone">WhatsApp *</Label>
                        <Input
                          id="phone"
                          placeholder="(11) 99999-9999"
                          value={booking.patientPhone}
                          onChange={(e) =>
                            setBooking((prev) => ({ ...prev, patientPhone: e.target.value }))
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="email">E-mail (opcional)</Label>
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

                      <div className="pt-4">
                        <Button
                          variant="clinic"
                          size="lg"
                          className="w-full"
                          onClick={handleConfirm}
                        >
                          <Phone className="h-4 w-4" />
                          Confirmar via WhatsApp
                        </Button>

                        <p className="text-xs text-clinic-text-muted text-center mt-3">
                          Você será redirecionado para o WhatsApp para confirmar seu agendamento
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
