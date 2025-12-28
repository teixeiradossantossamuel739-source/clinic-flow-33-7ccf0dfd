import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  console.log(`[ABACATEPAY-WEBHOOK] ${step}`, details ? JSON.stringify(details) : "");
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Webhook received");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey);

    const payload = await req.json();
    logStep("Webhook payload", { payload });

    // AbacatePay webhook structure
    const event = payload.event;
    const data = payload.data;

    if (!event || !data) {
      logStep("Invalid webhook payload");
      return new Response(JSON.stringify({ error: "Invalid payload" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    logStep("Processing event", { event, billingId: data.id });

    // Handle billing.paid event
    if (event === "billing.paid" || event === "BILLING_PAID") {
      const billingId = data.id;
      const appointmentId = data.metadata?.appointment_id;

      if (!appointmentId && !billingId) {
        logStep("No appointment identifier found");
        return new Response(JSON.stringify({ error: "No appointment identifier" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
      }

      // Find appointment by billing ID stored in stripe_session_id or by metadata
      let query = supabaseClient.from("appointments").select("*");
      
      if (appointmentId) {
        query = query.eq("id", appointmentId);
      } else {
        query = query.eq("stripe_session_id", billingId);
      }

      const { data: appointments, error: fetchError } = await query;

      if (fetchError || !appointments || appointments.length === 0) {
        logStep("Appointment not found", { appointmentId, billingId, error: fetchError });
        return new Response(JSON.stringify({ error: "Appointment not found" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 404,
        });
      }

      const appointment = appointments[0];
      logStep("Found appointment", { id: appointment.id, currentStatus: appointment.status });

      // Update appointment status to confirmed
      const { error: updateError } = await supabaseClient
        .from("appointments")
        .update({
          status: "confirmed",
          payment_status: "paid",
          stripe_payment_intent_id: data.paidAt || new Date().toISOString(),
        })
        .eq("id", appointment.id);

      if (updateError) {
        logStep("Failed to update appointment", { error: updateError });
        throw new Error("Failed to update appointment status");
      }

      logStep("Appointment confirmed successfully", { appointmentId: appointment.id });

      return new Response(
        JSON.stringify({ success: true, appointmentId: appointment.id }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // Handle other events (expired, cancelled, etc.)
    if (event === "billing.expired" || event === "BILLING_EXPIRED") {
      const billingId = data.id;
      const appointmentId = data.metadata?.appointment_id;

      let query = supabaseClient.from("appointments").select("id");
      if (appointmentId) {
        query = query.eq("id", appointmentId);
      } else {
        query = query.eq("stripe_session_id", billingId);
      }

      const { data: appointments } = await query;

      if (appointments && appointments.length > 0) {
        await supabaseClient
          .from("appointments")
          .update({ status: "cancelled", payment_status: "expired" })
          .eq("id", appointments[0].id);

        logStep("Appointment cancelled due to expired payment", { appointmentId: appointments[0].id });
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: "Webhook processed" }),
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
        status: 500,
      }
    );
  }
});
