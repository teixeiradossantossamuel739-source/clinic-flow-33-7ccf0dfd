import { useState, useEffect, useMemo } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Search,
  Plus,
  Phone,
  Mail,
  Calendar,
  MoreHorizontal,
  FileText,
  Edit,
  Trash2,
  AlertTriangle,
  User,
  MessageCircle,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { PatientFormModal } from '@/components/patients/PatientFormModal';
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
  updated_at: string;
  // Aggregated data
  appointments_count?: number;
  last_visit?: string | null;
}

export default function AdminPatients() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [patientToDelete, setPatientToDelete] = useState<Patient | null>(null);

  const fetchPatients = async () => {
    setLoading(true);
    try {
      // Fetch patients with appointment count
      const { data: patientsData, error: patientsError } = await supabase
        .from('patients')
        .select('*')
        .order('full_name', { ascending: true });

      if (patientsError) throw patientsError;

      // Fetch appointment counts and last visit dates
      const { data: appointmentsData, error: appointmentsError } = await supabase
        .from('appointments')
        .select('patient_id, appointment_date')
        .not('patient_id', 'is', null);

      if (appointmentsError) throw appointmentsError;

      // Aggregate appointment data by patient
      const appointmentStats = new Map<string, { count: number; lastVisit: string | null }>();
      
      appointmentsData?.forEach((apt) => {
        if (!apt.patient_id) return;
        
        const existing = appointmentStats.get(apt.patient_id);
        if (existing) {
          existing.count += 1;
          if (!existing.lastVisit || apt.appointment_date > existing.lastVisit) {
            existing.lastVisit = apt.appointment_date;
          }
        } else {
          appointmentStats.set(apt.patient_id, {
            count: 1,
            lastVisit: apt.appointment_date,
          });
        }
      });

      // Merge patient data with stats
      const patientsWithStats = (patientsData || []).map((patient) => {
        const stats = appointmentStats.get(patient.id);
        return {
          ...patient,
          appointments_count: stats?.count || 0,
          last_visit: stats?.lastVisit || null,
        };
      });

      setPatients(patientsWithStats);
    } catch (error) {
      console.error('Error fetching patients:', error);
      toast.error('Erro ao carregar pacientes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, []);

  const filteredPatients = useMemo(() => {
    if (!searchQuery.trim()) return patients;

    const query = searchQuery.toLowerCase().replace(/[.-]/g, '');
    return patients.filter(
      (p) =>
        p.full_name.toLowerCase().includes(query) ||
        p.email?.toLowerCase().includes(query) ||
        p.phone?.replace(/\D/g, '').includes(query) ||
        p.cpf.replace(/\D/g, '').includes(query)
    );
  }, [patients, searchQuery]);

  const handleEdit = (patient: Patient) => {
    setSelectedPatient(patient);
    setFormModalOpen(true);
  };

  const handleNewPatient = () => {
    setSelectedPatient(null);
    setFormModalOpen(true);
  };

  const handleDelete = async () => {
    if (!patientToDelete) return;

    try {
      const { error } = await supabase
        .from('patients')
        .delete()
        .eq('id', patientToDelete.id);

      if (error) throw error;

      toast.success('Paciente excluído com sucesso');
      fetchPatients();
    } catch (error: any) {
      console.error('Error deleting patient:', error);
      toast.error('Erro ao excluir paciente');
    } finally {
      setDeleteDialogOpen(false);
      setPatientToDelete(null);
    }
  };

  const openWhatsApp = (phone: string, name: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    const message = encodeURIComponent(`Olá ${name}, tudo bem?`);
    window.open(`https://wa.me/55${cleanPhone}?text=${message}`, '_blank');
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Pacientes</h1>
            <p className="text-muted-foreground">
              {patients.length} pacientes cadastrados
            </p>
          </div>
          <Button variant="clinic" onClick={handleNewPatient}>
            <Plus className="h-4 w-4" />
            Novo Paciente
          </Button>
        </div>

        {/* Search */}
        <div className="bg-background rounded-2xl p-4 shadow-sm border">
          <div className="flex items-center gap-2 bg-muted/50 rounded-xl px-4 py-2 max-w-md">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Buscar por nome, CPF, email ou telefone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none shadow-none px-0 focus-visible:ring-0"
            />
          </div>
        </div>

        {/* Patients List */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-lg" />
            ))}
          </div>
        ) : (
          <div className="bg-background rounded-2xl shadow-sm border overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground">
                      Paciente
                    </th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground hidden md:table-cell">
                      Contato
                    </th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground hidden lg:table-cell">
                      Consultas
                    </th>
                    <th className="text-left p-4 text-sm font-medium text-muted-foreground hidden lg:table-cell">
                      Última Visita
                    </th>
                    <th className="text-right p-4 text-sm font-medium text-muted-foreground">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredPatients.map((patient) => (
                    <tr
                      key={patient.id}
                      className="hover:bg-muted/30 transition-colors"
                    >
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-medium">
                            {patient.full_name.charAt(0)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium">{patient.full_name}</p>
                              {!patient.is_complete && (
                                <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-950/30">
                                  <AlertTriangle className="h-3 w-3 mr-1" />
                                  Incompleto
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {patient.cpf}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 hidden md:table-cell">
                        <div className="space-y-1">
                          {patient.phone && (
                            <p className="text-sm flex items-center gap-2">
                              <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                              {patient.phone}
                            </p>
                          )}
                          {patient.email && (
                            <p className="text-sm flex items-center gap-2 text-muted-foreground">
                              <Mail className="h-3.5 w-3.5" />
                              {patient.email}
                            </p>
                          )}
                        </div>
                      </td>
                      <td className="p-4 hidden lg:table-cell">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">
                            {patient.appointments_count || 0} consultas
                          </span>
                        </div>
                      </td>
                      <td className="p-4 hidden lg:table-cell">
                        <span className="text-sm text-muted-foreground">
                          {patient.last_visit
                            ? format(parseISO(patient.last_visit), "dd 'de' MMM, yyyy", {
                                locale: ptBR,
                              })
                            : 'Nunca'}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {patient.whatsapp && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="hidden sm:inline-flex"
                              onClick={() =>
                                openWhatsApp(patient.whatsapp!, patient.full_name)
                              }
                            >
                              <MessageCircle className="h-4 w-4 text-green-600" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="hidden sm:inline-flex"
                          >
                            <FileText className="h-4 w-4" />
                            Prontuário
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>
                                <FileText className="h-4 w-4 mr-2" />
                                Ver Prontuário
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Calendar className="h-4 w-4 mr-2" />
                                Agendar Consulta
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleEdit(patient)}>
                                <Edit className="h-4 w-4 mr-2" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => {
                                  setPatientToDelete(patient);
                                  setDeleteDialogOpen(true);
                                }}
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredPatients.length === 0 && !loading && (
              <div className="p-12 text-center">
                <User className="mx-auto h-12 w-12 text-muted-foreground/50" />
                <h3 className="mt-4 text-lg font-medium">
                  {searchQuery ? 'Nenhum paciente encontrado' : 'Sem pacientes cadastrados'}
                </h3>
                <p className="mt-2 text-muted-foreground">
                  {searchQuery
                    ? 'Tente buscar com outros termos'
                    : 'Clique em "Novo Paciente" para cadastrar'}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Patient count */}
        {!loading && (
          <div className="text-sm text-muted-foreground">
            {filteredPatients.length} paciente{filteredPatients.length !== 1 ? 's' : ''} encontrado{filteredPatients.length !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Form Modal */}
      <PatientFormModal
        open={formModalOpen}
        onOpenChange={setFormModalOpen}
        patient={selectedPatient}
        onSuccess={fetchPatients}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Paciente</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o paciente{' '}
              <strong>{patientToDelete?.full_name}</strong>? Esta ação não pode ser
              desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
