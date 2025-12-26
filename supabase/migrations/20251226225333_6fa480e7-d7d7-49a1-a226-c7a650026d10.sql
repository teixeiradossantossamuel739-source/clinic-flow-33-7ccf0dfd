-- Create professionals table
CREATE TABLE public.professionals (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    specialty_id TEXT NOT NULL,
    crm TEXT,
    bio TEXT,
    avatar_url TEXT,
    rating NUMERIC(2,1) DEFAULT 5.0,
    review_count INTEGER DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create professional_schedules table
CREATE TABLE public.professional_schedules (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    professional_id UUID REFERENCES public.professionals(id) ON DELETE CASCADE NOT NULL,
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    slot_duration_minutes INTEGER NOT NULL DEFAULT 30,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(professional_id, day_of_week)
);

-- Add professional_uuid column to appointments table for proper FK reference
ALTER TABLE public.appointments 
ADD COLUMN professional_uuid UUID REFERENCES public.professionals(id) ON DELETE SET NULL;

-- Enable Row Level Security
ALTER TABLE public.professionals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.professional_schedules ENABLE ROW LEVEL SECURITY;

-- RLS policies for professionals (public read)
CREATE POLICY "Anyone can view active professionals" 
ON public.professionals 
FOR SELECT 
USING (is_active = true);

-- RLS policies for professional_schedules (public read)
CREATE POLICY "Anyone can view active schedules" 
ON public.professional_schedules 
FOR SELECT 
USING (is_active = true);

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_professionals_updated_at
    BEFORE UPDATE ON public.professionals
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_professional_schedules_updated_at
    BEFORE UPDATE ON public.professional_schedules
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();