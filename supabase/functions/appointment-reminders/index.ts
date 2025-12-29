import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[APPOINTMENT-REMINDERS] ${step}${detailsStr}`);
};

// Format phone number to international format
function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('55') && digits.length >= 12) {
    return digits;
  }
  if (digits.length === 11 || digits.length === 10) {
    return `55${digits}`;
  }
  return digits;
}

// Format date to Brazilian format
function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
}

// Generate WhatsApp link with pre-filled message
function generateWhatsAppLink(phone: string, message: string): string {
  const formattedPhone = formatPhone(phone);
  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/${formattedPhone}?text=${encodedMessage}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started - Processing 24h reminders");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Calculate tomorrow's date
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    logStep("Searching appointments for date", { date: tomorrowStr });

    // Fetch confirmed appointments for tomorrow
    const { data: appointments, error: aptError } = await supabaseClient
      .from('appointments')
      .select(`
        id,
        patient_name,
        patient_phone,
        patient_email,
        appointment_date,
        appointment_time,
        professional_uuid,
        service_id,
        status,
        confirmation_token
      `)
      .eq('appointment_date', tomorrowStr)
      .eq('status', 'confirmed');

    if (aptError) {
      logStep("Error fetching appointments", { error: aptError.message });
      throw aptError;
    }

    logStep("Found appointments", { count: appointments?.length || 0 });

    if (!appointments || appointments.length === 0) {
      return new Response(JSON.stringify({ 
        success: true,
        message: "Nenhuma consulta encontrada para amanhã",
        reminders_sent: 0
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const reminders = [];

    for (const appointment of appointments) {
      try {
        // Fetch professional details
        const { data: professional, error: profError } = await supabaseClient
          .from('professionals')
          .select('id, name, phone, user_id')
          .eq('id', appointment.professional_uuid)
          .single();

        if (profError || !professional) {
          logStep("Professional not found for appointment", { appointmentId: appointment.id });
          continue;
        }

        // Check professional preferences
        const { data: preferences } = await supabaseClient
          .from('professional_preferences')
          .select('notify_reminder_24h, whatsapp_auto_message')
          .eq('professional_id', professional.id)
          .maybeSingle();

        // Skip if reminders are disabled for this professional
        if (preferences && preferences.notify_reminder_24h === false) {
          logStep("Reminders disabled for professional", { professionalId: professional.id });
          continue;
        }

        // Fetch service name if available
        let serviceName = '';
        if (appointment.service_id) {
          const { data: service } = await supabaseClient
            .from('services')
            .select('name')
            .eq('id', appointment.service_id)
            .single();
          serviceName = service?.name || '';
        }

        const formattedDate = formatDate(appointment.appointment_date);
        const formattedTime = appointment.appointment_time.slice(0, 5);

        // Get base URL for confirmation link
        const baseUrl = Deno.env.get("APP_URL") || "https://unlkencwjcnlworjeexw.supabase.co";
        const confirmationUrl = appointment.confirmation_token 
          ? `${baseUrl}/confirmar-presenca?token=${appointment.confirmation_token}`
          : '';

        // Message for patient with confirmation link
        const patientMessage = `*Lembrete de Consulta*

Ola ${appointment.patient_name}!

Lembramos que voce tem uma consulta agendada:

*Data:* ${formattedDate}
*Horario:* ${formattedTime}
*Profissional:* ${professional.name}
${serviceName ? `*Servico:* ${serviceName}` : ''}

${confirmationUrl ? `*Confirme sua presenca:*\n${confirmationUrl}\n` : ''}
Em caso de imprevisto, por favor avise com antecedencia.

Aguardamos voce!`;

        const patientWhatsAppLink = generateWhatsAppLink(appointment.patient_phone, patientMessage);

        // Store reminder info
        const reminderInfo = {
          appointmentId: appointment.id,
          patientName: appointment.patient_name,
          patientPhone: appointment.patient_phone,
          professionalName: professional.name,
          professionalId: professional.id,
          appointmentDate: formattedDate,
          appointmentTime: formattedTime,
          serviceName,
          patientWhatsAppLink,
          autoMessage: preferences?.whatsapp_auto_message || false
        };

        reminders.push(reminderInfo);

        logStep("Reminder prepared", { 
          appointmentId: appointment.id, 
          patient: appointment.patient_name 
        });

      } catch (err) {
        logStep("Error processing appointment", { 
          appointmentId: appointment.id, 
          error: err instanceof Error ? err.message : String(err) 
        });
      }
    }

    logStep("Reminders processing complete", { total: reminders.length });

    return new Response(JSON.stringify({ 
      success: true,
      message: `${reminders.length} lembretes processados`,
      reminders_sent: reminders.length,
      reminders: reminders
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ 
      success: false,
      error: errorMessage 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});