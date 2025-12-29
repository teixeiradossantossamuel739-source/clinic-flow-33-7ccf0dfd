-- Create table for professional preferences/settings
CREATE TABLE public.professional_preferences (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  professional_id uuid NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE UNIQUE,
  notify_new_appointment boolean NOT NULL DEFAULT true,
  notify_appointment_confirmed boolean NOT NULL DEFAULT true,
  notify_appointment_cancelled boolean NOT NULL DEFAULT true,
  notify_payment_received boolean NOT NULL DEFAULT true,
  notify_reminder_24h boolean NOT NULL DEFAULT true,
  notify_sound_enabled boolean NOT NULL DEFAULT true,
  whatsapp_auto_message boolean NOT NULL DEFAULT false,
  theme_preference text NOT NULL DEFAULT 'system',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.professional_preferences ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Funcionarios can view their own preferences"
ON public.professional_preferences
FOR SELECT
USING (
  professional_id IN (
    SELECT id FROM professionals WHERE user_id = auth.uid()
  )
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Funcionarios can insert their own preferences"
ON public.professional_preferences
FOR INSERT
WITH CHECK (
  professional_id IN (
    SELECT id FROM professionals WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Funcionarios can update their own preferences"
ON public.professional_preferences
FOR UPDATE
USING (
  professional_id IN (
    SELECT id FROM professionals WHERE user_id = auth.uid()
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_professional_preferences_updated_at
BEFORE UPDATE ON public.professional_preferences
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();