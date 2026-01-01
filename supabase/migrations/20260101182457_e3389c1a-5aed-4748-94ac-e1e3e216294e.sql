-- Add UPDATE policy for reviews
CREATE POLICY "Anyone can update their reviews"
ON public.appointment_reviews
FOR UPDATE
USING (true)
WITH CHECK (true);