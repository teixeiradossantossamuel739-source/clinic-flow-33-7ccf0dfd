-- =====================================================
-- FASE 1: Módulo de Gestão de Pacientes
-- =====================================================

-- 1. Criar tabela de pacientes
CREATE TABLE public.patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cpf TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  whatsapp TEXT,
  birth_date DATE,
  gender TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  health_insurance TEXT,
  health_insurance_number TEXT,
  blood_type TEXT,
  allergies TEXT,
  chronic_conditions TEXT,
  notes TEXT,
  is_complete BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Criar tabela de prontuários/registros médicos
CREATE TABLE public.medical_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  professional_id UUID NOT NULL REFERENCES public.professionals(id) ON DELETE CASCADE,
  record_date DATE NOT NULL DEFAULT CURRENT_DATE,
  record_type TEXT NOT NULL, -- 'consulta', 'procedimento', 'exame', 'retorno'
  chief_complaint TEXT, -- Queixa principal
  diagnosis TEXT,
  procedure_performed TEXT, -- Procedimento realizado
  prescription TEXT, -- Prescrição
  observations TEXT, -- Observações
  follow_up_date DATE, -- Data de retorno
  attachments JSONB, -- URLs de arquivos anexados
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Adicionar coluna patient_id na tabela appointments
ALTER TABLE public.appointments 
ADD COLUMN patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL;

-- 4. Habilitar RLS nas novas tabelas
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medical_records ENABLE ROW LEVEL SECURITY;

-- 5. Políticas RLS para patients
CREATE POLICY "Admins can manage all patients" 
ON public.patients 
FOR ALL 
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Funcionarios can view all patients" 
ON public.patients 
FOR SELECT 
USING (has_role(auth.uid(), 'funcionario'));

CREATE POLICY "Funcionarios can insert patients" 
ON public.patients 
FOR INSERT 
WITH CHECK (has_role(auth.uid(), 'funcionario'));

CREATE POLICY "Funcionarios can update patients" 
ON public.patients 
FOR UPDATE 
USING (has_role(auth.uid(), 'funcionario'));

-- 6. Políticas RLS para medical_records
CREATE POLICY "Admins can manage all medical records" 
ON public.medical_records 
FOR ALL 
USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Professionals can view their own records" 
ON public.medical_records 
FOR SELECT 
USING (professional_id IN (
  SELECT id FROM public.professionals WHERE user_id = auth.uid()
));

CREATE POLICY "Professionals can insert their own records" 
ON public.medical_records 
FOR INSERT 
WITH CHECK (professional_id IN (
  SELECT id FROM public.professionals WHERE user_id = auth.uid()
));

CREATE POLICY "Professionals can update their own records" 
ON public.medical_records 
FOR UPDATE 
USING (professional_id IN (
  SELECT id FROM public.professionals WHERE user_id = auth.uid()
));

-- 7. Triggers para updated_at
CREATE TRIGGER update_patients_updated_at
  BEFORE UPDATE ON public.patients
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_medical_records_updated_at
  BEFORE UPDATE ON public.medical_records
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 8. Índices para performance
CREATE INDEX idx_patients_cpf ON public.patients(cpf);
CREATE INDEX idx_patients_full_name ON public.patients(full_name);
CREATE INDEX idx_patients_email ON public.patients(email);
CREATE INDEX idx_patients_phone ON public.patients(phone);
CREATE INDEX idx_medical_records_patient_id ON public.medical_records(patient_id);
CREATE INDEX idx_medical_records_professional_id ON public.medical_records(professional_id);
CREATE INDEX idx_medical_records_record_date ON public.medical_records(record_date);
CREATE INDEX idx_appointments_patient_id ON public.appointments(patient_id);