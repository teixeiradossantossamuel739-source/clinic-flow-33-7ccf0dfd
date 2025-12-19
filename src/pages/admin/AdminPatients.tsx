import { useState } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { patients } from '@/data/mockData';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Search,
  Plus,
  Phone,
  Mail,
  Calendar,
  ChevronRight,
  MoreHorizontal,
  FileText,
  Edit,
  Trash2,
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export default function AdminPatients() {
  const [searchQuery, setSearchQuery] = useState('');

  const filteredPatients = patients.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.phone.includes(searchQuery)
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Pacientes</h1>
            <p className="text-clinic-text-secondary">
              {patients.length} pacientes cadastrados
            </p>
          </div>
          <Button variant="clinic">
            <Plus className="h-4 w-4" />
            Novo Paciente
          </Button>
        </div>

        {/* Search */}
        <div className="bg-background rounded-2xl p-4 shadow-clinic-sm">
          <div className="flex items-center gap-2 bg-clinic-surface rounded-xl px-4 py-2 max-w-md">
            <Search className="h-4 w-4 text-clinic-text-muted" />
            <Input
              type="text"
              placeholder="Buscar por nome, email ou telefone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none shadow-none px-0 focus-visible:ring-0"
            />
          </div>
        </div>

        {/* Patients List */}
        <div className="bg-background rounded-2xl shadow-clinic-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-clinic-border-subtle">
                  <th className="text-left p-4 text-sm font-medium text-clinic-text-muted">
                    Paciente
                  </th>
                  <th className="text-left p-4 text-sm font-medium text-clinic-text-muted hidden md:table-cell">
                    Contato
                  </th>
                  <th className="text-left p-4 text-sm font-medium text-clinic-text-muted hidden lg:table-cell">
                    Consultas
                  </th>
                  <th className="text-left p-4 text-sm font-medium text-clinic-text-muted hidden lg:table-cell">
                    Última Visita
                  </th>
                  <th className="text-right p-4 text-sm font-medium text-clinic-text-muted">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-clinic-border-subtle">
                {filteredPatients.map((patient) => (
                  <tr
                    key={patient.id}
                    className="hover:bg-clinic-surface/50 transition-colors"
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-clinic-primary/10 flex items-center justify-center text-clinic-primary font-medium">
                          {patient.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-medium">{patient.name}</p>
                          <p className="text-sm text-clinic-text-muted">
                            {patient.cpf}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 hidden md:table-cell">
                      <div className="space-y-1">
                        <p className="text-sm flex items-center gap-2">
                          <Phone className="h-3.5 w-3.5 text-clinic-text-muted" />
                          {patient.phone}
                        </p>
                        <p className="text-sm flex items-center gap-2 text-clinic-text-muted">
                          <Mail className="h-3.5 w-3.5" />
                          {patient.email}
                        </p>
                      </div>
                    </td>
                    <td className="p-4 hidden lg:table-cell">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-clinic-text-muted" />
                        <span className="text-sm">{patient.appointmentsCount} consultas</span>
                      </div>
                    </td>
                    <td className="p-4 hidden lg:table-cell">
                      <span className="text-sm text-clinic-text-secondary">
                        {patient.lastVisit
                          ? format(new Date(patient.lastVisit), "dd 'de' MMM, yyyy", {
                              locale: ptBR,
                            })
                          : 'Nunca'}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button variant="ghost" size="sm" className="hidden sm:inline-flex">
                          <FileText className="h-4 w-4" />
                          Prontuário
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon-sm">
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
                            <DropdownMenuItem>
                              <Edit className="h-4 w-4 mr-2" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive">
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

          {filteredPatients.length === 0 && (
            <div className="p-12 text-center">
              <p className="text-clinic-text-muted">Nenhum paciente encontrado</p>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
