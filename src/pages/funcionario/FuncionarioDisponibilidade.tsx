import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { FuncionarioLayout } from '@/components/layout/FuncionarioLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Clock, Save, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface Schedule {
  id: string;
  professional_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  slot_duration_minutes: number;
  is_active: boolean;
}

const DAYS_OF_WEEK = [
  { value: 0, label: 'Domingo' },
  { value: 1, label: 'Segunda-feira' },
  { value: 2, label: 'Terça-feira' },
  { value: 3, label: 'Quarta-feira' },
  { value: 4, label: 'Quinta-feira' },
  { value: 5, label: 'Sexta-feira' },
  { value: 6, label: 'Sábado' },
];

export default function FuncionarioDisponibilidade() {
  const { user } = useAuth();
  const [professionalId, setProfessionalId] = useState<string | null>(null);
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      const { data: profData } = await supabase
        .from('professionals')
        .select('id')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (profData) {
        setProfessionalId(profData.id);

        const { data: scheduleData } = await supabase
          .from('professional_schedules')
          .select('*')
          .eq('professional_id', profData.id)
          .order('day_of_week', { ascending: true });

        setSchedules(scheduleData || []);
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Erro ao carregar disponibilidade');
    } finally {
      setLoading(false);
    }
  };

  const handleAddSchedule = async (dayOfWeek: number) => {
    if (!professionalId) return;

    const newSchedule: Partial<Schedule> = {
      professional_id: professionalId,
      day_of_week: dayOfWeek,
      start_time: '08:00',
      end_time: '18:00',
      slot_duration_minutes: 30,
      is_active: true,
    };

    try {
      const { data, error } = await supabase
        .from('professional_schedules')
        .insert([newSchedule as any])
        .select()
        .single();

      if (error) throw error;

      setSchedules(prev => [...prev, data].sort((a, b) => a.day_of_week - b.day_of_week));
      toast.success('Horário adicionado!');
    } catch (error) {
      console.error('Error:', error);
      toast.error('Erro ao adicionar horário');
    }
  };

  const handleUpdateSchedule = async (scheduleId: string, updates: Partial<Schedule>) => {
    try {
      const { error } = await supabase
        .from('professional_schedules')
        .update(updates)
        .eq('id', scheduleId);

      if (error) throw error;

      setSchedules(prev => 
        prev.map(s => s.id === scheduleId ? { ...s, ...updates } : s)
      );
    } catch (error) {
      console.error('Error:', error);
      toast.error('Erro ao atualizar');
    }
  };

  const handleDeleteSchedule = async (scheduleId: string) => {
    try {
      const { error } = await supabase
        .from('professional_schedules')
        .delete()
        .eq('id', scheduleId);

      if (error) throw error;

      setSchedules(prev => prev.filter(s => s.id !== scheduleId));
      toast.success('Horário removido!');
    } catch (error) {
      console.error('Error:', error);
      toast.error('Erro ao remover');
    }
  };

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      // Updates are made individually, this is just for UI feedback
      await new Promise(resolve => setTimeout(resolve, 500));
      toast.success('Alterações salvas!');
    } finally {
      setSaving(false);
    }
  };

  const getScheduleForDay = (dayOfWeek: number) => {
    return schedules.filter(s => s.day_of_week === dayOfWeek);
  };

  if (loading) {
    return (
      <FuncionarioLayout>
        <div className="space-y-4">
          {[...Array(7)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      </FuncionarioLayout>
    );
  }

  if (!professionalId) {
    return (
      <FuncionarioLayout>
        <Card className="max-w-lg mx-auto mt-12">
          <CardContent className="p-8 text-center">
            <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              Perfil profissional não encontrado
            </p>
          </CardContent>
        </Card>
      </FuncionarioLayout>
    );
  }

  return (
    <FuncionarioLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Minha Disponibilidade</h2>
            <p className="text-muted-foreground">
              Configure seus horários de atendimento
            </p>
          </div>
          <Button onClick={handleSaveAll} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        </div>

        <div className="space-y-4">
          {DAYS_OF_WEEK.map((day) => {
            const daySchedules = getScheduleForDay(day.value);
            
            return (
              <Card key={day.value}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{day.label}</CardTitle>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleAddSchedule(day.value)}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Adicionar Horário
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {daySchedules.length === 0 ? (
                    <p className="text-muted-foreground text-sm py-4 text-center">
                      Nenhum horário configurado para este dia
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {daySchedules.map((schedule) => (
                        <div 
                          key={schedule.id}
                          className="flex items-center gap-4 p-4 rounded-lg border bg-card"
                        >
                          <div className="flex items-center gap-2">
                            <Switch 
                              checked={schedule.is_active}
                              onCheckedChange={(checked) => 
                                handleUpdateSchedule(schedule.id, { is_active: checked })
                              }
                            />
                            <Label className="text-sm">
                              {schedule.is_active ? 'Ativo' : 'Inativo'}
                            </Label>
                          </div>

                          <div className="flex items-center gap-2">
                            <Label className="text-sm text-muted-foreground">Das</Label>
                            <Input 
                              type="time"
                              value={schedule.start_time.slice(0, 5)}
                              onChange={(e) => 
                                handleUpdateSchedule(schedule.id, { start_time: e.target.value })
                              }
                              className="w-28"
                            />
                          </div>

                          <div className="flex items-center gap-2">
                            <Label className="text-sm text-muted-foreground">Às</Label>
                            <Input 
                              type="time"
                              value={schedule.end_time.slice(0, 5)}
                              onChange={(e) => 
                                handleUpdateSchedule(schedule.id, { end_time: e.target.value })
                              }
                              className="w-28"
                            />
                          </div>

                          <div className="flex items-center gap-2">
                            <Label className="text-sm text-muted-foreground">Duração</Label>
                            <Select 
                              value={String(schedule.slot_duration_minutes)}
                              onValueChange={(value) => 
                                handleUpdateSchedule(schedule.id, { slot_duration_minutes: Number(value) })
                              }
                            >
                              <SelectTrigger className="w-24">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="15">15 min</SelectItem>
                                <SelectItem value="30">30 min</SelectItem>
                                <SelectItem value="45">45 min</SelectItem>
                                <SelectItem value="60">60 min</SelectItem>
                                <SelectItem value="90">90 min</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          <Button 
                            variant="ghost" 
                            size="icon"
                            onClick={() => handleDeleteSchedule(schedule.id)}
                            className="ml-auto text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </FuncionarioLayout>
  );
}
