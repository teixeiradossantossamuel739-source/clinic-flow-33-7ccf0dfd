import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, XCircle, Calendar, Clock, User, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface AppointmentDetails {
  id: string;
  patient_name: string;
  appointment_date: string;
  appointment_time: string;
  patient_confirmed_at: string | null;
  status: string;
  professional_uuid?: string;
  professional?: {
    name: string;
  };
  service?: {
    name: string;
  };
}

export default function ConfirmAppointment() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [appointment, setAppointment] = useState<AppointmentDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    if (!token) {
      setError('Token de confirmação não encontrado');
      setLoading(false);
      return;
    }

    fetchAppointment();
  }, [token]);

  const fetchAppointment = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('appointments')
        .select(`
          id,
          patient_name,
          appointment_date,
          appointment_time,
          patient_confirmed_at,
          status,
          professional_uuid
        `)
        .eq('confirmation_token', token)
        .maybeSingle();

      if (fetchError) throw fetchError;
      
      if (!data) {
        setError('Consulta não encontrada ou token inválido');
        return;
      }

      // Fetch professional name separately
      let professionalName = '';
      if (data.professional_uuid) {
        const { data: prof } = await supabase
          .from('professionals')
          .select('name')
          .eq('id', data.professional_uuid)
          .maybeSingle();
        professionalName = prof?.name || '';
      }

      setAppointment({
        ...data,
        professional: { name: professionalName }
      });

      if (data.patient_confirmed_at) {
        setConfirmed(true);
      }
    } catch (err) {
      console.error('Error fetching appointment:', err);
      setError('Erro ao carregar detalhes da consulta');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!appointment) return;
    
    setConfirming(true);
    try {
      const { error: updateError } = await supabase
        .from('appointments')
        .update({ patient_confirmed_at: new Date().toISOString() })
        .eq('confirmation_token', token);

      if (updateError) throw updateError;

      // Create notification for professional
      if (appointment.professional_uuid) {
        const formattedDate = formatDate(appointment.appointment_date);
        const formattedTime = appointment.appointment_time.slice(0, 5);
        
        await supabase
          .from('notifications')
          .insert({
            professional_id: appointment.professional_uuid,
            type: 'patient_confirmed',
            title: 'Presenca Confirmada',
            message: `${appointment.patient_name} confirmou presenca para ${formattedDate} as ${formattedTime}`,
            appointment_id: appointment.id
          });
      }

      setConfirmed(true);
    } catch (err) {
      console.error('Error confirming appointment:', err);
      setError('Erro ao confirmar presença. Tente novamente.');
    } finally {
      setConfirming(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    return format(date, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
                <XCircle className="h-8 w-8 text-destructive" />
              </div>
              <h2 className="text-xl font-semibold">Erro</h2>
              <p className="text-muted-foreground">{error}</p>
              <Button onClick={() => navigate('/home')} variant="outline">
                Voltar ao Início
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (confirmed) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="flex flex-col items-center gap-4 text-center">
              <div className="h-16 w-16 rounded-full bg-green-500/10 flex items-center justify-center">
                <CheckCircle className="h-8 w-8 text-green-500" />
              </div>
              <h2 className="text-xl font-semibold">Presença Confirmada!</h2>
              <p className="text-muted-foreground">
                Obrigado, {appointment?.patient_name}! Sua presença foi confirmada.
              </p>
              {appointment && (
                <div className="w-full mt-4 p-4 rounded-lg bg-muted/50 space-y-2 text-left">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-4 w-4 text-primary" />
                    <span className="capitalize">{formatDate(appointment.appointment_date)}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="h-4 w-4 text-primary" />
                    <span>{appointment.appointment_time.slice(0, 5)}</span>
                  </div>
                  {appointment.professional?.name && (
                    <div className="flex items-center gap-2 text-sm">
                      <User className="h-4 w-4 text-primary" />
                      <span>{appointment.professional.name}</span>
                    </div>
                  )}
                </div>
              )}
              <p className="text-sm text-muted-foreground mt-2">
                Aguardamos você no horário agendado!
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle>Confirmar Presença</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-6">
            <p className="text-center text-muted-foreground">
              Olá, <strong>{appointment?.patient_name}</strong>! Por favor, confirme sua presença na consulta:
            </p>
            
            {appointment && (
              <div className="w-full p-4 rounded-lg bg-muted/50 space-y-3">
                <div className="flex items-center gap-3">
                  <Calendar className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Data</p>
                    <p className="font-medium capitalize">{formatDate(appointment.appointment_date)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-primary" />
                  <div>
                    <p className="text-sm text-muted-foreground">Horário</p>
                    <p className="font-medium">{appointment.appointment_time.slice(0, 5)}</p>
                  </div>
                </div>
                {appointment.professional?.name && (
                  <div className="flex items-center gap-3">
                    <User className="h-5 w-5 text-primary" />
                    <div>
                      <p className="text-sm text-muted-foreground">Profissional</p>
                      <p className="font-medium">{appointment.professional.name}</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            <Button 
              onClick={handleConfirm} 
              disabled={confirming}
              className="w-full"
              size="lg"
            >
              {confirming ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Confirmando...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Confirmar Presença
                </>
              )}
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              Ao confirmar, você nos ajuda a organizar melhor nossa agenda.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
