import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Search,
  Plus,
  Star,
  MoreHorizontal,
  Edit,
  Trash2,
  BarChart3,
  Loader2,
  Clock,
  Upload,
  User,
  Power,
  PowerOff,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
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
  payment_type: string;
  payment_percentage: number | null;
  fixed_room_value_cents: number | null;
  room_id: string | null;
}

interface Room {
  id: string;
  name: string;
  rental_value_cents: number;
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
  const [rooms, setRooms] = useState<Room[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProfessional, setEditingProfessional] = useState<Professional | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [professionalToDelete, setProfessionalToDelete] = useState<Professional | null>(null);
  const [showInactive, setShowInactive] = useState(false);

  const fetchData = async () => {
    const [profRes, schedRes, roomsRes] = await Promise.all([
      supabase.from('professionals').select('*').order('name'),
      supabase.from('professional_schedules').select('*'),
      supabase.from('clinic_rooms').select('*').eq('is_active', true),
    ]);

    if (profRes.data) setProfessionals(profRes.data);
    if (schedRes.data) setSchedules(schedRes.data);
    if (roomsRes.data) setRooms(roomsRes.data);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredProfessionals = professionals.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.specialty_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.profession.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesActive = showInactive ? true : p.is_active;
    
    return matchesSearch && matchesActive;
  });

  const getSpecialtyName = (id: string) => {
    return SPECIALTIES.find((s) => s.id === id)?.name || id;
  };

  const getProfessionalScheduleDays = (professionalId: string) => {
    return schedules
      .filter((s) => s.professional_id === professionalId && s.is_active)
      .map((s) => DAYS_OF_WEEK.find((d) => d.value === s.day_of_week)?.label?.slice(0, 3))
      .filter(Boolean);
  };

  const handleToggleActive = async (professional: Professional) => {
    try {
      const { error } = await supabase
        .from('professionals')
        .update({ is_active: !professional.is_active })
        .eq('id', professional.id);

      if (error) throw error;

      toast.success(
        professional.is_active 
          ? 'Funcionário desativado com sucesso' 
          : 'Funcionário ativado com sucesso'
      );
      fetchData();
    } catch (error) {
      console.error('Error toggling professional status:', error);
      toast.error('Erro ao alterar status do funcionário');
    }
  };

  const handleDeleteConfirm = async () => {
    if (!professionalToDelete) return;

    try {
      const { error } = await supabase
        .from('professionals')
        .delete()
        .eq('id', professionalToDelete.id);

      if (error) throw error;

      toast.success('Funcionário excluído permanentemente');
      setDeleteConfirmOpen(false);
      setProfessionalToDelete(null);
      fetchData();
    } catch (error) {
      console.error('Error deleting professional:', error);
      toast.error('Erro ao excluir funcionário. Verifique se não há agendamentos vinculados.');
    }
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
            <h1 className="text-2xl font-bold">Funcionários</h1>
            <p className="text-clinic-text-secondary">
              {professionals.filter(p => p.is_active).length} funcionários ativos
            </p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="clinic" onClick={() => setEditingProfessional(null)}>
                <Plus className="h-4 w-4" />
                Novo Funcionário
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingProfessional ? 'Editar Funcionário' : 'Novo Funcionário'}
                </DialogTitle>
              </DialogHeader>
              <ProfessionalForm
                professional={editingProfessional}
                rooms={rooms}
                onSuccess={() => {
                  setDialogOpen(false);
                  fetchData();
                }}
              />
            </DialogContent>
          </Dialog>
        </div>

        {/* Search and Filters */}
        <div className="bg-background rounded-2xl p-4 shadow-clinic-sm">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex items-center gap-2 bg-clinic-surface rounded-xl px-4 py-2 flex-1 max-w-md">
              <Search className="h-4 w-4 text-clinic-text-muted" />
              <Input
                type="text"
                placeholder="Buscar por nome, email, profissão..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-transparent border-none shadow-none px-0 focus-visible:ring-0"
              />
            </div>
            <Button
              variant={showInactive ? 'default' : 'outline'}
              size="sm"
              onClick={() => setShowInactive(!showInactive)}
            >
              {showInactive ? 'Mostrar apenas ativos' : 'Mostrar inativos'}
            </Button>
          </div>
        </div>

        {/* Professionals Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProfessionals.map((professional) => (
            <div
              key={professional.id}
              className={`bg-background rounded-2xl p-6 shadow-clinic-sm hover:shadow-clinic-md transition-shadow ${
                !professional.is_active ? 'opacity-60' : ''
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <img
                      src={professional.avatar_url || '/placeholder.svg'}
                      alt={professional.name}
                      className="h-14 w-14 rounded-xl object-cover"
                    />
                    {!professional.is_active && (
                      <div className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-destructive flex items-center justify-center">
                        <PowerOff className="h-2.5 w-2.5 text-destructive-foreground" />
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{professional.name}</h3>
                      {!professional.is_active && (
                        <Badge variant="secondary" className="text-xs">Inativo</Badge>
                      )}
                    </div>
                    <p className="text-sm text-clinic-primary font-medium">
                      {professional.profession}
                    </p>
                    <p className="text-xs text-clinic-text-muted">
                      {getSpecialtyName(professional.specialty_id)}
                    </p>
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
                    <DropdownMenuItem onClick={() => handleToggleActive(professional)}>
                      {professional.is_active ? (
                        <>
                          <PowerOff className="h-4 w-4 mr-2" />
                          Desativar
                        </>
                      ) : (
                        <>
                          <Power className="h-4 w-4 mr-2" />
                          Ativar
                        </>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => {
                        setProfessionalToDelete(professional);
                        setDeleteConfirmOpen(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Excluir permanentemente
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="space-y-2 mb-4">
                <p className="text-sm text-clinic-text-secondary">{professional.email}</p>
                {professional.phone && (
                  <p className="text-sm text-clinic-text-muted">{professional.phone}</p>
                )}
                {professional.crm && (
                  <p className="text-xs text-clinic-text-muted">CRM: {professional.crm}</p>
                )}
                <div className="flex items-center gap-2 text-xs">
                  <span className={`px-2 py-0.5 rounded-full ${
                    professional.payment_type === 'percentage' 
                      ? 'bg-blue-100 text-blue-700' 
                      : 'bg-purple-100 text-purple-700'
                  }`}>
                    {professional.payment_type === 'percentage' 
                      ? `${professional.payment_percentage || 50}% Percentual`
                      : `R$ ${((professional.fixed_room_value_cents || 0) / 100).toFixed(2)} Sala Fixa`
                    }
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 mb-3">
                <Star className="h-4 w-4 fill-warning text-warning" />
                <span className="text-sm font-medium">{professional.rating || 5.0}</span>
                <span className="text-sm text-clinic-text-muted">
                  ({professional.review_count || 0} avaliações)
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
            <User className="h-12 w-12 mx-auto text-clinic-text-muted mb-4" />
            <p className="text-clinic-text-muted">Nenhum funcionário encontrado</p>
          </div>
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir funcionário permanentemente?</AlertDialogTitle>
            <AlertDialogDescription>
              Você está prestes a excluir <strong>{professionalToDelete?.name}</strong> permanentemente.
              Esta ação não pode ser desfeita. Recomendamos desativar o funcionário ao invés de excluí-lo
              para preservar o histórico.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir permanentemente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}

interface ProfessionalFormProps {
  professional: Professional | null;
  rooms: Room[];
  onSuccess: () => void;
}

function ProfessionalForm({ professional, rooms, onSuccess }: ProfessionalFormProps) {
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [formData, setFormData] = useState({
    name: professional?.name || '',
    email: professional?.email || '',
    phone: professional?.phone || '',
    profession: professional?.profession || 'Médico',
    specialty_id: professional?.specialty_id || 'clinica-geral',
    crm: professional?.crm || '',
    bio: professional?.bio || '',
    avatar_url: professional?.avatar_url || '',
    payment_type: professional?.payment_type || 'percentage',
    payment_percentage: professional?.payment_percentage || 50,
    fixed_room_value_cents: professional?.fixed_room_value_cents || 0,
    room_id: professional?.room_id || null,
  });
  const [previewUrl, setPreviewUrl] = useState<string>(professional?.avatar_url || '');

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Por favor, selecione uma imagem');
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('A imagem deve ter no máximo 2MB');
      return;
    }

    setUploading(true);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `professionals/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      setFormData({ ...formData, avatar_url: publicUrl });
      setPreviewUrl(publicUrl);
      toast.success('Foto enviada com sucesso');
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error('Erro ao enviar foto');
    } finally {
      setUploading(false);
    }
  };

  const createDefaultSchedules = async (professionalId: string) => {
    // Create default schedules for Mon-Fri, 08:00-18:00
    const defaultSchedules = [1, 2, 3, 4, 5].map((day) => ({
      professional_id: professionalId,
      day_of_week: day,
      start_time: '08:00',
      end_time: '18:00',
      slot_duration_minutes: 30,
      is_active: true,
    }));

    const { error } = await supabase
      .from('professional_schedules')
      .insert(defaultSchedules);

    if (error) {
      console.error('Error creating default schedules:', error);
      toast.error('Erro ao criar horários padrão');
    } else {
      toast.success('Horários padrão criados (Seg-Sex, 08:00-18:00)');
    }
  };

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
        toast.success('Funcionário atualizado com sucesso');
      } else {
        // Insert new professional and get the ID
        const { data: newProfessional, error } = await supabase
          .from('professionals')
          .insert(formData)
          .select('id')
          .single();

        if (error) throw error;

        // Create default schedules for the new professional
        if (newProfessional) {
          await createDefaultSchedules(newProfessional.id);
        }

        toast.success('Funcionário cadastrado com sucesso');
      }

      onSuccess();
    } catch (error) {
      console.error('Error saving professional:', error);
      toast.error('Erro ao salvar funcionário');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Avatar Upload */}
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="h-24 w-24 rounded-2xl overflow-hidden bg-clinic-surface flex items-center justify-center">
            {previewUrl ? (
              <img
                src={previewUrl}
                alt="Preview"
                className="h-full w-full object-cover"
              />
            ) : (
              <User className="h-10 w-10 text-clinic-text-muted" />
            )}
          </div>
          <Button
            type="button"
            variant="outline"
            size="icon-sm"
            className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Upload className="h-4 w-4" />
            )}
          </Button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileUpload}
          className="hidden"
        />
        <p className="text-xs text-clinic-text-muted">Clique para enviar uma foto</p>
      </div>

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
        <Label htmlFor="bio">Biografia</Label>
        <Textarea
          id="bio"
          value={formData.bio}
          onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
          rows={3}
          placeholder="Breve descrição sobre o profissional..."
        />
      </div>

      {/* Payment Configuration */}
      <div className="border-t pt-4 mt-4">
        <h3 className="font-medium mb-3">Configuração de Pagamento</h3>
        
        <div className="space-y-2 mb-4">
          <Label htmlFor="payment_type">Tipo de Pagamento</Label>
          <select
            id="payment_type"
            value={formData.payment_type}
            onChange={(e) => setFormData({ ...formData, payment_type: e.target.value })}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="percentage">Percentual (clínica recebe % do faturamento)</option>
            <option value="fixed_room">Sala Fixa (funcionário paga valor fixo)</option>
          </select>
        </div>

        {formData.payment_type === 'percentage' ? (
          <div className="space-y-2">
            <Label htmlFor="payment_percentage">Percentual da Clínica (%)</Label>
            <Input
              id="payment_percentage"
              type="number"
              min="0"
              max="100"
              step="0.5"
              value={formData.payment_percentage}
              onChange={(e) => setFormData({ ...formData, payment_percentage: parseFloat(e.target.value) || 0 })}
            />
            <p className="text-xs text-muted-foreground">
              A clínica receberá {formData.payment_percentage}% do faturamento do profissional
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="room_id">Sala Utilizada</Label>
              <select
                id="room_id"
                value={formData.room_id || ''}
                onChange={(e) => {
                  const selectedRoom = rooms.find(r => r.id === e.target.value);
                  setFormData({ 
                    ...formData, 
                    room_id: e.target.value || null,
                    fixed_room_value_cents: selectedRoom?.rental_value_cents || formData.fixed_room_value_cents
                  });
                }}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">Selecionar sala...</option>
                {rooms.map((room) => (
                  <option key={room.id} value={room.id}>
                    {room.name} - R$ {(room.rental_value_cents / 100).toFixed(2)}/mês
                  </option>
                ))}
              </select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="fixed_room_value">Valor Fixo Mensal (R$)</Label>
              <Input
                id="fixed_room_value"
                type="number"
                min="0"
                step="0.01"
                value={(formData.fixed_room_value_cents / 100).toFixed(2)}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  fixed_room_value_cents: Math.round(parseFloat(e.target.value || '0') * 100)
                })}
              />
              <p className="text-xs text-muted-foreground">
                O profissional pagará R$ {(formData.fixed_room_value_cents / 100).toFixed(2)} por mês
              </p>
            </div>
          </div>
        )}
      </div>

      <Button type="submit" variant="clinic" className="w-full" disabled={loading}>
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : professional ? (
          'Salvar Alterações'
        ) : (
          'Cadastrar Funcionário'
        )}
      </Button>
    </form>
  );
}
