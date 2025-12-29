-- Create table for professional financial goals
CREATE TABLE public.professional_goals (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  professional_id uuid NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  month integer NOT NULL CHECK (month >= 1 AND month <= 12),
  year integer NOT NULL CHECK (year >= 2020),
  goal_amount_cents integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(professional_id, month, year)
);

-- Enable RLS
ALTER TABLE public.professional_goals ENABLE ROW LEVEL SECURITY;

-- Policies for professional_goals
CREATE POLICY "Funcionarios can view their own goals"
ON public.professional_goals
FOR SELECT
USING (
  professional_id IN (
    SELECT id FROM professionals WHERE user_id = auth.uid()
  )
  OR has_role(auth.uid(), 'admin'::app_role)
);

CREATE POLICY "Funcionarios can insert their own goals"
ON public.professional_goals
FOR INSERT
WITH CHECK (
  professional_id IN (
    SELECT id FROM professionals WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Funcionarios can update their own goals"
ON public.professional_goals
FOR UPDATE
USING (
  professional_id IN (
    SELECT id FROM professionals WHERE user_id = auth.uid()
  )
);

-- Trigger for updated_at
CREATE TRIGGER update_professional_goals_updated_at
BEFORE UPDATE ON public.professional_goals
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();