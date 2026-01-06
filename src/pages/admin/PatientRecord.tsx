import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ArrowLeft,
  User,
  Phone,
  Mail,
  Calendar,
  MapPin,
  Heart,
  AlertTriangle,
  FileText,
  Clock,
  Download,
  Filter,
  Stethoscope,
  Pill,
  ClipboardList,
  MessageCircle,
} from 'lucide-react';
import { format, parseISO, subDays, subWeeks, subMonths, isAfter } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

interface Patient {
  id: string;
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
  created_at: string;
}

interface MedicalRecord {
  id: string;
  patient_id: string;
  appointment_id: string | null;
  professional_id: string;
  record_date: string;
  record_type: string;
  chief_complaint: string | null;
  diagnosis: string | null;
  procedure_performed: string | null;
  prescription: string | null;
  observations: string | null;
  follow_up_date: string | null;
  created_at: string;
  professional?: {
    name: string;
    specialty_id: string;
  };
}

interface Professional {
  id: string;
  name: string;
}

const RECORD_TYPE_LABELS: Record<string, { label: string; color: string; icon: any }> = {
  consulta: { label: 'Consulta', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400', icon: Stethoscope },
  procedimento: { label: 'Procedimento', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400', icon: ClipboardList },
  exame: { label: 'Exame', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400', icon: FileText },
  retorno: { label: 'Retorno', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400', icon: Calendar },
};

const PERIOD_OPTIONS = [
  { value: 'all', label: 'Todo o período' },
  { value: '7days', label: 'Últimos 7 dias' },
  { value: '30days', label: 'Últimos 30 dias' },
  { value: '3months', label: 'Últimos 3 meses' },
  { value: '6months', label: 'Últimos 6 meses' },
  { value: '1year', label: 'Último ano' },
];

export default function PatientRecord() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [patient, setPatient] = useState<Patient | null>(null);
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(true);
  const [recordsLoading, setRecordsLoading] = useState(true);
  
  // Filters
  const [periodFilter, setPeriodFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [professionalFilter, setProfessionalFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (id) {
      fetchPatient();
      fetchRecords();
      fetchProfessionals();
    }
  }, [id]);

  const fetchPatient = async () => {
    try {
      const { data, error } = await supabase
        .from('patients')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        toast.error('Paciente não encontrado');
        navigate('/admin/pacientes');
        return;
      }

      setPatient(data);
    } catch (error) {
      console.error('Error fetching patient:', error);
      toast.error('Erro ao carregar paciente');
    } finally {
      setLoading(false);
    }
  };

  const fetchRecords = async () => {
    setRecordsLoading(true);
    try {
      const { data, error } = await supabase
        .from('medical_records')
        .select(`
          *,
          professional:professionals(name, specialty_id)
        `)
        .eq('patient_id', id)
        .order('record_date', { ascending: false });

      if (error) throw error;
      setRecords(data || []);
    } catch (error) {
      console.error('Error fetching records:', error);
      toast.error('Erro ao carregar prontuário');
    } finally {
      setRecordsLoading(false);
    }
  };

  const fetchProfessionals = async () => {
    try {
      const { data, error } = await supabase
        .from('professionals')
        .select('id, name')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setProfessionals(data || []);
    } catch (error) {
      console.error('Error fetching professionals:', error);
    }
  };

  const filteredRecords = useMemo(() => {
    let filtered = [...records];

    // Period filter
    if (periodFilter !== 'all') {
      const now = new Date();
      let startDate: Date;

      switch (periodFilter) {
        case '7days':
          startDate = subDays(now, 7);
          break;
        case '30days':
          startDate = subDays(now, 30);
          break;
        case '3months':
          startDate = subMonths(now, 3);
          break;
        case '6months':
          startDate = subMonths(now, 6);
          break;
        case '1year':
          startDate = subMonths(now, 12);
          break;
        default:
          startDate = new Date(0);
      }

      filtered = filtered.filter((r) =>
        isAfter(parseISO(r.record_date), startDate)
      );
    }

    // Type filter
    if (typeFilter !== 'all') {
      filtered = filtered.filter((r) => r.record_type === typeFilter);
    }

    // Professional filter
    if (professionalFilter !== 'all') {
      filtered = filtered.filter((r) => r.professional_id === professionalFilter);
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.diagnosis?.toLowerCase().includes(query) ||
          r.procedure_performed?.toLowerCase().includes(query) ||
          r.observations?.toLowerCase().includes(query) ||
          r.chief_complaint?.toLowerCase().includes(query)
      );
    }

    return filtered;
  }, [records, periodFilter, typeFilter, professionalFilter, searchQuery]);

  const calculateAge = (birthDate: string) => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const openWhatsApp = (phone: string, name: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    const message = encodeURIComponent(`Olá ${name}, tudo bem?`);
    window.open(`https://wa.me/55${cleanPhone}?text=${message}`, '_blank');
  };

  const getGenderLabel = (gender: string | null) => {
    const genders: Record<string, string> = {
      masculino: 'Masculino',
      feminino: 'Feminino',
      outro: 'Outro',
      nao_informado: 'Não informado',
    };
    return gender ? genders[gender] || gender : 'Não informado';
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="space-y-6">
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </AdminLayout>
    );
  }

  if (!patient) {
    return null;
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/admin/pacientes')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Prontuário do Paciente</h1>
            <p className="text-muted-foreground">
              Histórico completo de atendimentos
            </p>
          </div>
        </div>

        {/* Patient Info Card */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col lg:flex-row gap-6">
              {/* Avatar and basic info */}
              <div className="flex items-start gap-4">
                <div className="h-20 w-20 rounded-2xl bg-primary/10 flex items-center justify-center text-primary text-2xl font-bold">
                  {patient.full_name.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold">{patient.full_name}</h2>
                    {!patient.is_complete && (
                      <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-950/30">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Incompleto
                      </Badge>
                    )}
                  </div>
                  <p className="text-muted-foreground">{patient.cpf}</p>
                  {patient.birth_date && (
                    <p className="text-sm text-muted-foreground mt-1">
                      {calculateAge(patient.birth_date)} anos • {getGenderLabel(patient.gender)}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    {patient.whatsapp && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openWhatsApp(patient.whatsapp!, patient.full_name)}
                      >
                        <MessageCircle className="h-4 w-4 mr-1 text-green-600" />
                        WhatsApp
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              {/* Contact info */}
              <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {patient.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{patient.phone}</span>
                  </div>
                )}
                {patient.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span>{patient.email}</span>
                  </div>
                )}
                {(patient.city || patient.state) && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>
                      {[patient.city, patient.state].filter(Boolean).join(' / ')}
                    </span>
                  </div>
                )}
                {patient.health_insurance && (
                  <div className="flex items-center gap-2 text-sm">
                    <Heart className="h-4 w-4 text-muted-foreground" />
                    <span>{patient.health_insurance}</span>
                  </div>
                )}
                {patient.blood_type && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-red-500 font-medium">🩸 {patient.blood_type}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Health alerts */}
            {(patient.allergies || patient.chronic_conditions) && (
              <div className="mt-4 pt-4 border-t grid grid-cols-1 md:grid-cols-2 gap-4">
                {patient.allergies && (
                  <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-red-700 dark:text-red-400 font-medium text-sm mb-1">
                      <AlertTriangle className="h-4 w-4" />
                      Alergias
                    </div>
                    <p className="text-sm text-red-600 dark:text-red-400">{patient.allergies}</p>
                  </div>
                )}
                {patient.chronic_conditions && (
                  <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                    <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-medium text-sm mb-1">
                      <Heart className="h-4 w-4" />
                      Condições Crônicas
                    </div>
                    <p className="text-sm text-amber-600 dark:text-amber-400">{patient.chronic_conditions}</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tabs */}
        <Tabs defaultValue="timeline" className="space-y-4">
          <TabsList>
            <TabsTrigger value="timeline">
              <Clock className="h-4 w-4 mr-2" />
              Linha do Tempo
            </TabsTrigger>
            <TabsTrigger value="info">
              <User className="h-4 w-4 mr-2" />
              Informações
            </TabsTrigger>
          </TabsList>

          <TabsContent value="timeline" className="space-y-4">
            {/* Filters */}
            <Card>
              <CardContent className="pt-4">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <Input
                      placeholder="Buscar em diagnósticos, procedimentos..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="max-w-md"
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Select value={periodFilter} onValueChange={setPeriodFilter}>
                      <SelectTrigger className="w-[160px]">
                        <Calendar className="h-4 w-4 mr-2" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PERIOD_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                      <SelectTrigger className="w-[140px]">
                        <Filter className="h-4 w-4 mr-2" />
                        <SelectValue placeholder="Tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os tipos</SelectItem>
                        {Object.entries(RECORD_TYPE_LABELS).map(([key, val]) => (
                          <SelectItem key={key} value={key}>
                            {val.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Select value={professionalFilter} onValueChange={setProfessionalFilter}>
                      <SelectTrigger className="w-[180px]">
                        <User className="h-4 w-4 mr-2" />
                        <SelectValue placeholder="Profissional" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos os profissionais</SelectItem>
                        {professionals.map((prof) => (
                          <SelectItem key={prof.id} value={prof.id}>
                            {prof.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Records count */}
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {filteredRecords.length} registro{filteredRecords.length !== 1 ? 's' : ''} encontrado{filteredRecords.length !== 1 ? 's' : ''}
              </p>
            </div>

            {/* Timeline */}
            {recordsLoading ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <Skeleton key={i} className="h-32 w-full" />
                ))}
              </div>
            ) : filteredRecords.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <FileText className="mx-auto h-12 w-12 text-muted-foreground/50" />
                  <h3 className="mt-4 text-lg font-medium">Nenhum registro encontrado</h3>
                  <p className="mt-2 text-muted-foreground">
                    {records.length === 0
                      ? 'Este paciente ainda não possui registros no prontuário'
                      : 'Tente ajustar os filtros de busca'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border" />

                <div className="space-y-4">
                  {filteredRecords.map((record, index) => {
                    const typeConfig = RECORD_TYPE_LABELS[record.record_type] || {
                      label: record.record_type,
                      color: 'bg-gray-100 text-gray-700',
                      icon: FileText,
                    };
                    const Icon = typeConfig.icon;

                    return (
                      <div key={record.id} className="relative pl-14">
                        {/* Timeline dot */}
                        <div className="absolute left-4 top-4 w-5 h-5 rounded-full bg-background border-2 border-primary flex items-center justify-center">
                          <div className="w-2 h-2 rounded-full bg-primary" />
                        </div>

                        <Card>
                          <CardContent className="pt-4">
                            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-3">
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge className={typeConfig.color}>
                                  <Icon className="h-3 w-3 mr-1" />
                                  {typeConfig.label}
                                </Badge>
                                <span className="text-sm text-muted-foreground">
                                  {format(parseISO(record.record_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                                </span>
                              </div>
                              {record.professional && (
                                <span className="text-sm text-muted-foreground">
                                  {record.professional.name}
                                </span>
                              )}
                            </div>

                            <div className="space-y-2">
                              {record.chief_complaint && (
                                <div>
                                  <span className="text-sm font-medium text-muted-foreground">Queixa: </span>
                                  <span className="text-sm">{record.chief_complaint}</span>
                                </div>
                              )}

                              {record.diagnosis && (
                                <div>
                                  <span className="text-sm font-medium text-muted-foreground">Diagnóstico: </span>
                                  <span className="text-sm">{record.diagnosis}</span>
                                </div>
                              )}

                              {record.procedure_performed && (
                                <div>
                                  <span className="text-sm font-medium text-muted-foreground">Procedimento: </span>
                                  <span className="text-sm">{record.procedure_performed}</span>
                                </div>
                              )}

                              {record.prescription && (
                                <div className="bg-muted/50 rounded-lg p-3 mt-2">
                                  <div className="flex items-center gap-2 text-sm font-medium mb-1">
                                    <Pill className="h-4 w-4" />
                                    Prescrição
                                  </div>
                                  <p className="text-sm whitespace-pre-wrap">{record.prescription}</p>
                                </div>
                              )}

                              {record.observations && (
                                <div className="text-sm text-muted-foreground mt-2 pt-2 border-t">
                                  📝 {record.observations}
                                </div>
                              )}

                              {record.follow_up_date && (
                                <div className="flex items-center gap-2 text-sm text-primary mt-2">
                                  <Calendar className="h-4 w-4" />
                                  Retorno: {format(parseISO(record.follow_up_date), "dd/MM/yyyy", { locale: ptBR })}
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="info">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Personal Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <User className="h-5 w-5" />
                    Dados Pessoais
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <InfoRow label="Nome Completo" value={patient.full_name} />
                  <InfoRow label="CPF" value={patient.cpf} />
                  <InfoRow
                    label="Data de Nascimento"
                    value={
                      patient.birth_date
                        ? format(parseISO(patient.birth_date), "dd/MM/yyyy", { locale: ptBR })
                        : null
                    }
                  />
                  <InfoRow label="Gênero" value={getGenderLabel(patient.gender)} />
                  <InfoRow label="Telefone" value={patient.phone} />
                  <InfoRow label="WhatsApp" value={patient.whatsapp} />
                  <InfoRow label="Email" value={patient.email} />
                </CardContent>
              </Card>

              {/* Address */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <MapPin className="h-5 w-5" />
                    Endereço
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <InfoRow label="Endereço" value={patient.address} />
                  <InfoRow label="Cidade" value={patient.city} />
                  <InfoRow label="Estado" value={patient.state} />
                  <InfoRow label="CEP" value={patient.zip_code} />
                </CardContent>
              </Card>

              {/* Health Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Heart className="h-5 w-5" />
                    Informações de Saúde
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <InfoRow label="Tipo Sanguíneo" value={patient.blood_type} />
                  <InfoRow label="Convênio" value={patient.health_insurance} />
                  <InfoRow label="Nº Carteirinha" value={patient.health_insurance_number} />
                  <InfoRow label="Alergias" value={patient.allergies} />
                  <InfoRow label="Condições Crônicas" value={patient.chronic_conditions} />
                  <InfoRow label="Observações" value={patient.notes} />
                </CardContent>
              </Card>

              {/* Emergency Contact */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <AlertTriangle className="h-5 w-5" />
                    Contato de Emergência
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <InfoRow label="Nome" value={patient.emergency_contact_name} />
                  <InfoRow label="Telefone" value={patient.emergency_contact_phone} />
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}

function InfoRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex justify-between items-start gap-4">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm text-right font-medium">
        {value || <span className="text-muted-foreground">-</span>}
      </span>
    </div>
  );
}