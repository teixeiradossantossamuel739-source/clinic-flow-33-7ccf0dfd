import { useEffect, useRef, useState } from 'react';
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

interface NotificationPayload {
  id: string;
  professional_id: string;
  type: string;
  title: string;
  message: string;
  appointment_id: string | null;
  read_at: string | null;
  created_at: string;
}

export const useAppointmentNotifications = (professionalId: string | null) => {
  const { toast } = useToast();
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const notifChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);

  // Fetch unread notification count
  useEffect(() => {
    if (!professionalId) return;

    const fetchUnreadCount = async () => {
      const { count } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('professional_id', professionalId)
        .is('read_at', null);
      
      setUnreadCount(count || 0);
    };

    fetchUnreadCount();
  }, [professionalId]);

  useEffect(() => {
    if (!professionalId) return;

    // Clean up previous channels if exist
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
    }
    if (notifChannelRef.current) {
      supabase.removeChannel(notifChannelRef.current);
    }

    // Listen for appointment changes
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
          
          const date = new Date(newAppointment.appointment_date);
          const formattedDate = date.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
          });

          toast({
            title: 'Novo Agendamento!',
            description: `${newAppointment.patient_name} agendou para ${formattedDate} as ${newAppointment.appointment_time.slice(0, 5)}`,
            duration: 8000,
          });

          playNotificationSound();
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

          if (old.status !== updated.status) {
            const statusLabels: Record<string, string> = {
              pending: 'pendente',
              confirmed: 'confirmado',
              cancelled: 'cancelado',
              completed: 'concluido',
              awaiting_confirmation: 'aguardando confirmacao',
            };

            toast({
              title: 'Agendamento Atualizado',
              description: `${updated.patient_name}: ${statusLabels[updated.status] || updated.status}`,
              duration: 5000,
            });
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    // Listen for notifications (patient confirmations, etc.)
    const notifChannel = supabase
      .channel(`notifications-${professionalId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `professional_id=eq.${professionalId}`,
        },
        (payload) => {
          const notification = payload.new as NotificationPayload;
          
          setUnreadCount(prev => prev + 1);

          toast({
            title: notification.title,
            description: notification.message,
            duration: 8000,
          });

          playNotificationSound();
        }
      )
      .subscribe();

    notifChannelRef.current = notifChannel;

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
      if (notifChannelRef.current) {
        supabase.removeChannel(notifChannelRef.current);
        notifChannelRef.current = null;
      }
    };
  }, [professionalId, toast]);

  const markAsRead = async (notificationId: string) => {
    await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', notificationId);
    
    setUnreadCount(prev => Math.max(0, prev - 1));
  };

  const markAllAsRead = async () => {
    if (!professionalId) return;
    
    await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('professional_id', professionalId)
      .is('read_at', null);
    
    setUnreadCount(0);
  };

  return { unreadCount, markAsRead, markAllAsRead };
};

function playNotificationSound() {
  try {
    const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdW+PjYKHhoeKfXd6goV6cXODg3x0c317dnBxfH57c3B0eXl1cXN1d3l2cXN0dnR0dHZ2');
    audio.volume = 0.5;
    audio.play().catch(() => {});
  } catch {}
}
