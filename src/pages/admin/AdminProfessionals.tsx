import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Search,
  Plus,
  Star,
  Calendar,
  DollarSign,
  MoreHorizontal,
  Edit,
  Trash2,
  BarChart3,
  Loader2,
  Clock,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

interface Professional {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  specialty_id: string;
  crm: string | null;
  bio: string | null;
  avatar_url: string | null;
  rating: number | null;
  review_count: number | null;
  is_active: boolean;
  profession: string;
}

interface ProfessionalSchedule {
  id: string;
  professional_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  slot_duration_minutes: number;
  is_active: boolean;
}

const PROFESSIONS = [
  { id: 'Médico', name: 'Médico' },
  { id: 'Dentista', name: 'Dentista' },
  { id: 'Psicólogo', name: 'Psicólogo' },
  { id: 'Enfermeiro', name: 'Enfermeiro' },
  { id: 'Fisioterapeuta', name: 'Fisioterapeuta' },
  { id: 'Nutricionista', name: 'Nutricionista' },
];

const SPECIALTIES = [
  { id: 'clinica-geral', name: 'Clínica Geral' },
  { id: 'cardiologia', name: 'Cardiologia' },
  { id: 'dermatologia', name: 'Dermatologia' },
  { id: 'pediatria', name: 'Pediatria' },
  { id: 'ortopedia', name: 'Ortopedia' },
  { id: 'oftalmologia', name: 'Oftalmologia' },
  { id: 'ginecologia', name: 'Ginecologia' },
  { id: 'neurologia', name: 'Neurologia' },
];

const DAYS_OF_WEEK = [
  { value: 0, label: 'Domingo' },
  { value: 1, label: 'Segunda' },
  { value: 2, label: 'Terça' },
  { value: 3, label: 'Quarta' },
  { value: 4, label: 'Quinta' },
  { value: 5, label: 'Sexta' },
  { value: 6, label: 'Sábado' },
];

