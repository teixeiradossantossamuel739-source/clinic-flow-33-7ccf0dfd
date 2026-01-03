import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[PAYMENT-REMINDERS] ${step}${detailsStr}`);
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

// Format currency
function formatCurrency(cents: number): string {
  return `R$ ${(cents / 100).toFixed(2).replace('.', ',')}`;
}

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

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

    // Fetch the payment reminder days setting
    const { data: settingData, error: settingError } = await supabaseClient
      .from('clinic_settings')
      .select('setting_value')
      .eq('setting_key', 'payment_reminder_days')
      .single();

    const reminderDays = settingData?.setting_value ? parseInt(settingData.setting_value) : 3;
    logStep("Reminder days setting", { days: reminderDays });

    // Get today's date and the date X days from now based on setting
    const today = new Date();
    const futureDate = new Date(today);
    futureDate.setDate(futureDate.getDate() + reminderDays);
    
    const todayStr = today.toISOString().split('T')[0];
    const futureDateStr = futureDate.toISOString().split('T')[0];

    logStep("Checking payments due between", { today: todayStr, futureDate: futureDateStr });

    // Fetch pending payments with due date within the configured days
    const { data: payments, error: paymentsError } = await supabaseClient
      .from('professional_payments')
      .select('*, professionals(id, name, phone, email)')
      .eq('status', 'pending')
      .gte('due_date', todayStr)
      .lte('due_date', futureDateStr);

    if (paymentsError) {
      logStep("Error fetching payments", { error: paymentsError.message });
      throw paymentsError;
    }

    logStep("Found pending payments", { count: payments?.length || 0 });

    if (!payments || payments.length === 0) {
      return new Response(JSON.stringify({ 
        success: true, 
        message: "Nenhum pagamento próximo do vencimento",
        processed: 0
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const results: any[] = [];

    for (const payment of payments) {
      const professional = payment.professionals;
      
      if (!professional?.phone) {
        logStep("Professional has no phone", { professionalId: payment.professional_id });
        results.push({
          paymentId: payment.id,
          professionalName: professional?.name || 'Unknown',
          success: false,
          reason: 'No phone number'
        });
        continue;
      }

      const monthName = MONTHS[payment.month - 1];
      const dueDate = payment.due_date ? formatDate(payment.due_date) : 'Não definida';
      const amountDue = formatCurrency(payment.amount_due_cents);

      // Calculate days until due
      const dueDateObj = new Date(payment.due_date);
      const diffTime = dueDateObj.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      let urgencyText = '';
      if (diffDays === 0) {
        urgencyText = '⚠️ *VENCE HOJE!*';
      } else if (diffDays === 1) {
        urgencyText = '⏰ *Vence amanhã!*';
      } else {
        urgencyText = `📅 Vence em ${diffDays} dias`;
      }

      const message = `💳 *Lembrete de Pagamento*

Olá, ${professional.name}! 👋

${urgencyText}

📆 *Referência:* ${monthName}/${payment.year}
💰 *Valor:* ${amountDue}
📅 *Vencimento:* ${dueDate}
${payment.payment_type === 'percentage' ? '📊 *Tipo:* Percentual' : '🏢 *Tipo:* Sala Fixa'}

Por favor, regularize seu pagamento para evitar pendências.

Qualquer dúvida, entre em contato com a administração.`;

      const whatsappLink = generateWhatsAppLink(professional.phone, message);

      logStep("Generated reminder for professional", { 
        professionalName: professional.name, 
        dueDate: payment.due_date,
        daysUntilDue: diffDays
      });

      // Store the reminder link in notifications table
      const { error: notifError } = await supabaseClient
        .from('notifications')
        .insert({
          professional_id: professional.id,
          type: 'payment_reminder',
          title: 'Pagamento próximo do vencimento',
          message: `Pagamento de ${monthName}/${payment.year} - ${amountDue} vence em ${dueDate}`,
        });

      if (notifError) {
        logStep("Error creating notification", { error: notifError.message });
      }

      results.push({
        paymentId: payment.id,
        professionalName: professional.name,
        dueDate: payment.due_date,
        daysUntilDue: diffDays,
        whatsappLink,
        success: true
      });
    }

    logStep("Processing complete", { 
      total: payments.length, 
      successful: results.filter(r => r.success).length 
    });

    return new Response(JSON.stringify({ 
      success: true,
      message: `${results.filter(r => r.success).length} lembretes gerados`,
      results
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
