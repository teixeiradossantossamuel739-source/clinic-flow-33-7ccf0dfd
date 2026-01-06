import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, User, MapPin, Heart, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface Patient {
  id?: string;
  cpf: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  birth_date: string | null;
  gender: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  health_insurance: string | null;
  health_insurance_number: string | null;
  blood_type: string | null;
  allergies: string | null;
  chronic_conditions: string | null;
  notes: string | null;
  is_complete: boolean;
}

interface PatientFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  patient?: Patient | null;
  onSuccess: () => void;
}

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const GENDERS = [
  { value: 'masculino', label: 'Masculino' },
  { value: 'feminino', label: 'Feminino' },
  { value: 'outro', label: 'Outro' },
  { value: 'nao_informado', label: 'Prefiro não informar' },
];
const STATES = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA',
  'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN',
  'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
];

const emptyPatient: Patient = {
  cpf: '',
  full_name: '',
  email: null,
  phone: null,
  whatsapp: null,
  birth_date: null,
  gender: null,
  address: null,
  city: null,
  state: null,
  zip_code: null,
  emergency_contact_name: null,
  emergency_contact_phone: null,
  health_insurance: null,
  health_insurance_number: null,
  blood_type: null,
  allergies: null,
  chronic_conditions: null,
  notes: null,
  is_complete: false,
};

