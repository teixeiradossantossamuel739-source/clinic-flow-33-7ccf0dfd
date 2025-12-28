import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  console.log(`[CREATE-PIX-PAYMENT] ${step}`, details ? JSON.stringify(details) : "");
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const abacatePayToken = Deno.env.get("ABACATEPAY_API_KEY");
    if (!abacatePayToken) {
      throw new Error("ABACATEPAY_API_KEY not configured");
    }
    logStep("AbacatePay token verified");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    const {
      serviceName,
      servicePrice,
      serviceId,
      professionalName,
      professionalId,
      appointmentDate,
      appointmentTime,
      patientName,
      patientEmail,
      patientPhone,
      patientCpf,
    } = await req.json();

    logStep("Request data received", {
      serviceName,
      servicePrice,
      professionalName,
      appointmentDate,
      appointmentTime,
      patientName,
      patientEmail,
    });

    // Validate required fields
    if (!servicePrice || !patientEmail || !patientName || !appointmentDate || !appointmentTime || !patientCpf) {
      throw new Error("Missing required fields");
    }

    // Best-effort: release abandoned pending reservations for this exact slot
    const staleCutoffIso = new Date(Date.now() - 15 * 60 * 1000).toISOString();

    try {
      await supabaseClient
        .from("appointments")
        .update({
          status: "cancelled",
          payment_status: "expired",
          notes: "Reserva pendente expirada automaticamente (timeout).",
        })
        .eq("professional_id", professionalId)
        .eq("appointment_date", appointmentDate)
        .eq("appointment_time", appointmentTime)
        .eq("status", "pending")
        .eq("payment_status", "pending")
        .lt("created_at", staleCutoffIso);
    } catch (expireErr) {
      logStep("Failed to expire stale pending appointment", { expireErr });
    }

    // Check if time slot is still available
    const { data: existingAppointments, error: checkError } = await supabaseClient
      .from("appointments")
      .select("id")
      .eq("professional_id", professionalId)
      .eq("appointment_date", appointmentDate)
      .eq("appointment_time", appointmentTime)
      .not("status", "eq", "cancelled")
      .not("payment_status", "eq", "expired");

    if (checkError) {
      logStep("Error checking existing appointments", { error: checkError });
      throw new Error("Failed to check appointment availability");
    }

    if (existingAppointments && existingAppointments.length > 0) {
      logStep("Time slot already taken", { existingAppointments });
      throw new Error("Este horário já está reservado. Por favor, escolha outro horário.");
    }

    logStep("Time slot is available");

    // Create appointment in pending state
    const { data: appointment, error: appointmentError } = await supabaseClient
      .from("appointments")
      .insert({
        service_id: serviceId || null,
        professional_id: professionalId,
        professional_uuid: professionalId,
        appointment_date: appointmentDate,
        appointment_time: appointmentTime,
        patient_name: patientName,
        patient_email: patientEmail,
        patient_phone: patientPhone || "",
        amount_cents: servicePrice,
        status: "pending",
        payment_status: "pending",
        notes: `CPF: ${patientCpf}`,
      })
      .select()
      .single();

    if (appointmentError) {
      logStep("Failed to create appointment", { error: appointmentError });
      throw new Error("Failed to create appointment");
    }

    logStep("Appointment created", { appointmentId: appointment.id });

    // Get the base URL for callbacks
    const origin = req.headers.get("origin") || "https://unlkencwjcnlworjeexw.lovableproject.com";
    const webhookUrl = `${supabaseUrl}/functions/v1/abacatepay-webhook`;

    // Convert price to BRL (cents to reais)
    const priceInCents = Math.round(servicePrice);

    // Create AbacatePay billing
    const billingData = {
      frequency: "ONE_TIME",
      methods: ["PIX"],
      products: [
        {
          externalId: appointment.id,
          name: serviceName,
          description: `Consulta com ${professionalName} em ${appointmentDate} às ${appointmentTime}`,
          quantity: 1,
          price: priceInCents,
        },
      ],
      metadata: {
        appointment_id: appointment.id,
      },
      returnUrl: `${origin}/agendamento-sucesso?appointment_id=${appointment.id}`,
      completionUrl: `${origin}/agendamento-sucesso?appointment_id=${appointment.id}`,
    };

    logStep("Creating AbacatePay billing", { billingData });

    const abacateResponse = await fetch("https://api.abacatepay.com/v1/billing/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${abacatePayToken}`,
      },
      body: JSON.stringify(billingData),
    });

    const abacateResult = await abacateResponse.json();

    if (!abacateResponse.ok) {
      logStep("AbacatePay API error", { status: abacateResponse.status, result: abacateResult });
      
      // Cancel the pending appointment since payment creation failed
      await supabaseClient
        .from("appointments")
        .update({ status: "cancelled", payment_status: "failed" })
        .eq("id", appointment.id);

      throw new Error(abacateResult.error || "Erro ao criar cobrança PIX");
    }

    logStep("AbacatePay billing created", { result: abacateResult });

    // Update appointment with AbacatePay billing ID
    await supabaseClient
      .from("appointments")
      .update({ 
        stripe_session_id: abacateResult.data?.id || null,
        notes: `CPF: ${patientCpf} | AbacatePay ID: ${abacateResult.data?.id}`,
      })
      .eq("id", appointment.id);

    return new Response(
      JSON.stringify({
        success: true,
        appointmentId: appointment.id,
        billingId: abacateResult.data?.id,
        url: abacateResult.data?.url,
        pixQrCode: abacateResult.data?.pix?.qrCode,
        pixCopyPaste: abacateResult.data?.pix?.payload,
        expiresAt: abacateResult.data?.pix?.expiresAt,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    logStep("ERROR", { message: errorMessage });
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
