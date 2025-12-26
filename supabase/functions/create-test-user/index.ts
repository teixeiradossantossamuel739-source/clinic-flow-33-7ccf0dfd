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

    const { email, password, fullName, role }: CreateUserRequest = await req.json();

    logStep("Processing user", { email, fullName, role });

    // Check if user already exists
    const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email === email);

    if (existingUser) {
      logStep("User already exists, updating password and role", { email, userId: existingUser.id });
      
      // Update password
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        existingUser.id,
        { 
          password,
          user_metadata: { full_name: fullName }
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

      logStep("User updated successfully", { userId: existingUser.id, email });

      return new Response(
        JSON.stringify({ 
          message: "User already exists", 
          updated: true,
          user: { id: existingUser.id, email } 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Create the user
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
      },
    });

    if (createError) {
      logStep("Error creating user", { error: createError.message });
      throw createError;
    }

    logStep("User created in auth", { userId: newUser.user?.id, email });

    // The trigger will create the profile and default 'cliente' role
    // Now we need to update the role to the correct one if not cliente
    if (role !== 'cliente' && newUser.user?.id) {
      // Wait a moment for the trigger to complete
      await new Promise(resolve => setTimeout(resolve, 100));

      const { error: roleError } = await supabaseAdmin
        .from('user_roles')
        .update({ role })
        .eq('user_id', newUser.user.id);

      if (roleError) {
        logStep("Error setting user role", { error: roleError.message });
        // Don't throw, user was created, just log the error
      } else {
        logStep("User role updated", { userId: newUser.user.id, role });
      }
    }

    logStep("User created successfully", { userId: newUser.user?.id, email, role });

    return new Response(
      JSON.stringify({ 
        message: "User created successfully", 
        user: { id: newUser.user?.id, email } 
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
