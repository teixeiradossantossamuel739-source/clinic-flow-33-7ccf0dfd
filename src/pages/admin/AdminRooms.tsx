import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Edit, DoorOpen } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { RoomOccupancyReport } from '@/components/admin/RoomOccupancyReport';

interface Room {
  id: string;
  name: string;
  description: string | null;
  rental_value_cents: number;
  is_active: boolean;
  created_at: string;
}

interface Professional {
  id: string;
  name: string;
  profession: string;
  room_id: string | null;
}

interface Schedule {
  id: string;
  professional_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
}

export default function AdminRooms() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    rental_value_cents: 0,
    is_active: true,
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [roomsRes, professionalsRes, schedulesRes] = await Promise.all([
        supabase.from('clinic_rooms').select('*').order('name'),
        supabase.from('professionals').select('id, name, profession, room_id').eq('is_active', true),
        supabase.from('professional_schedules').select('id, professional_id, day_of_week, start_time, end_time, is_active'),
      ]);

      if (roomsRes.error) throw roomsRes.error;
      if (professionalsRes.error) throw professionalsRes.error;
      if (schedulesRes.error) throw schedulesRes.error;

      setRooms(roomsRes.data || []);
      setProfessionals(professionalsRes.data || []);
      setSchedules(schedulesRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDialog = (room?: Room) => {
    if (room) {
      setEditingRoom(room);
      setFormData({
        name: room.name,
        description: room.description || '',
        rental_value_cents: room.rental_value_cents,
        is_active: room.is_active,
      });
    } else {
      setEditingRoom(null);
      setFormData({
        name: '',
        description: '',
        rental_value_cents: 0,
        is_active: true,
      });
    }
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error('Nome da sala é obrigatório');
      return;
    }

    try {
      if (editingRoom) {
        const { error } = await supabase
          .from('clinic_rooms')
          .update({
            name: formData.name,
            description: formData.description || null,
            rental_value_cents: formData.rental_value_cents,
            is_active: formData.is_active,
          })
          .eq('id', editingRoom.id);

        if (error) throw error;
        toast.success('Sala atualizada com sucesso!');
      } else {
        const { error } = await supabase
          .from('clinic_rooms')
          .insert({
            name: formData.name,
            description: formData.description || null,
            rental_value_cents: formData.rental_value_cents,
            is_active: formData.is_active,
          });

        if (error) throw error;
        toast.success('Sala criada com sucesso!');
      }

      setIsDialogOpen(false);
      fetchData();
    } catch (error: any) {
      console.error('Error saving room:', error);
      toast.error(error.message || 'Erro ao salvar sala');
    }
  };

  const formatCurrency = (cents: number) => {
    return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Salas</h1>
            <p className="text-muted-foreground">
              Gerenciar salas da clínica
            </p>
          </div>
          <Button onClick={() => handleOpenDialog()}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Sala
          </Button>
        </div>

        {/* Rooms Table */}
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Valor Aluguel</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : rooms.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    <DoorOpen className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    Nenhuma sala cadastrada
                  </TableCell>
                </TableRow>
              ) : (
                rooms.map((room) => (
                  <TableRow key={room.id}>
                    <TableCell className="font-medium">{room.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {room.description || '-'}
                    </TableCell>
                    <TableCell>{formatCurrency(room.rental_value_cents)}</TableCell>
                    <TableCell>
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        room.is_active 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {room.is_active ? 'Ativa' : 'Inativa'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenDialog(room)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>

        {/* Occupancy Report */}
        <RoomOccupancyReport 
          rooms={rooms} 
          professionals={professionals} 
          schedules={schedules} 
        />
      </div>

      {/* Room Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingRoom ? 'Editar Sala' : 'Nova Sala'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Nome da Sala</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Sala 1, Consultório A..."
              />
            </div>

            <div>
              <Label>Descrição</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descrição opcional..."
              />
            </div>

            <div>
              <Label>Valor do Aluguel (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={(formData.rental_value_cents / 100).toFixed(2)}
                onChange={(e) => setFormData({ 
                  ...formData, 
                  rental_value_cents: Math.round(parseFloat(e.target.value || '0') * 100)
                })}
              />
            </div>

            <div className="flex items-center gap-2">
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
              <Label>Sala ativa</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
