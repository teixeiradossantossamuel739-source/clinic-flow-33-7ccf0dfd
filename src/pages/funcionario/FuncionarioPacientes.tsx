import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { FuncionarioLayout } from '@/components/layout/FuncionarioLayout';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Search, User, Phone, Mail, Calendar, MessageCircle, History, X } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Patient {
  name: string;
  email: string;
  phone: string;
  appointmentCount: number;
  lastAppointment: string | null;
  totalSpent: number;
}

interface Appointment {
  id: string;
  appointment_date: string;
  appointment_time: string;
  status: string;
  payment_status: string;
  amount_cents: number;
  notes: string | null;
  service_name: string | null;
}

export default function FuncionarioPacientes() {
  const { user } = useAuth();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [patientHistory, setPatientHistory] = useState<Appointment[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    const fetchPatients = async () => {
      if (!user) return;

      try {
        // First, get the professional linked to this user
        const { data: professional, error: profError } = await supabase
          .from('professionals')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (profError || !professional) {
          console.error('Professional not found:', profError);
          setLoading(false);
          return;
        }

        // Fetch all appointments for this professional
        const { data: appointments, error: appError } = await supabase
          .from('appointments')
          .select('patient_name, patient_email, patient_phone, appointment_date, amount_cents')
          .eq('professional_uuid', professional.id)
          .order('appointment_date', { ascending: false });

        if (appError) {
          console.error('Error fetching appointments:', appError);
          setLoading(false);
          return;
        }

        // Group appointments by patient email to create unique patient list
        const patientMap = new Map<string, Patient>();

        appointments?.forEach((apt) => {
          const email = apt.patient_email.toLowerCase();
          const existing = patientMap.get(email);

          if (existing) {
            existing.appointmentCount += 1;
            existing.totalSpent += apt.amount_cents || 0;
            // Keep the most recent appointment date
            if (!existing.lastAppointment || apt.appointment_date > existing.lastAppointment) {
              existing.lastAppointment = apt.appointment_date;
            }
          } else {
            patientMap.set(email, {
              name: apt.patient_name,
              email: apt.patient_email,
              phone: apt.patient_phone,
              appointmentCount: 1,
              lastAppointment: apt.appointment_date,
              totalSpent: apt.amount_cents || 0,
            });
          }
        });

        setPatients(Array.from(patientMap.values()));
      } catch (err) {
        console.error('Error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPatients();
  }, [user]);

  const fetchPatientHistory = async (patient: Patient) => {
    if (!user) return;

    setHistoryLoading(true);
    setSelectedPatient(patient);

    try {
      const { data: professional } = await supabase
        .from('professionals')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!professional) return;

      const { data: appointments, error } = await supabase
        .from('appointments')
        .select(`
          id,
          appointment_date,
          appointment_time,
          status,
          payment_status,
          amount_cents,
          notes,
          services:service_id (name)
        `)
        .eq('professional_uuid', professional.id)
        .ilike('patient_email', patient.email)
        .order('appointment_date', { ascending: false });

      if (error) {
        console.error('Error fetching history:', error);
        return;
      }

      const formattedAppointments: Appointment[] = (appointments || []).map((apt: any) => ({
        id: apt.id,
        appointment_date: apt.appointment_date,
        appointment_time: apt.appointment_time,
        status: apt.status,
        payment_status: apt.payment_status,
        amount_cents: apt.amount_cents,
        notes: apt.notes,
        service_name: apt.services?.name || null,
      }));

      setPatientHistory(formattedAppointments);
    } catch (err) {
      console.error('Error:', err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const filteredPatients = useMemo(() => {
    if (!searchQuery.trim()) return patients;

    const query = searchQuery.toLowerCase();
    return patients.filter(
      (p) =>
        p.name.toLowerCase().includes(query) ||
        p.email.toLowerCase().includes(query) ||
        p.phone.includes(query)
    );
  }, [patients, searchQuery]);

  const formatCurrency = (cents: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(cents / 100);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
      pending: { label: 'Pendente', variant: 'secondary' },
      confirmed: { label: 'Confirmado', variant: 'default' },
      completed: { label: 'Concluído', variant: 'outline' },
      cancelled: { label: 'Cancelado', variant: 'destructive' },
    };
    const config = variants[status] || { label: status, variant: 'secondary' };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const openWhatsApp = (phone: string, name: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    const message = encodeURIComponent(`Olá ${name}, tudo bem?`);
    window.open(`https://wa.me/55${cleanPhone}?text=${message}`, '_blank');
  };

  return (
    <FuncionarioLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Meus Pacientes</h1>
          <p className="text-muted-foreground">
            Pacientes que já realizaram consultas com você
          </p>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, email ou telefone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Patients Table */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        ) : filteredPatients.length === 0 ? (
          <div className="text-center py-12 bg-muted/30 rounded-lg">
            <User className="mx-auto h-12 w-12 text-muted-foreground/50" />
            <h3 className="mt-4 text-lg font-medium text-foreground">
              {searchQuery ? 'Nenhum paciente encontrado' : 'Sem pacientes ainda'}
            </h3>
            <p className="mt-2 text-muted-foreground">
              {searchQuery
                ? 'Tente buscar com outros termos'
                : 'Quando você tiver consultas, seus pacientes aparecerão aqui'}
            </p>
          </div>
        ) : (
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Paciente</TableHead>
                  <TableHead>Contato</TableHead>
                  <TableHead className="text-center">Consultas</TableHead>
                  <TableHead>Última Consulta</TableHead>
                  <TableHead className="text-right">Total Gasto</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPatients.map((patient) => (
                  <TableRow key={patient.email}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{patient.name}</p>
                          <p className="text-sm text-muted-foreground">{patient.email}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Phone className="h-4 w-4" />
                        {patient.phone}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge variant="secondary">{patient.appointmentCount}</Badge>
                    </TableCell>
                    <TableCell>
                      {patient.lastAppointment ? (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="h-4 w-4" />
                          {format(parseISO(patient.lastAppointment), "dd/MM/yyyy", { locale: ptBR })}
                        </div>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(patient.totalSpent)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => openWhatsApp(patient.phone, patient.name)}
                          title="Enviar WhatsApp"
                        >
                          <MessageCircle className="h-4 w-4 text-green-600" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => fetchPatientHistory(patient)}
                          title="Ver histórico"
                        >
                          <History className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Patient Info */}
        <div className="text-sm text-muted-foreground">
          {filteredPatients.length} paciente{filteredPatients.length !== 1 ? 's' : ''} encontrado{filteredPatients.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* History Dialog */}
      <Dialog open={!!selectedPatient} onOpenChange={() => setSelectedPatient(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p>{selectedPatient?.name}</p>
                <p className="text-sm font-normal text-muted-foreground">{selectedPatient?.email}</p>
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 mt-4">
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                {selectedPatient?.phone}
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => selectedPatient && openWhatsApp(selectedPatient.phone, selectedPatient.name)}
              >
                <MessageCircle className="h-4 w-4 mr-2 text-green-600" />
                WhatsApp
              </Button>
            </div>

            <div className="border-t pt-4">
              <h4 className="font-medium mb-3">Histórico de Consultas</h4>

              {historyLoading ? (
                <div className="space-y-2">
                  {[...Array(3)].map((_, i) => (
                    <Skeleton key={i} className="h-20 w-full" />
                  ))}
                </div>
              ) : patientHistory.length === 0 ? (
                <p className="text-muted-foreground text-sm">Nenhuma consulta encontrada.</p>
              ) : (
                <div className="space-y-3">
                  {patientHistory.map((apt) => (
                    <div
                      key={apt.id}
                      className="border rounded-lg p-4 bg-muted/30 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">
                            {format(parseISO(apt.appointment_date), "dd/MM/yyyy", { locale: ptBR })}
                          </span>
                          <span className="text-muted-foreground">às {apt.appointment_time.slice(0, 5)}</span>
                        </div>
                        {getStatusBadge(apt.status)}
                      </div>

                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">
                          {apt.service_name || 'Serviço não especificado'}
                        </span>
                        <span className="font-medium">{formatCurrency(apt.amount_cents)}</span>
                      </div>

                      {apt.notes && (
                        <p className="text-sm text-muted-foreground border-t pt-2 mt-2">
                          📝 {apt.notes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </FuncionarioLayout>
  );
}

