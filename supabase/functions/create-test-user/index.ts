import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TEST_PASSWORD = "teste123";

const SEED_ADMIN = {
  email: "admin@teste.com",
  fullName: "Administrador",
  role: "admin" as const,
};

const SEED_STAFF: Record<string, { professionalId: string; fullName: string }> = {
  "funcionariolucas@gmail.com": {
    professionalId: "0147089c-d119-43fc-9132-5f9299f9d861",
    fullName: "Dr. Lucas Silva",
  },
  "funcionariomaria@gmail.com": {
    professionalId: "fafbb4f6-af76-47a5-b57a-f70a3bc8422a",
    fullName: "Dra. Maria Santos",
  },
  "funcionariocarlos@gmail.com": {
    professionalId: "898d6900-3e8b-4a9a-b162-69a66e9438ee",
    fullName: "Dr. Carlos Oliveira",
  },
  "funcionariocarol@gmail.com": {
    professionalId: "25f74fb5-6fa7-462a-a538-7b81c76aa970",
    fullName: "Dra. Carol Ferreira",
  },
  "funcionarioleandro@gmail.com": {
    professionalId: "841ef393-3a32-489b-9f34-dc24384e866a",
    fullName: "Dr. Leandro Costa",
  },
  "funcionariojulia@gmail.com": {
    professionalId: "b6a03493-f586-4db7-8c34-e30cc649f9f1",
    fullName: "Dra. Julia Mendes",
  },
  "funcionarioandre@gmail.com": {
    professionalId: "a56d0791-a848-4abf-ab1c-a2cae8bc5f57",
    fullName: "Dr. André Nascimento",
  },
  "funcionariobeatriz@gmail.com": {
    professionalId: "a2d3f55f-0936-4588-b1b2-8615c4b0f63d",
    fullName: "Dra. Beatriz Oliveira",
  },
};

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const isSeedAdminRequest = (u: CreateUserRequest) => {
  const email = normalizeEmail(u.email);
  if (email !== SEED_ADMIN.email) return false;
  if (u.role !== SEED_ADMIN.role) return false;
  if (u.password !== TEST_PASSWORD) return false;
  if ((u.fullName ?? "").trim() !== SEED_ADMIN.fullName) return false;
  if (u.professionalId) return false;
  return true;
};

const isSeedStaffRequest = (u: CreateUserRequest) => {
  const email = normalizeEmail(u.email);
  const seed = SEED_STAFF[email];
  if (!seed) return false;
  if (u.role !== "funcionario") return false;
  if (u.password !== TEST_PASSWORD) return false;
  if (u.professionalId !== seed.professionalId) return false;
  if ((u.fullName ?? "").trim() !== seed.fullName) return false;
  return true;
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

    // Check if there are any admin users in the system
    const { data: adminCheck } = await supabaseAdmin
      .from("user_roles")
      .select("id")
      .eq("role", "admin")
      .limit(1);

    const hasAdmins = adminCheck && adminCheck.length > 0;
    logStep("Admin check", { hasAdmins });

    // Parse body once
    const body = await req.json();

    // Check if bulk creation or single user
    const users: CreateUserRequest[] = body.users ? body.users : [body];
    const results: any[] = [];

    // Allow unauthenticated creation/update ONLY for known seed staff accounts with fixed password
    const seedStaffOnly = users.length > 0 && users.every((u) => isSeedAdminRequest(u) || isSeedStaffRequest(u));
    logStep("Seed staff only", { seedStaffOnly, count: users.length });

    // If there are admins, require authentication (except for seed staff bootstrap)
    if (hasAdmins && !seedStaffOnly) {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) {
        logStep("ERROR: No authorization header");
        return new Response(
          JSON.stringify({ error: "Authorization required" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
        );
      }

      const token = authHeader.replace("Bearer ", "");
      const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

      if (authError || !user) {
        logStep("ERROR: Invalid token", { error: authError?.message });
        return new Response(
          JSON.stringify({ error: "Invalid authorization token" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
        );
      }

      // Check if user has admin role
      const { data: roleData, error: roleError } = await supabaseAdmin
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .single();

      if (roleError || roleData?.role !== "admin") {
        logStep("ERROR: User is not admin", { userId: user.id, role: roleData?.role });
        return new Response(
          JSON.stringify({ error: "Admin access required" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403 }
        );
      }

      logStep("Admin verified", { userId: user.id });
    } else if (hasAdmins && seedStaffOnly) {
      logStep("Bypass enabled for seed staff request");
    } else {
      logStep("No admins exist yet, allowing initial setup");
    }

    for (const userData of users) {
      const { email, password, fullName, role, professionalId, whatsapp } = userData;

      logStep("Processing user", { email, fullName, role, professionalId });

      try {
        // Check if user already exists
        const { data: existingUsers } = await supabaseAdmin.auth.admin.listUsers();
        const existingUser = existingUsers?.users?.find((u) => normalizeEmail(u.email ?? "") === normalizeEmail(email));

        let userId: string;

        if (existingUser) {
          userId = existingUser.id;
          logStep("User already exists, updating password and role", { email, userId });

          // Update password
          const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
            existingUser.id,
            {
              password,
              user_metadata: { full_name: fullName, whatsapp },
            }
          );

          if (updateError) {
            logStep("Error updating user password", { error: updateError.message });
            throw updateError;
          }

          // Update role in user_roles table (upsert)
          const { error: roleError } = await supabaseAdmin
            .from("user_roles")
            .upsert({ user_id: existingUser.id, role }, { onConflict: "user_id" });

          if (roleError) {
            logStep("Error updating user role", { error: roleError.message });
            throw roleError;
          }

          // Update profile with whatsapp
          if (whatsapp) {
            await supabaseAdmin
              .from("profiles")
              .update({ whatsapp, full_name: fullName })
              .eq("user_id", existingUser.id);
          }

          results.push({ email, status: "updated", userId });
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
          await new Promise((resolve) => setTimeout(resolve, 200));

          // Update role if not cliente
          if (role !== "cliente") {
            const { error: roleError } = await supabaseAdmin
              .from("user_roles")
              .update({ role })
              .eq("user_id", userId);

            if (roleError) {
              logStep("Error setting user role", { error: roleError.message });
            } else {
              logStep("User role updated", { userId, role });
            }
          }

          // Update profile with whatsapp
          if (whatsapp) {
            await supabaseAdmin
              .from("profiles")
              .update({ whatsapp, full_name: fullName })
              .eq("user_id", userId);
          }

          results.push({ email, status: "created", userId });
        }

        // Link professional to user if professionalId is provided
        if (professionalId && role === "funcionario") {
          const { error: linkError } = await supabaseAdmin
            .from("professionals")
            .update({ user_id: userId })
            .eq("id", professionalId);

          if (linkError) {
            logStep("Error linking professional to user", { error: linkError.message });
          } else {
            logStep("Professional linked to user", { professionalId, userId });
          }
        }
      } catch (userError) {
        const errorMessage = userError instanceof Error ? userError.message : String(userError);
        logStep("Error processing user", { email, error: errorMessage });
        results.push({ email, status: "error", error: errorMessage });
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
