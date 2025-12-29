import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AppointmentPayload {
  id: string;
  patient_name: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  professional_uuid: string;
}

export const useAppointmentNotifications = (professionalId: string | null) => {
  const { toast } = useToast();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    if (!professionalId) return;

    // Clean up previous channel if exists
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }

    const channel = supabase
      .channel(`appointments-${professionalId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'appointments',
          filter: `professional_uuid=eq.${professionalId}`,
        },
        (payload) => {
          const newAppointment = payload.new as AppointmentPayload;
          
          // Format date for display
          const date = new Date(newAppointment.appointment_date);
          const formattedDate = date.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
          });

          toast({
            title: '🔔 Novo Agendamento!',
            description: `${newAppointment.patient_name} agendou para ${formattedDate} às ${newAppointment.appointment_time.slice(0, 5)}`,
            duration: 8000,
          });

          // Play notification sound
          try {
            const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdW+PjYKHhoeKfXd6goV6cXODg3x0c317dnBxfH57c3B0eXl1cXN1d3l2cXN0dnR0dHZ2');
            audio.volume = 0.5;
            audio.play().catch(() => {});
          } catch {}
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'appointments',
          filter: `professional_uuid=eq.${professionalId}`,
        },
        (payload) => {
          const updated = payload.new as AppointmentPayload;
          const old = payload.old as Partial<AppointmentPayload>;

          // Only notify on status changes
          if (old.status !== updated.status) {
            const statusLabels: Record<string, string> = {
              pending: 'pendente',
              confirmed: 'confirmado',
              cancelled: 'cancelado',
              completed: 'concluído',
              awaiting_confirmation: 'aguardando confirmação',
            };

            toast({
              title: '📋 Agendamento Atualizado',
              description: `${updated.patient_name}: ${statusLabels[updated.status] || updated.status}`,
              duration: 5000,
            });
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [professionalId, toast]);
};
