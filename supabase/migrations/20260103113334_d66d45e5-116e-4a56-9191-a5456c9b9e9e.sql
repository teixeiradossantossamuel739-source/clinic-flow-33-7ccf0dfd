-- Tabela de salas da clínica
CREATE TABLE public.clinic_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  rental_value_cents integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.clinic_rooms ENABLE ROW LEVEL SECURITY;

-- Políticas para salas
CREATE POLICY "Admins can manage rooms" ON public.clinic_rooms
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view active rooms" ON public.clinic_rooms
  FOR SELECT USING (is_active = true);

-- Adicionar campos de pagamento na tabela professionals
ALTER TABLE public.professionals 
  ADD COLUMN IF NOT EXISTS payment_type text NOT NULL DEFAULT 'percentage',
  ADD COLUMN IF NOT EXISTS payment_percentage numeric(5,2) DEFAULT 50.00,
  ADD COLUMN IF NOT EXISTS room_id uuid REFERENCES public.clinic_rooms(id),
  ADD COLUMN IF NOT EXISTS fixed_room_value_cents integer DEFAULT 0;

-- Tabela de pagamentos mensais dos funcionários
CREATE TABLE public.professional_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id uuid NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  month integer NOT NULL CHECK (month >= 1 AND month <= 12),
  year integer NOT NULL CHECK (year >= 2020),
  amount_due_cents integer NOT NULL DEFAULT 0,
  amount_paid_cents integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'next_month')),
  payment_type text NOT NULL DEFAULT 'percentage',
  due_date date,
  paid_at timestamp with time zone,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (professional_id, month, year)
);

-- Habilitar RLS
ALTER TABLE public.professional_payments ENABLE ROW LEVEL SECURITY;

-- Políticas para pagamentos
CREATE POLICY "Admins can manage all payments" ON public.professional_payments
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Professionals can view own payments" ON public.professional_payments
  FOR SELECT USING (
    professional_id IN (
      SELECT id FROM public.professionals WHERE user_id = auth.uid()
    )
  );

-- Trigger para updated_at
CREATE TRIGGER update_clinic_rooms_updated_at
  BEFORE UPDATE ON public.clinic_rooms
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_professional_payments_updated_at
  BEFORE UPDATE ON public.professional_payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();