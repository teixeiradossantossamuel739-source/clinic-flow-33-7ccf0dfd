-- Add profession column to professionals table
ALTER TABLE public.professionals 
ADD COLUMN profession TEXT NOT NULL DEFAULT 'Médico';

-- Add comment explaining the column
COMMENT ON COLUMN public.professionals.profession IS 'Tipo de profissional: Médico, Dentista, Psicólogo, Enfermeiro, Fisioterapeuta, Nutricionista';