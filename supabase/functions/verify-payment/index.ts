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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const { sessionId, appointmentId } = await req.json();
    logStep("Request data", { sessionId, appointmentId });

    if (!appointmentId) {
      throw new Error("Appointment ID is required");
    }

    // Get appointment details
    const { data: appointment, error: fetchError } = await supabaseClient
      .from('appointments')
      .select('*')
      .eq('id', appointmentId)
      .single();

    if (fetchError || !appointment) {
      logStep("Error fetching appointment", { error: fetchError });
      throw new Error("Appointment not found");
    }

    logStep("Appointment fetched", { 
      status: appointment.status,
      paymentStatus: appointment.payment_status 
    });

    // If sessionId is provided, verify with Stripe
    if (sessionId) {
      const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
      if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

      const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      
      logStep("Stripe session retrieved", { 
        paymentStatus: session.payment_status,
        status: session.status 
      });

      if (session.payment_status === 'paid') {
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

        // Refetch updated appointment
        const { data: updatedAppointment } = await supabaseClient
          .from('appointments')
          .select('*')
          .eq('id', appointmentId)
          .single();

        return new Response(JSON.stringify({ 
          success: true,
          paid: true,
          verified: true,
          appointment: updatedAppointment
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
    }

    // For PIX payments or pending Stripe, return current status
    const isPaid = appointment.payment_status === 'paid';
    const isConfirmed = appointment.status === 'confirmed' || appointment.status === 'completed';
    const isAwaitingConfirmation = appointment.payment_status === 'awaiting_confirmation';

    return new Response(JSON.stringify({ 
      success: true,
      paid: isPaid,
      verified: isPaid || isConfirmed,
      awaitingConfirmation: isAwaitingConfirmation,
      status: appointment.status,
      paymentStatus: appointment.payment_status,
      appointment
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
