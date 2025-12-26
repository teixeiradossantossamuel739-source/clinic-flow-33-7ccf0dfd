-- Step 1: Update handle_new_user() trigger to ALWAYS set role as 'cliente'
-- This prevents privilege escalation via metadata
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  -- Create profile
  INSERT INTO public.profiles (user_id, email, full_name, whatsapp)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.email),
    NEW.raw_user_meta_data ->> 'whatsapp'
  );
  
  -- ALWAYS create as 'cliente' role - never trust metadata for role assignment
  -- Admin/funcionario roles must be set via backend functions only
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'cliente'::app_role);
  
  RETURN NEW;
END;
$$;

-- Step 2: Add unique constraint on user_id to ensure one role per user
-- First, remove duplicates if any exist (keep first one)
DELETE FROM public.user_roles a
USING public.user_roles b
WHERE a.id > b.id AND a.user_id = b.user_id;

-- Drop existing constraint if exists and create new one
ALTER TABLE public.user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_key;
ALTER TABLE public.user_roles ADD CONSTRAINT user_roles_user_id_key UNIQUE (user_id);