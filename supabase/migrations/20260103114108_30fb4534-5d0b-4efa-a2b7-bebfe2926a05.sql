-- Create payment history/audit log table
CREATE TABLE public.professional_payment_history (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  payment_id uuid NOT NULL REFERENCES public.professional_payments(id) ON DELETE CASCADE,
  action text NOT NULL, -- 'created', 'updated', 'status_changed'
  changed_by uuid REFERENCES auth.users(id),
  changed_by_name text,
  previous_status text,
  new_status text,
  previous_amount_cents integer,
  new_amount_cents integer,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.professional_payment_history ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Admins can manage payment history"
ON public.professional_payment_history
FOR ALL
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Professionals can view their payment history"
ON public.professional_payment_history
FOR SELECT
USING (
  payment_id IN (
    SELECT pp.id FROM public.professional_payments pp
    WHERE pp.professional_id IN (
      SELECT p.id FROM public.professionals p WHERE p.user_id = auth.uid()
    )
  )
);

-- Anyone can insert history (for tracking)
CREATE POLICY "Anyone can insert payment history"
ON public.professional_payment_history
FOR INSERT
WITH CHECK (true);