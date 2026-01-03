-- Add policy for admins to manage all professional goals
CREATE POLICY "Admins can manage all goals"
ON public.professional_goals
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));