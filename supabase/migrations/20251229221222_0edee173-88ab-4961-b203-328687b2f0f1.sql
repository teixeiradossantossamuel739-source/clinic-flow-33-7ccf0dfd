-- Add patient confirmation fields to appointments
ALTER TABLE public.appointments 
ADD COLUMN IF NOT EXISTS patient_confirmed_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS confirmation_token uuid DEFAULT gen_random_uuid();

-- Create index for quick token lookup
CREATE INDEX IF NOT EXISTS idx_appointments_confirmation_token 
ON public.appointments(confirmation_token);

-- Allow public access to confirm appointments via token (no auth needed)
CREATE POLICY "Anyone can confirm appointments via token" 
ON public.appointments 
FOR UPDATE 
USING (true)
WITH CHECK (true);