import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { format, isSameDay } from 'date-fns';
import { parseLocalDate } from '@/lib/dateUtils';

export type SimpleSlotStatus = 'available' | 'occupied' | 'pending' | 'blocked';

export interface DaySlot {
  time: string;
  status: SimpleSlotStatus;
  appointment?: {
    id: string;
    patient_name: string;
    service_name?: string;
  };
  blockedReason?: string;
}

interface Schedule {
  day_of_week: number;
  start_time: string;
  end_time: string;
  slot_duration_minutes: number;
  is_active: boolean;
}

interface BlockedTime {
  id: string;
  block_date: string;
  start_time: string | null;
  end_time: string | null;
  reason: string | null;
}

interface Appointment {
  id: string;
  patient_name: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  service?: {
    name: string;
  };
}

export function useDaySchedule(professionalId: string | null, date: Date) {
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [blockedTimes, setBlockedTimes] = useState<BlockedTime[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    if (!professionalId) return;

    setIsLoading(true);
    try {
      const dateStr = format(date, 'yyyy-MM-dd');

      // Fetch all data in parallel
      const [schedulesRes, appointmentsRes, blockedRes] = await Promise.all([
        supabase
          .from('professional_schedules')
          .select('*')
          .eq('professional_id', professionalId),
        supabase
          .from('appointments')
          .select(`
            id,
            patient_name,
            appointment_date,
            appointment_time,
            status,
            service_id,
            services:service_id (name)
          `)
          .eq('professional_uuid', professionalId)
          .eq('appointment_date', dateStr)
          .neq('status', 'cancelled'),
        supabase
          .from('professional_blocked_times')
          .select('*')
          .eq('professional_id', professionalId)
          .eq('block_date', dateStr)
      ]);

      if (schedulesRes.error) throw schedulesRes.error;
      if (appointmentsRes.error) throw appointmentsRes.error;
      if (blockedRes.error) throw blockedRes.error;

      setSchedules(schedulesRes.data || []);
      setAppointments(
        (appointmentsRes.data || []).map(apt => ({
          ...apt,
          service: apt.services ? { name: (apt.services as any).name } : undefined
        }))
      );
      setBlockedTimes(blockedRes.data || []);
    } catch (error) {
      console.error('Error fetching day schedule:', error);
    } finally {
      setIsLoading(false);
    }
  }, [professionalId, date]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const slots = useMemo((): DaySlot[] => {
    const dayOfWeek = date.getDay();
    const schedule = schedules.find(s => s.day_of_week === dayOfWeek && s.is_active);

    if (!schedule) return [];

    const result: DaySlot[] = [];
    const startTime = schedule.start_time.substring(0, 5);
    const endTime = schedule.end_time.substring(0, 5);

    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    const slotDuration = schedule.slot_duration_minutes || 30;

    for (let m = startMinutes; m < endMinutes; m += slotDuration) {
      const h = Math.floor(m / 60);
      const min = m % 60;
      const timeStr = `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;

      // Check if blocked
      const blockedTime = blockedTimes.find(bt => {
        if (!bt.start_time && !bt.end_time) return true; // Full day block
        const blockStart = bt.start_time?.substring(0, 5) || '00:00';
        const blockEnd = bt.end_time?.substring(0, 5) || '23:59';
        return timeStr >= blockStart && timeStr < blockEnd;
      });

      if (blockedTime) {
        result.push({
          time: timeStr,
          status: 'blocked',
          blockedReason: blockedTime.reason || undefined
        });
        continue;
      }

      // Check if appointment exists
      const appointment = appointments.find(apt => {
        const aptTime = apt.appointment_time.substring(0, 5);
        return aptTime === timeStr;
      });

      if (appointment) {
        // Simplify status: pending/awaiting_confirmation -> pending, confirmed/completed -> occupied
        const simpleStatus: SimpleSlotStatus = 
          ['pending', 'awaiting_confirmation'].includes(appointment.status) 
            ? 'pending' 
            : 'occupied';

        result.push({
          time: timeStr,
          status: simpleStatus,
          appointment: {
            id: appointment.id,
            patient_name: appointment.patient_name,
            service_name: appointment.service?.name
          }
        });
        continue;
      }

      // Available slot
      result.push({
        time: timeStr,
        status: 'available'
      });
    }

    return result;
  }, [date, schedules, appointments, blockedTimes]);

  return { slots, isLoading, refetch: fetchData };
}
