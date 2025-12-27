import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[MERCADOPAGO-WEBHOOK] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Webhook received");

    const mpAccessToken = Deno.env.get("MERCADOPAGO_ACCESS_TOKEN");
    if (!mpAccessToken) throw new Error("MERCADOPAGO_ACCESS_TOKEN is not set");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const body = await req.json();
    logStep("Webhook body", body);

    // Handle payment notification
    if (body.type === "payment" && body.data?.id) {
      const paymentId = body.data.id;
      logStep("Processing payment", { paymentId });

      // Get payment details from Mercado Pago
      const paymentResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: {
          "Authorization": `Bearer ${mpAccessToken}`,
        },
      });

      if (!paymentResponse.ok) {
        const errorData = await paymentResponse.text();
        logStep("Error fetching payment", { error: errorData });
        throw new Error(`Failed to fetch payment: ${errorData}`);
      }

      const payment = await paymentResponse.json();
      logStep("Payment details", { 
        status: payment.status, 
        externalReference: payment.external_reference 
      });

      const appointmentId = payment.external_reference;

      if (payment.status === "approved") {
        // Update appointment status
        const { error: updateError } = await supabaseClient
          .from('appointments')
          .update({ 
            payment_status: 'paid',
            status: 'confirmed',
            stripe_payment_intent_id: paymentId.toString() // Reusing field for MP payment ID
          })
          .eq('id', appointmentId);

        if (updateError) {
          logStep("Error updating appointment", { error: updateError });
          throw new Error(`Failed to update appointment: ${updateError.message}`);
        }

        logStep("Appointment updated to confirmed", { appointmentId });
      } else if (payment.status === "pending") {
        const { error: updateError } = await supabaseClient
          .from('appointments')
          .update({ 
            payment_status: 'pending',
            stripe_payment_intent_id: paymentId.toString()
          })
          .eq('id', appointmentId);

        if (updateError) {
          logStep("Error updating appointment", { error: updateError });
        }

        logStep("Appointment payment pending", { appointmentId });
      } else if (payment.status === "rejected" || payment.status === "cancelled") {
        const { error: updateError } = await supabaseClient
          .from('appointments')
          .update({ 
            payment_status: 'failed',
            status: 'cancelled'
          })
          .eq('id', appointmentId);

        if (updateError) {
          logStep("Error updating appointment", { error: updateError });
        }

        logStep("Appointment cancelled due to payment failure", { appointmentId });
      }
    }

    return new Response(JSON.stringify({ received: true }), {
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
