import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { parseLocalDate } from '@/lib/dateUtils';
import { CheckCircle2, Calendar, Clock, User, Loader2, Home, MessageCircle, Send } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AppointmentDetails {
  id: string;
  patient_name: string;
  patient_email: string;
  patient_phone: string;
  appointment_date: string;
  appointment_time: string;
  professional_id: string;
  amount_cents: number;
  status: string;
  payment_status: string;
}

export default function BookingSuccessPage() {
  const [searchParams] = useSearchParams();
  const appointmentId = searchParams.get('appointment_id');
  const sessionId = searchParams.get('session_id');
  
  const [loading, setLoading] = useState(true);
  const [appointment, setAppointment] = useState<AppointmentDetails | null>(null);
  const [verified, setVerified] = useState(false);
  const [whatsappLink, setWhatsappLink] = useState<string | null>(null);
  const [notificationSent, setNotificationSent] = useState(false);

  useEffect(() => {
    async function verifyPayment() {
      if (!sessionId || !appointmentId) {
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke('verify-payment', {
          body: { sessionId, appointmentId }
        });

        if (error) throw error;

        if (data?.paid && data?.appointment) {
          setAppointment(data.appointment);
          setVerified(true);
          
          if (data?.whatsappLink) {
            setWhatsappLink(data.whatsappLink);
          }
          
          toast.success('Pagamento confirmado! Seu agendamento está garantido.');
        } else {
          toast.error('Pagamento ainda não confirmado. Verifique em alguns minutos.');
        }
      } catch (error) {
        console.error('Verification error:', error);
        toast.error('Erro ao verificar pagamento');
      } finally {
        setLoading(false);
      }
    }

    verifyPayment();
  }, [sessionId, appointmentId]);

  const handleSendWhatsApp = () => {
    if (whatsappLink) {
      window.open(whatsappLink, '_blank');
      setNotificationSent(true);
      toast.success('WhatsApp aberto! Envie a mensagem para notificar o profissional.');
    }
  };

  if (loading) {
    return (
      <PublicLayout>
        <div className="min-h-[calc(100vh-200px)] flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-clinic-primary mx-auto mb-4" />
            <p className="text-clinic-text-secondary">Verificando seu pagamento...</p>
          </div>
        </div>
      </PublicLayout>
    );
  }

  if (!verified || !appointment) {
    return (
      <PublicLayout>
        <div className="min-h-[calc(100vh-200px)] flex items-center justify-center">
          <div className="text-center max-w-md">
            <div className="h-16 w-16 rounded-full bg-warning/10 flex items-center justify-center mx-auto mb-4">
              <Clock className="h-8 w-8 text-warning" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Aguardando Confirmação</h1>
            <p className="text-clinic-text-secondary mb-6">
              Seu pagamento está sendo processado. Isso pode levar alguns segundos.
            </p>
            <Button asChild variant="outline">
              <Link to="/">
                <Home className="h-4 w-4 mr-2" />
                Voltar ao Início
              </Link>
            </Button>
          </div>
        </div>
      </PublicLayout>
    );
  }

  return (
    <PublicLayout>
      <div className="min-h-[calc(100vh-200px)] bg-clinic-surface">
        <div className="container py-12 lg:py-16">
          <div className="max-w-2xl mx-auto">
            {/* Success Header */}
            <div className="text-center mb-8">
              <div className="h-20 w-20 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-6 animate-scale-in">
                <CheckCircle2 className="h-10 w-10 text-success" />
              </div>
              <h1 className="text-3xl font-bold mb-2">Agendamento Confirmado!</h1>
              <p className="text-clinic-text-secondary">
                Seu pagamento foi processado com sucesso. Veja os detalhes abaixo.
              </p>
            </div>

            {/* WhatsApp Notification Card */}
            {whatsappLink && !notificationSent && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-6 mb-6">
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-full bg-green-500 flex items-center justify-center shrink-0">
                    <MessageCircle className="h-6 w-6 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-green-800 mb-1">Notificar o Profissional</h3>
                    <p className="text-sm text-green-700 mb-3">
                      Clique no botão abaixo para enviar uma notificação via WhatsApp para o profissional sobre seu agendamento.
                    </p>
                    <Button onClick={handleSendWhatsApp} className="bg-green-600 hover:bg-green-700">
                      <Send className="h-4 w-4 mr-2" />
                      Enviar WhatsApp para o Profissional
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {notificationSent && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6 flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <span className="text-green-700">Notificação de WhatsApp enviada!</span>
              </div>
            )}

            {/* Appointment Details Card */}
            <div className="bg-background border border-clinic-border-subtle rounded-xl p-6 mb-6">
              <h2 className="font-semibold text-lg mb-4">Detalhes do Agendamento</h2>
              
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-clinic-primary/10 flex items-center justify-center">
                    <User className="h-5 w-5 text-clinic-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-clinic-text-muted">Paciente</p>
                    <p className="font-medium">{appointment.patient_name}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-clinic-primary/10 flex items-center justify-center">
                    <Calendar className="h-5 w-5 text-clinic-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-clinic-text-muted">Data</p>
                    <p className="font-medium">
                      {format(parseLocalDate(appointment.appointment_date), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-clinic-primary/10 flex items-center justify-center">
                    <Clock className="h-5 w-5 text-clinic-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-clinic-text-muted">Horário</p>
                    <p className="font-medium">{appointment.appointment_time}</p>
                  </div>
                </div>

                <div className="border-t border-clinic-border-subtle pt-4 mt-4">
                  <div className="flex items-center justify-between">
                    <span className="text-clinic-text-secondary">Valor Pago</span>
                    <span className="text-xl font-bold text-success">
                      R$ {(appointment.amount_cents / 100).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Info Card */}
            <div className="bg-clinic-primary/5 border border-clinic-primary/20 rounded-xl p-6 mb-8">
              <h3 className="font-semibold mb-2">Próximos Passos</h3>
              <ul className="space-y-2 text-sm text-clinic-text-secondary">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-clinic-primary mt-0.5 shrink-0" />
                  <span>Um email de confirmação foi enviado para {appointment.patient_email}</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-clinic-primary mt-0.5 shrink-0" />
                  <span>O profissional será notificado sobre seu agendamento</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-clinic-primary mt-0.5 shrink-0" />
                  <span>Chegue 15 minutos antes do horário marcado</span>
                </li>
              </ul>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild variant="outline" size="lg">
                <Link to="/">
                  <Home className="h-4 w-4" />
                  Voltar ao Início
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </PublicLayout>
  );
}
