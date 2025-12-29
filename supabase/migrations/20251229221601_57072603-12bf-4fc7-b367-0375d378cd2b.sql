-- Create notifications table for professionals
CREATE TABLE public.notifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    professional_id uuid NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
    type text NOT NULL,
    title text NOT NULL,
    message text NOT NULL,
    appointment_id uuid REFERENCES public.appointments(id) ON DELETE CASCADE,
    read_at timestamp with time zone,
    created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Professionals can view their own notifications
CREATE POLICY "Professionals can view own notifications" 
ON public.notifications 
FOR SELECT 
USING (professional_id IN (
    SELECT id FROM professionals WHERE user_id = auth.uid()
) OR has_role(auth.uid(), 'admin'::app_role));

-- Professionals can update (mark as read) their own notifications
CREATE POLICY "Professionals can update own notifications" 
ON public.notifications 
FOR UPDATE 
USING (professional_id IN (
    SELECT id FROM professionals WHERE user_id = auth.uid()
));

-- Anyone can insert notifications (for patient confirmations)
CREATE POLICY "Anyone can insert notifications" 
ON public.notifications 
FOR INSERT 
WITH CHECK (true);

-- Index for faster queries
CREATE INDEX idx_notifications_professional_id ON public.notifications(professional_id);
CREATE INDEX idx_notifications_read_at ON public.notifications(read_at) WHERE read_at IS NULL;

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;