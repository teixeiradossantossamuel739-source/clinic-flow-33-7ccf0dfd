import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";
import { MercadoPagoConfig, Preference } from "https://esm.sh/mercadopago@2.0.15";

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

    // Best-effort: release abandoned pending reservations for this exact slot
    // so users can retry payment without being blocked.
    const staleCutoffIso = new Date(Date.now() - 15 * 60 * 1000).toISOString();

    try {
      const { error: expireError } = await supabaseClient
        .from('appointments')
        .update({
          status: 'cancelled',
          payment_status: 'expired',
          notes: 'Reserva pendente expirada automaticamente (timeout).',
        })
        .eq('professional_id', professionalId)
        .eq('appointment_date', appointmentDate)
        .eq('appointment_time', appointmentTime)
        .eq('status', 'pending')
        .eq('payment_status', 'pending')
        .lt('created_at', staleCutoffIso);

      if (expireError) {
        logStep('Failed to expire stale pending appointment', { error: expireError });
      }
    } catch (expireErr) {
      logStep('Failed to expire stale pending appointment (exception)', { expireErr });
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

    // Initialize Mercado Pago SDK
    const client = new MercadoPagoConfig({ accessToken: mpAccessToken });
    const preferenceApi = new Preference(client);

    // Create Mercado Pago preference using SDK
    const preferenceData = {
      items: [
        {
          id: appointment.id,
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
        installments: 1,
      },
      statement_descriptor: "CONSULTA SAUDE",
    };

    logStep("Creating Mercado Pago preference with SDK", { preferenceData });

    let preference;
    try {
      preference = await preferenceApi.create({ body: preferenceData });
      logStep("Mercado Pago preference created", { preferenceId: preference.id, initPoint: preference.init_point });
    } catch (mpError: any) {
      logStep("Mercado Pago SDK error", { error: mpError.message, cause: mpError.cause });

      // Cancel appointment if MP fails
      try {
        await supabaseClient
          .from('appointments')
          .update({
            status: 'cancelled',
            payment_status: 'failed',
            notes: `Mercado Pago error: ${mpError.message}`.slice(0, 1000),
          })
          .eq('id', appointment.id);
      } catch (cleanupErr) {
        logStep("Failed to cancel appointment after MP error", { cleanupErr });
      }

      throw new Error(
        mpError.message?.includes("UNAUTHORIZED") || mpError.cause?.status === 403
          ? "Pagamento bloqueado pelo Mercado Pago. Verifique se seu Access Token é de PRODUÇÃO e se a conta está habilitada."
          : `Mercado Pago error: ${mpError.message}`
      );
    }

    // Update appointment with preference ID
    await supabaseClient
      .from('appointments')
      .update({ stripe_session_id: preference.id })
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
