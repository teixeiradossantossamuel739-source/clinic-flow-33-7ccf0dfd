import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { toast } from 'sonner';

export interface PendingRequest {
  id: string;
  patient_name: string;
  patient_email: string;
  patient_phone: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  notes: string | null;
  service?: {
    name: string;
    duration_minutes: number;
  };
}

export function usePendingRequests(professionalId: string | null) {
  const [requests, setRequests] = useState<PendingRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchRequests = useCallback(async () => {
    if (!professionalId) return;

    setIsLoading(true);
    try {
      const today = format(new Date(), 'yyyy-MM-dd');

      const { data, error } = await supabase
        .from('appointments')
        .select(`
          id,
          patient_name,
          patient_email,
          patient_phone,
          appointment_date,
          appointment_time,
          status,
          notes,
          service_id,
          services:service_id (
            name,
            duration_minutes
          )
        `)
        .eq('professional_uuid', professionalId)
        .in('status', ['pending', 'awaiting_confirmation'])
        .gte('appointment_date', today)
        .order('appointment_date', { ascending: true })
        .order('appointment_time', { ascending: true });

      if (error) throw error;

      const formattedData = (data || []).map(apt => ({
        ...apt,
        service: apt.services ? {
          name: (apt.services as any).name,
          duration_minutes: (apt.services as any).duration_minutes
        } : undefined
      }));

      setRequests(formattedData);
    } catch (error) {
      console.error('Error fetching pending requests:', error);
      toast.error('Erro ao carregar solicitações');
    } finally {
      setIsLoading(false);
    }
  }, [professionalId]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  // Real-time subscription
  useEffect(() => {
    if (!professionalId) return;

    const channel = supabase
      .channel('pending-requests')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments',
          filter: `professional_uuid=eq.${professionalId}`
        },
        () => {
          fetchRequests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [professionalId, fetchRequests]);

  const acceptRequest = async (id: string) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'confirmed' })
        .eq('id', id);

      if (error) throw error;

      setRequests(prev => prev.filter(r => r.id !== id));
      toast.success('Consulta confirmada!');
      return true;
    } catch (error) {
      console.error('Error accepting request:', error);
      toast.error('Erro ao confirmar consulta');
      return false;
    }
  };

  const rejectRequest = async (id: string) => {
    try {
      const { error } = await supabase
        .from('appointments')
        .update({ status: 'cancelled', payment_status: 'cancelled' })
        .eq('id', id);

      if (error) throw error;

      setRequests(prev => prev.filter(r => r.id !== id));
      toast.success('Solicitação recusada');
      return true;
    } catch (error) {
      console.error('Error rejecting request:', error);
      toast.error('Erro ao recusar solicitação');
      return false;
    }
  };

  const suggestNewTime = async (id: string, newTime: string, newDate?: string) => {
    try {
      const updateData: { appointment_time: string; appointment_date?: string } = {
        appointment_time: newTime
      };
      if (newDate) {
        updateData.appointment_date = newDate;
      }

      const { error } = await supabase
        .from('appointments')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      toast.success('Horário sugerido! Aguardando resposta do cliente.');
      fetchRequests();
      return true;
    } catch (error) {
      console.error('Error suggesting new time:', error);
      toast.error('Erro ao sugerir horário');
      return false;
    }
  };

  return { 
    requests, 
    isLoading, 
    acceptRequest, 
    rejectRequest, 
    suggestNewTime,
    refetch: fetchRequests
  };
}