export default function AdminProfessionals() {
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [schedules, setSchedules] = useState<ProfessionalSchedule[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProfessional, setEditingProfessional] = useState<Professional | null>(null);

  const fetchData = async () => {
    const [profRes, schedRes] = await Promise.all([
      supabase.from('professionals').select('*').order('name'),
      supabase.from('professional_schedules').select('*'),
    ]);

    if (profRes.data) setProfessionals(profRes.data);
    if (schedRes.data) setSchedules(schedRes.data);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredProfessionals = professionals.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.specialty_id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getSpecialtyName = (id: string) => {
    return SPECIALTIES.find((s) => s.id === id)?.name || id;
  };

  const getProfessionalScheduleDays = (professionalId: string) => {
    return schedules
      .filter((s) => s.professional_id === professionalId && s.is_active)
      .map((s) => DAYS_OF_WEEK.find((d) => d.value === s.day_of_week)?.label?.slice(0, 3))
      .filter(Boolean);
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-clinic-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Profissionais</h1>
            <p className="text-clinic-text-secondary">
              {professionals.length} profissionais cadastrados
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="clinic" onClick={() => setEditingProfessional(null)}>
                <Plus className="h-4 w-4" />
                Novo Profissional
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingProfessional ? 'Editar Profissional' : 'Novo Profissional'}
                </DialogTitle>
              </DialogHeader>
              <ProfessionalForm
                professional={editingProfessional}
                onSuccess={() => {
                  setDialogOpen(false);
                  fetchData();
                }}
              />
            </DialogContent>
          </Dialog>
        </div>

        {/* Search */}
        <div className="bg-background rounded-2xl p-4 shadow-clinic-sm">
          <div className="flex items-center gap-2 bg-clinic-surface rounded-xl px-4 py-2 max-w-md">
            <Search className="h-4 w-4 text-clinic-text-muted" />
            <Input
              type="text"
              placeholder="Buscar por nome, email ou especialidade..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none shadow-none px-0 focus-visible:ring-0"
            />
          </div>
        </div>

        {/* Professionals Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProfessionals.map((professional) => (
            <div
              key={professional.id}
              className="bg-background rounded-2xl p-6 shadow-clinic-sm hover:shadow-clinic-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                  <img
                    src={professional.avatar_url || '/placeholder.svg'}
                    alt={professional.name}
                    className="h-14 w-14 rounded-xl object-cover"
                  />
                  <div>
                    <h3 className="font-semibold">{professional.name}</h3>
                    <p className="text-sm text-clinic-text-muted">
                      {getSpecialtyName(professional.specialty_id)}
                    </p>
                    <p className="text-xs text-clinic-text-muted">{professional.crm}</p>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon-sm">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem asChild>
                      <Link to={`/admin/profissionais/${professional.id}`}>
                        <BarChart3 className="h-4 w-4 mr-2" />
                        Ver Dashboard
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => {
                        setEditingProfessional(professional);
                        setDialogOpen(true);
                      }}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Desativar
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="flex items-center gap-2 mb-3">
                <Star className="h-4 w-4 fill-warning text-warning" />
                <span className="text-sm font-medium">{professional.rating || 5.0}</span>
                <span className="text-sm text-clinic-text-muted">
                  ({professional.review_count || 0})
                </span>
              </div>

              <div className="flex flex-wrap gap-1 mb-4">
                {getProfessionalScheduleDays(professional.id).map((day) => (
                  <span
                    key={day}
                    className="text-xs px-2 py-1 rounded-full bg-clinic-surface text-clinic-text-secondary"
                  >
                    {day}
                  </span>
                ))}
              </div>

              <div className="flex gap-2">
                <Link to={`/admin/profissionais/${professional.id}`} className="flex-1">
                  <Button variant="outline" size="sm" className="w-full">
                    <BarChart3 className="h-4 w-4" />
                    Dashboard
                  </Button>
                </Link>
                <Button variant="ghost" size="sm">
                  <Clock className="h-4 w-4" />
                  Agenda
                </Button>
              </div>
            </div>
          ))}
        </div>

        {filteredProfessionals.length === 0 && (
          <div className="bg-background rounded-2xl p-12 shadow-clinic-sm text-center">
            <p className="text-clinic-text-muted">Nenhum profissional encontrado</p>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

interface ProfessionalFormProps {
  professional: Professional | null;
  onSuccess: () => void;
}

function ProfessionalForm({ professional, onSuccess }: ProfessionalFormProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: professional?.name || '',
    email: professional?.email || '',
    phone: professional?.phone || '',
    profession: professional?.profession || 'Médico',
    specialty_id: professional?.specialty_id || 'clinica-geral',
    crm: professional?.crm || '',
    bio: professional?.bio || '',
    avatar_url: professional?.avatar_url || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (professional) {
        const { error } = await supabase
          .from('professionals')
          .update(formData)
          .eq('id', professional.id);

        if (error) throw error;
        toast.success('Profissional atualizado com sucesso');
      } else {
        const { error } = await supabase.from('professionals').insert(formData);

        if (error) throw error;
        toast.success('Profissional cadastrado com sucesso');
      }

      onSuccess();
    } catch (error) {
      console.error('Error saving professional:', error);
      toast.error('Erro ao salvar profissional');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Nome Completo *</Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email *</Label>
        <Input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="phone">Telefone</Label>
          <Input
            id="phone"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="crm">CRM</Label>
          <Input
            id="crm"
            value={formData.crm}
            onChange={(e) => setFormData({ ...formData, crm: e.target.value })}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="profession">Profissão *</Label>
          <select
            id="profession"
            value={formData.profession}
            onChange={(e) => setFormData({ ...formData, profession: e.target.value })}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
          >
            {PROFESSIONS.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="specialty">Especialidade *</Label>
          <select
            id="specialty"
            value={formData.specialty_id}
            onChange={(e) => setFormData({ ...formData, specialty_id: e.target.value })}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
          >
            {SPECIALTIES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="avatar">URL da Foto</Label>
        <Input
          id="avatar"
          value={formData.avatar_url}
          onChange={(e) => setFormData({ ...formData, avatar_url: e.target.value })}
          placeholder="https://..."
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="bio">Biografia</Label>
        <Textarea
          id="bio"
          value={formData.bio}
          onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
          rows={3}
        />
      </div>

      <Button type="submit" variant="clinic" className="w-full" disabled={loading}>
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : professional ? (
          'Salvar Alterações'
        ) : (
          'Cadastrar Profissional'
        )}
      </Button>
    </form>
  );
}
