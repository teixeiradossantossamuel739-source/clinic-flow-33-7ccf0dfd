import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
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

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    logStep("Stripe key verified");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { 
      serviceName,
      servicePrice,
      stripePriceId,
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
      stripePriceId,
      professionalName,
      appointmentDate,
      appointmentTime,
      patientName,
      patientEmail
    });

    // Validate required fields
    if (!stripePriceId || !patientEmail || !patientName || !appointmentDate || !appointmentTime) {
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

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Check if customer exists
    const customers = await stripe.customers.list({ email: patientEmail, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Existing customer found", { customerId });
    } else {
      logStep("No existing customer, will create with email", { email: patientEmail });
    }

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

    // Create checkout session with PIX and card payment options
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : patientEmail,
      line_items: [
        {
          price: stripePriceId,
          quantity: 1,
        },
      ],
      mode: "payment",
      payment_method_types: ['card', 'pix'],
      payment_method_options: {
        pix: {
          expires_after_seconds: 86400, // 24 hours
        },
      },
      success_url: `${origin}/agendamento-sucesso?appointment_id=${appointment.id}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/agendar?canceled=true`,
      metadata: {
        appointment_id: appointment.id,
        professional_name: professionalName,
        appointment_date: appointmentDate,
        appointment_time: appointmentTime,
        patient_name: patientName
      }
    });

    logStep("Checkout session created", { sessionId: session.id, url: session.url });

    // Update appointment with session ID
    await supabaseClient
      .from('appointments')
      .update({ stripe_session_id: session.id })
      .eq('id', appointment.id);

    return new Response(JSON.stringify({ 
      url: session.url,
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