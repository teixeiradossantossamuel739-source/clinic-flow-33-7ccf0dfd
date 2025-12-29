-- Create table for professional blocked times
CREATE TABLE public.professional_blocked_times (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID NOT NULL REFERENCES professionals(id) ON DELETE CASCADE,
  block_date DATE NOT NULL,
  start_time TIME, -- NULL = dia inteiro bloqueado
  end_time TIME,   -- NULL = dia inteiro bloqueado
  reason TEXT,     -- Motivo do bloqueio (opcional, visível para clientes)
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.professional_blocked_times ENABLE ROW LEVEL SECURITY;

-- Funcionarios can manage their own blocked times
CREATE POLICY "Funcionarios can manage their own blocked times"
ON public.professional_blocked_times
FOR ALL
USING (professional_id IN (
  SELECT id FROM professionals WHERE user_id = auth.uid()
));

-- Anyone can view blocked times (for booking page)
CREATE POLICY "Anyone can view blocked times"
ON public.professional_blocked_times
FOR SELECT
USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_professional_blocked_times_updated_at
BEFORE UPDATE ON public.professional_blocked_times
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();