import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CreateUserRequest {
  email: string;
  password: string;
  fullName: string;
  role: 'admin' | 'funcionario' | 'cliente';
  professionalId?: string;
  whatsapp?: string;
}

interface BulkCreateRequest {
  users: CreateUserRequest[];
}

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-TEST-USER] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const body = await req.json();
    
    // Check if bulk creation or single user
    const users: CreateUserRequest[] = body.users ? body.users : [body];
    const results: any[] = [];

    for (const userData of users) {
      const { email, password, fullName, role, professionalId, whatsapp } = userData;

      logStep("Processing user", { email, fullName, role, professionalId });

      try {
        // Check if user already exists
        const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
        const existingUser = existingUsers?.users?.find(u => u.email === email);

        let userId: string;

        if (existingUser) {
          userId = existingUser.id;
          logStep("User already exists, updating password and role", { email, userId });
          
          // Update password
          const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
            existingUser.id,
            { 
              password,
              user_metadata: { full_name: fullName, whatsapp }
            }
          );

          if (updateError) {
            logStep("Error updating user password", { error: updateError.message });
            throw updateError;
          }

          // Update role in user_roles table (upsert)
          const { error: roleError } = await supabaseAdmin
            .from('user_roles')
            .upsert(
              { user_id: existingUser.id, role },
              { onConflict: 'user_id' }
            );

          if (roleError) {
            logStep("Error updating user role", { error: roleError.message });
            throw roleError;
          }

          // Update profile with whatsapp
          if (whatsapp) {
            await supabaseAdmin
              .from('profiles')
              .update({ whatsapp, full_name: fullName })
              .eq('user_id', existingUser.id);
          }

          results.push({ email, status: 'updated', userId });
        } else {
          // Create the user
          const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: {
              full_name: fullName,
              whatsapp,
            },
          });

          if (createError) {
            logStep("Error creating user", { error: createError.message });
            throw createError;
          }

          userId = newUser.user!.id;
          logStep("User created in auth", { userId, email });

          // Wait a moment for the trigger to complete
          await new Promise(resolve => setTimeout(resolve, 200));

          // Update role if not cliente
          if (role !== 'cliente') {
            const { error: roleError } = await supabaseAdmin
              .from('user_roles')
              .update({ role })
              .eq('user_id', userId);

            if (roleError) {
              logStep("Error setting user role", { error: roleError.message });
            } else {
              logStep("User role updated", { userId, role });
            }
          }

          // Update profile with whatsapp
          if (whatsapp) {
            await supabaseAdmin
              .from('profiles')
              .update({ whatsapp, full_name: fullName })
              .eq('user_id', userId);
          }

          results.push({ email, status: 'created', userId });
        }

        // Link professional to user if professionalId is provided
        if (professionalId && role === 'funcionario') {
          const { error: linkError } = await supabaseAdmin
            .from('professionals')
            .update({ user_id: userId })
            .eq('id', professionalId);

          if (linkError) {
            logStep("Error linking professional to user", { error: linkError.message });
          } else {
            logStep("Professional linked to user", { professionalId, userId });
          }
        }

      } catch (userError) {
        const errorMessage = userError instanceof Error ? userError.message : String(userError);
        logStep("Error processing user", { email, error: errorMessage });
        results.push({ email, status: 'error', error: errorMessage });
      }
    }

    logStep("All users processed", { total: results.length });

    return new Response(
      JSON.stringify({ 
        message: "Users processed successfully", 
        results 
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});
