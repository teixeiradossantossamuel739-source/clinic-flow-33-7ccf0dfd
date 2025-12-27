import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[VERIFY-PAYMENT] ${step}${detailsStr}`);
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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { sessionId, appointmentId } = await req.json();
    logStep("Request data", { sessionId, appointmentId });

    if (!sessionId) {
      throw new Error("Session ID is required");
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Retrieve the checkout session
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    logStep("Session retrieved", { 
      paymentStatus: session.payment_status,
      status: session.status 
    });

    if (session.payment_status === 'paid') {
      // Update appointment status
      const { error: updateError } = await supabaseClient
        .from('appointments')
        .update({ 
          payment_status: 'paid',
          status: 'confirmed',
          stripe_payment_intent_id: session.payment_intent as string
        })
        .eq('id', appointmentId);

      if (updateError) {
        logStep("Error updating appointment", { error: updateError });
        throw new Error(`Failed to update appointment: ${updateError.message}`);
      }

      logStep("Appointment updated to paid");

      // Get appointment details with professional info
      const { data: appointment } = await supabaseClient
        .from('appointments')
        .select('*')
        .eq('id', appointmentId)
        .single();

      // Get professional phone number
      let professionalPhone = null;
      let whatsappLink = null;
      
      if (appointment?.professional_uuid) {
        const { data: professional } = await supabaseClient
          .from('professionals')
          .select('phone, name')
          .eq('id', appointment.professional_uuid)
          .single();
        
        if (professional?.phone) {
          professionalPhone = professional.phone;
          
          // Generate WhatsApp message for professional
          const formattedDate = formatDate(appointment.appointment_date);
          const message = `🔔 *Novo Agendamento Confirmado!*

📋 *Paciente:* ${appointment.patient_name}
📱 *WhatsApp:* ${appointment.patient_phone || 'Não informado'}
📧 *Email:* ${appointment.patient_email}
📅 *Data:* ${formattedDate}
⏰ *Horário:* ${appointment.appointment_time}
💰 *Valor:* R$ ${(appointment.amount_cents / 100).toFixed(2)}

✅ Pagamento confirmado via Stripe.`;

          const formattedPhone = formatPhone(professionalPhone);
          whatsappLink = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
          
          logStep("WhatsApp link generated for professional", { professionalName: professional.name });
        }
      }

      return new Response(JSON.stringify({ 
        success: true,
        paid: true,
        appointment,
        whatsappLink,
        professionalPhone
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    return new Response(JSON.stringify({ 
      success: true,
      paid: false,
      status: session.payment_status
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
