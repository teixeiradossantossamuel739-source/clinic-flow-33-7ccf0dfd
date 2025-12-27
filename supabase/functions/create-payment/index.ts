import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-PAYMENT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const mpAccessToken = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN");
    if (!mpAccessToken) throw new Error("MERCADOPAGO_ACCESS_TOKEN is not set");
    logStep("Mercado Pago token verified");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { 
      serviceName,
      servicePrice,
      professionalName,
      professionalId,
      appointmentDate,
      appointmentTime,
      patientName,
      patientEmail,
      patientPhone
    } = await req.json();

    logStep("Request data received", { 
      serviceName, 
      servicePrice, 
      professionalName,
      appointmentDate,
      appointmentTime,
      patientName,
      patientEmail
    });

    // Validate required fields
    if (!servicePrice || !patientEmail || !patientName || !appointmentDate || !appointmentTime) {
      throw new Error("Missing required fields");
    }

    // Check if time slot is still available
    const { data: existingAppointments, error: checkError } = await supabaseClient
      .from('appointments')
      .select('id')
      .eq('professional_id', professionalId)
      .eq('appointment_date', appointmentDate)
      .eq('appointment_time', appointmentTime)
      .not('status', 'eq', 'cancelled');

    if (checkError) {
      logStep("Error checking availability", { error: checkError });
      throw new Error("Failed to check availability");
    }

    if (existingAppointments && existingAppointments.length > 0) {
      logStep("Time slot already taken", { existingAppointments });
      throw new Error("Este horário já está reservado. Por favor, escolha outro horário.");
    }

    logStep("Time slot is available");

    // Create appointment record first
    const { data: appointment, error: appointmentError } = await supabaseClient
      .from('appointments')
      .insert({
        professional_id: professionalId,
        professional_uuid: professionalId,
        patient_name: patientName,
        patient_email: patientEmail,
        patient_phone: patientPhone || '',
        appointment_date: appointmentDate,
        appointment_time: appointmentTime,
        status: 'pending',
        payment_status: 'pending',
        amount_cents: servicePrice
      })
      .select()
      .single();

    if (appointmentError) {
      logStep("Error creating appointment", { error: appointmentError });
      throw new Error(`Failed to create appointment: ${appointmentError.message}`);
    }

    logStep("Appointment created", { appointmentId: appointment.id });

    const origin = req.headers.get("origin") || "http://localhost:5173";

    // Create Mercado Pago preference
    const preferenceData = {
      items: [
        {
          title: serviceName || "Consulta",
          description: `Consulta com ${professionalName} em ${appointmentDate} às ${appointmentTime}`,
          quantity: 1,
          currency_id: "BRL",
          unit_price: servicePrice / 100, // Convert from cents to reais
        },
      ],
      payer: {
        name: patientName,
        email: patientEmail,
        phone: patientPhone ? {
          number: patientPhone.replace(/\D/g, ''),
        } : undefined,
      },
      back_urls: {
        success: `${origin}/agendamento-sucesso?appointment_id=${appointment.id}`,
        failure: `${origin}/agendar?canceled=true`,
        pending: `${origin}/agendamento-sucesso?appointment_id=${appointment.id}&pending=true`,
      },
      auto_return: "approved",
      external_reference: appointment.id,
      notification_url: `${Deno.env.get("SUPABASE_URL")}/functions/v1/mercadopago-webhook`,
      payment_methods: {
        excluded_payment_types: [],
        installments: 1,
      },
      statement_descriptor: "CONSULTA SAUDE",
    };

    logStep("Creating Mercado Pago preference", { preferenceData });

    const mpResponse = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${mpAccessToken}`,
      },
      body: JSON.stringify(preferenceData),
    });

    if (!mpResponse.ok) {
      const errorData = await mpResponse.text();
      logStep("Mercado Pago error", { status: mpResponse.status, error: errorData });
      throw new Error(`Mercado Pago error: ${errorData}`);
    }

    const preference = await mpResponse.json();
    logStep("Mercado Pago preference created", { preferenceId: preference.id, initPoint: preference.init_point });

    // Update appointment with preference ID
    await supabaseClient
      .from('appointments')
      .update({ stripe_session_id: preference.id }) // Reusing stripe_session_id field for MP preference ID
      .eq('id', appointment.id);

    return new Response(JSON.stringify({ 
      url: preference.init_point,
      appointmentId: appointment.id 
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
