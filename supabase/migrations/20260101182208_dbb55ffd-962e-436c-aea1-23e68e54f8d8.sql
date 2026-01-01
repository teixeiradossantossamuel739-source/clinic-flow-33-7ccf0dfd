-- Create table for appointment reviews/ratings
CREATE TABLE public.appointment_reviews (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  appointment_id UUID NOT NULL UNIQUE,
  patient_email TEXT NOT NULL,
  professional_id UUID NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.appointment_reviews ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can create reviews for their appointments (by email)
CREATE POLICY "Anyone can create reviews for their appointments"
ON public.appointment_reviews
FOR INSERT
WITH CHECK (true);

-- Policy: Anyone can view reviews by email
CREATE POLICY "Anyone can view reviews"
ON public.appointment_reviews
FOR SELECT
USING (true);

-- Policy: Professionals can view reviews about them
CREATE POLICY "Professionals can view their reviews"
ON public.appointment_reviews
FOR SELECT
USING (
  professional_id IN (
    SELECT id FROM professionals WHERE user_id = auth.uid()
  ) OR has_role(auth.uid(), 'admin'::app_role)
);

-- Create trigger for updated_at
CREATE TRIGGER update_appointment_reviews_updated_at
BEFORE UPDATE ON public.appointment_reviews
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();