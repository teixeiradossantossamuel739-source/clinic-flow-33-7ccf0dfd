import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WhatsAppNotificationRequest {
  professionalPhone?: string;
  patientPhone?: string;
  patientName: string;
  appointmentDate: string;
  appointmentTime: string;
  serviceName?: string;
  serviceDuration?: number;
  professionalName?: string;
  appointmentId: string;
  type: 'new_appointment' | 'cancelled' | 'confirmed' | 'payment_analysis' | 'confirmed_to_patient';
  amountCents?: number;
}

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[WHATSAPP-NOTIFY] ${step}${detailsStr}`);
};

// Format phone number to international format
function formatPhone(phone: string): string {
  // Remove all non-digits
  const digits = phone.replace(/\D/g, '');
  
  // If starts with 55, it's already international
  if (digits.startsWith('55') && digits.length >= 12) {
    return digits;
  }
  
  // Add Brazil country code
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
    logStep("Function started");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const body: WhatsAppNotificationRequest = await req.json();
    const { 
      professionalPhone, 
      patientName, 
      patientPhone,
      appointmentDate, 
      appointmentTime, 
      serviceName,
      serviceDuration,
      professionalName,
      appointmentId,
      type,
      amountCents
    } = body;

    logStep("Request received", { type, appointmentId, patientName });

    // Determine target phone based on notification type
    const targetPhone = type === 'confirmed_to_patient' ? patientPhone : professionalPhone;

    if (!targetPhone) {
      logStep("No target phone provided");
      return new Response(JSON.stringify({ 
        success: false, 
        message: "Telefone do destinatário não disponível" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    if (!professionalPhone) {
      logStep("No professional phone provided");
      return new Response(JSON.stringify({ 
        success: false, 
        message: "Telefone do profissional não disponível" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const formattedDate = formatDate(appointmentDate);
    const formattedTime = appointmentTime.slice(0, 5);
    let message = '';

    const formattedAmount = amountCents ? `R$ ${(amountCents / 100).toFixed(2).replace('.', ',')}` : '';
    const formattedDuration = serviceDuration ? (serviceDuration < 60 ? `${serviceDuration} min` : `${Math.floor(serviceDuration / 60)}h${serviceDuration % 60 > 0 ? ` ${serviceDuration % 60}min` : ''}`) : '';

    switch (type) {
      case 'new_appointment':
        message = `🔔 *Novo Agendamento!*

📋 *Paciente:* ${patientName}
📱 *WhatsApp:* ${patientPhone}
📅 *Data:* ${formattedDate}
⏰ *Horário:* ${formattedTime}
${serviceName ? `🏥 *Serviço:* ${serviceName}` : ''}

Acesse o painel para confirmar ou cancelar.`;
        break;

      case 'payment_analysis':
        message = `🔔 *PAGAMENTO EM ANÁLISE!*

⚠️ O cliente informou que já pagou. Confira no app do banco!

📋 *Paciente:* ${patientName}
📱 *WhatsApp:* ${patientPhone}
📅 *Data:* ${formattedDate}
⏰ *Horário:* ${formattedTime}
${serviceName ? `🏥 *Serviço:* ${serviceName}` : ''}
${formattedAmount ? `💰 *Valor:* ${formattedAmount}` : ''}

👉 Acesse o painel e clique em *Confirmar Pagamento* após verificar.`;
        break;

      case 'confirmed_to_patient':
        message = `✅ *Sua consulta foi confirmada!*

Olá, ${patientName}! 😊

Sua consulta foi confirmada com sucesso.

📅 *Data:* ${formattedDate}
⏰ *Horário:* ${formattedTime}
${formattedDuration ? `🕒 *Duração:* ${formattedDuration}` : ''}
${serviceName ? `🩺 *Serviço:* ${serviceName}` : ''}
${professionalName ? `👨‍⚕️ *Profissional:* ${professionalName}` : ''}
${formattedAmount ? `💰 *Valor:* ${formattedAmount}` : ''}

Aguardamos você! Qualquer dúvida, estamos à disposição.`;
        break;
        
      case 'confirmed':
        message = `✅ *Agendamento Confirmado!*

📋 *Paciente:* ${patientName}
📅 *Data:* ${formattedDate}
⏰ *Horário:* ${formattedTime}

Agendamento confirmado com sucesso!`;
        break;
        
      case 'cancelled':
        message = `❌ *Agendamento Cancelado*

📋 *Paciente:* ${patientName}
📅 *Data:* ${formattedDate}
⏰ *Horário:* ${formattedTime}

Este horário está agora disponível.`;
        break;
        
      default:
        message = `📋 Notificação sobre agendamento de ${patientName} em ${formattedDate} às ${formattedTime}`;
    }

    const whatsappLink = generateWhatsAppLink(targetPhone, message);

    logStep("WhatsApp link generated", { type, whatsappLink: whatsappLink.substring(0, 50) + '...' });

    return new Response(JSON.stringify({ 
      success: true,
      whatsappLink,
      message: "Link de WhatsApp gerado com sucesso"
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
