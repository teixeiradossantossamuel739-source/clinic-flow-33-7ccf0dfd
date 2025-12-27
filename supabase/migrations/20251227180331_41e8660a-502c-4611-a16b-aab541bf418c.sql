-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Anyone can view active professionals" ON public.professionals;

-- Create a new policy that allows:
-- 1. Admins to see ALL professionals (active and inactive)
-- 2. Others to see only active professionals
CREATE POLICY "View professionals based on role"
ON public.professionals
FOR SELECT
USING (
  has_role(auth.uid(), 'admin'::app_role) 
  OR has_role(auth.uid(), 'funcionario'::app_role)
  OR is_active = true
);