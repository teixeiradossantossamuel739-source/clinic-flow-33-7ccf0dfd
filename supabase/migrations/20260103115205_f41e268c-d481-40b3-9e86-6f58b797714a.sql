-- Create clinic_settings table for storing clinic configuration
CREATE TABLE public.clinic_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key text NOT NULL UNIQUE,
  setting_value text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.clinic_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can manage settings
CREATE POLICY "Admins can manage settings" 
ON public.clinic_settings 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role));

-- Anyone can read settings (needed for edge functions)
CREATE POLICY "Anyone can view settings" 
ON public.clinic_settings 
FOR SELECT 
USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_clinic_settings_updated_at
BEFORE UPDATE ON public.clinic_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default payment reminder days setting
INSERT INTO public.clinic_settings (setting_key, setting_value) 
VALUES ('payment_reminder_days', '3');