export function PatientFormModal({
  open,
  onOpenChange,
  patient,
  onSuccess,
}: PatientFormModalProps) {
  const [formData, setFormData] = useState<Patient>(emptyPatient);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('personal');

  useEffect(() => {
    if (patient) {
      setFormData(patient);
    } else {
      setFormData(emptyPatient);
    }
    setActiveTab('personal');
  }, [patient, open]);

  const formatCPF = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    return numbers
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2')
      .slice(0, 14);
  };

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 10) {
      return numbers
        .replace(/(\d{2})(\d)/, '($1) $2')
        .replace(/(\d{4})(\d)/, '$1-$2')
        .slice(0, 14);
    }
    return numbers
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{5})(\d)/, '$1-$2')
      .slice(0, 15);
  };

  const formatCEP = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    return numbers.replace(/(\d{5})(\d)/, '$1-$2').slice(0, 9);
  };

  const handleChange = (field: keyof Patient, value: string | null) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const checkIsComplete = (data: Patient): boolean => {
    const requiredFields: (keyof Patient)[] = [
      'cpf',
      'full_name',
      'phone',
      'birth_date',
    ];
    return requiredFields.every((field) => data[field]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.cpf || !formData.full_name) {
      toast.error('CPF e nome são obrigatórios');
      return;
    }

    setLoading(true);

    try {
      const dataToSave = {
        ...formData,
        is_complete: checkIsComplete(formData),
      };

      if (patient?.id) {
        const { error } = await supabase
          .from('patients')
          .update(dataToSave)
          .eq('id', patient.id);

        if (error) throw error;
        toast.success('Paciente atualizado com sucesso!');
      } else {
        const { error } = await supabase.from('patients').insert(dataToSave);

        if (error) {
          if (error.code === '23505') {
            toast.error('CPF já cadastrado no sistema');
            return;
          }
          throw error;
        }
        toast.success('Paciente cadastrado com sucesso!');
      }

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error saving patient:', error);
      toast.error(error.message || 'Erro ao salvar paciente');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            {patient?.id ? 'Editar Paciente' : 'Novo Paciente'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="personal" className="text-xs sm:text-sm">
                <User className="h-4 w-4 mr-1 hidden sm:inline" />
                Pessoal
              </TabsTrigger>
              <TabsTrigger value="address" className="text-xs sm:text-sm">
                <MapPin className="h-4 w-4 mr-1 hidden sm:inline" />
                Endereço
              </TabsTrigger>
              <TabsTrigger value="health" className="text-xs sm:text-sm">
                <Heart className="h-4 w-4 mr-1 hidden sm:inline" />
                Saúde
              </TabsTrigger>
              <TabsTrigger value="emergency" className="text-xs sm:text-sm">
                <AlertCircle className="h-4 w-4 mr-1 hidden sm:inline" />
                Emergência
              </TabsTrigger>
            </TabsList>

            <TabsContent value="personal" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cpf">CPF *</Label>
                  <Input
                    id="cpf"
                    value={formData.cpf}
                    onChange={(e) =>
                      handleChange('cpf', formatCPF(e.target.value))
                    }
                    placeholder="000.000.000-00"
                    maxLength={14}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="full_name">Nome Completo *</Label>
                  <Input
                    id="full_name"
                    value={formData.full_name}
                    onChange={(e) => handleChange('full_name', e.target.value)}
                    placeholder="Nome do paciente"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="birth_date">Data de Nascimento</Label>
                  <Input
                    id="birth_date"
                    type="date"
                    value={formData.birth_date || ''}
                    onChange={(e) =>
                      handleChange('birth_date', e.target.value || null)
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gender">Gênero</Label>
                  <Select
                    value={formData.gender || ''}
                    onValueChange={(value) => handleChange('gender', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {GENDERS.map((g) => (
                        <SelectItem key={g.value} value={g.value}>
                          {g.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefone</Label>
                  <Input
                    id="phone"
                    value={formData.phone || ''}
                    onChange={(e) =>
                      handleChange('phone', formatPhone(e.target.value))
                    }
                    placeholder="(00) 00000-0000"
                    maxLength={15}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="whatsapp">WhatsApp</Label>
                  <Input
                    id="whatsapp"
                    value={formData.whatsapp || ''}
                    onChange={(e) =>
                      handleChange('whatsapp', formatPhone(e.target.value))
                    }
                    placeholder="(00) 00000-0000"
                    maxLength={15}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) =>
                    handleChange('email', e.target.value || null)
                  }
                  placeholder="email@exemplo.com"
                />
              </div>
            </TabsContent>

            <TabsContent value="address" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="address">Endereço</Label>
                <Input
                  id="address"
                  value={formData.address || ''}
                  onChange={(e) =>
                    handleChange('address', e.target.value || null)
                  }
                  placeholder="Rua, número, complemento"
                />
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="space-y-2 col-span-2 sm:col-span-1">
                  <Label htmlFor="city">Cidade</Label>
                  <Input
                    id="city"
                    value={formData.city || ''}
                    onChange={(e) =>
                      handleChange('city', e.target.value || null)
                    }
                    placeholder="Cidade"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">Estado</Label>
                  <Select
                    value={formData.state || ''}
                    onValueChange={(value) => handleChange('state', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="UF" />
                    </SelectTrigger>
                    <SelectContent>
                      {STATES.map((state) => (
                        <SelectItem key={state} value={state}>
                          {state}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="zip_code">CEP</Label>
                  <Input
                    id="zip_code"
                    value={formData.zip_code || ''}
                    onChange={(e) =>
                      handleChange('zip_code', formatCEP(e.target.value))
                    }
                    placeholder="00000-000"
                    maxLength={9}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="health" className="space-y-4 mt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="blood_type">Tipo Sanguíneo</Label>
                  <Select
                    value={formData.blood_type || ''}
                    onValueChange={(value) => handleChange('blood_type', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {BLOOD_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="health_insurance">Convênio</Label>
                  <Input
                    id="health_insurance"
                    value={formData.health_insurance || ''}
                    onChange={(e) =>
                      handleChange('health_insurance', e.target.value || null)
                    }
                    placeholder="Nome do convênio"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="health_insurance_number">
                  Número da Carteirinha
                </Label>
                <Input
                  id="health_insurance_number"
                  value={formData.health_insurance_number || ''}
                  onChange={(e) =>
                    handleChange(
                      'health_insurance_number',
                      e.target.value || null
                    )
                  }
                  placeholder="Número do convênio"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="allergies">Alergias</Label>
                <Textarea
                  id="allergies"
                  value={formData.allergies || ''}
                  onChange={(e) =>
                    handleChange('allergies', e.target.value || null)
                  }
                  placeholder="Descreva alergias conhecidas"
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="chronic_conditions">Condições Crônicas</Label>
                <Textarea
                  id="chronic_conditions"
                  value={formData.chronic_conditions || ''}
                  onChange={(e) =>
                    handleChange('chronic_conditions', e.target.value || null)
                  }
                  placeholder="Descreva condições crônicas (diabetes, hipertensão, etc)"
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Observações Gerais</Label>
                <Textarea
                  id="notes"
                  value={formData.notes || ''}
                  onChange={(e) =>
                    handleChange('notes', e.target.value || null)
                  }
                  placeholder="Outras observações relevantes"
                  rows={2}
                />
              </div>
            </TabsContent>

            <TabsContent value="emergency" className="space-y-4 mt-4">
              <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                  <AlertCircle className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    Contato de Emergência
                  </span>
                </div>
                <p className="text-sm text-amber-600 dark:text-amber-500 mt-1">
                  Informe um contato para situações de emergência.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="emergency_contact_name">Nome do Contato</Label>
                  <Input
                    id="emergency_contact_name"
                    value={formData.emergency_contact_name || ''}
                    onChange={(e) =>
                      handleChange(
                        'emergency_contact_name',
                        e.target.value || null
                      )
                    }
                    placeholder="Nome completo"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="emergency_contact_phone">
                    Telefone de Emergência
                  </Label>
                  <Input
                    id="emergency_contact_phone"
                    value={formData.emergency_contact_phone || ''}
                    onChange={(e) =>
                      handleChange(
                        'emergency_contact_phone',
                        formatPhone(e.target.value)
                      )
                    }
                    placeholder="(00) 00000-0000"
                    maxLength={15}
                  />
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" variant="clinic" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {patient?.id ? 'Salvar Alterações' : 'Cadastrar Paciente'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
