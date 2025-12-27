-- Add user_id column to professionals table to link with auth users
ALTER TABLE public.professionals 
ADD COLUMN user_id uuid REFERENCES auth.users(id);

-- Create index for fast lookup
CREATE INDEX idx_professionals_user_id ON public.professionals(user_id);

-- RLS policy for funcionarios to view their own professional record
CREATE POLICY "Funcionarios can view their own professional data"
ON public.professionals
FOR SELECT
USING (
  user_id = auth.uid() OR
  has_role(auth.uid(), 'admin'::app_role) OR
  has_role(auth.uid(), 'funcionario'::app_role)
);

-- RLS policy for funcionarios to update their own professional record
CREATE POLICY "Funcionarios can update their own professional data"
ON public.professionals
FOR UPDATE
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- RLS policy for admins to manage all professionals
CREATE POLICY "Admins can manage all professionals"
ON public.professionals
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- RLS policy for funcionarios to view their own schedules
CREATE POLICY "Funcionarios can view their own schedules"
ON public.professional_schedules
FOR SELECT
USING (
  professional_id IN (SELECT id FROM public.professionals WHERE user_id = auth.uid()) OR
  has_role(auth.uid(), 'admin'::app_role)
);

-- RLS policy for funcionarios to manage their own schedules
CREATE POLICY "Funcionarios can manage their own schedules"
ON public.professional_schedules
FOR ALL
USING (
  professional_id IN (SELECT id FROM public.professionals WHERE user_id = auth.uid())
);

-- RLS policy for funcionarios to view their own appointments
CREATE POLICY "Funcionarios can view their own appointments"
ON public.appointments
FOR SELECT
USING (
  professional_uuid IN (SELECT id FROM public.professionals WHERE user_id = auth.uid()) OR
  has_role(auth.uid(), 'admin'::app_role)
);

-- RLS policy for funcionarios to update their own appointments
CREATE POLICY "Funcionarios can update their own appointments"
ON public.appointments
FOR UPDATE
USING (
  professional_uuid IN (SELECT id FROM public.professionals WHERE user_id = auth.uid())
);