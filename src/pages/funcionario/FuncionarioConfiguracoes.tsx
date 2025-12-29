import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { FuncionarioLayout } from '@/components/layout/FuncionarioLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Bell, 
  BellRing, 
  MessageSquare, 
  Volume2, 
  Sun, 
  Moon, 
  Monitor,
  Save,
  CheckCircle2
} from 'lucide-react';
import { toast } from 'sonner';

interface Preferences {
  id?: string;
  professional_id: string;
  notify_new_appointment: boolean;
  notify_appointment_confirmed: boolean;
  notify_appointment_cancelled: boolean;
  notify_payment_received: boolean;
  notify_reminder_24h: boolean;
  notify_sound_enabled: boolean;
  whatsapp_auto_message: boolean;
  theme_preference: string;
}

const defaultPreferences: Omit<Preferences, 'professional_id'> = {
  notify_new_appointment: true,
  notify_appointment_confirmed: true,
  notify_appointment_cancelled: true,
  notify_payment_received: true,
  notify_reminder_24h: true,
  notify_sound_enabled: true,
  whatsapp_auto_message: false,
  theme_preference: 'system',
};

export default function FuncionarioConfiguracoes() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [professionalId, setProfessionalId] = useState<string | null>(null);
  const [preferences, setPreferences] = useState<Preferences | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      // Fetch professional
      const { data: profData, error: profError } = await supabase
        .from('professionals')
        .select('id')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (profError) throw profError;

      if (profData) {
        setProfessionalId(profData.id);

        // Fetch preferences
        const { data: prefData, error: prefError } = await supabase
          .from('professional_preferences')
          .select('*')
          .eq('professional_id', profData.id)
          .maybeSingle();

        if (prefError && prefError.code !== 'PGRST116') {
          throw prefError;
        }

        if (prefData) {
          setPreferences(prefData);
        } else {
          // Set defaults
          setPreferences({
            ...defaultPreferences,
            professional_id: profData.id,
          });
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Erro ao carregar configurações');
    } finally {
      setLoading(false);
    }
  };

  const updatePreference = <K extends keyof Preferences>(key: K, value: Preferences[K]) => {
    if (!preferences) return;
    setPreferences({ ...preferences, [key]: value });
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!preferences || !professionalId) return;

    setSaving(true);
    try {
      if (preferences.id) {
        // Update existing
        const { error } = await supabase
          .from('professional_preferences')
          .update({
            notify_new_appointment: preferences.notify_new_appointment,
            notify_appointment_confirmed: preferences.notify_appointment_confirmed,
            notify_appointment_cancelled: preferences.notify_appointment_cancelled,
            notify_payment_received: preferences.notify_payment_received,
            notify_reminder_24h: preferences.notify_reminder_24h,
            notify_sound_enabled: preferences.notify_sound_enabled,
            whatsapp_auto_message: preferences.whatsapp_auto_message,
            theme_preference: preferences.theme_preference,
          })
          .eq('id', preferences.id);

        if (error) throw error;
      } else {
        // Insert new
        const { data, error } = await supabase
          .from('professional_preferences')
          .insert({
            professional_id: professionalId,
            notify_new_appointment: preferences.notify_new_appointment,
            notify_appointment_confirmed: preferences.notify_appointment_confirmed,
            notify_appointment_cancelled: preferences.notify_appointment_cancelled,
            notify_payment_received: preferences.notify_payment_received,
            notify_reminder_24h: preferences.notify_reminder_24h,
            notify_sound_enabled: preferences.notify_sound_enabled,
            whatsapp_auto_message: preferences.whatsapp_auto_message,
            theme_preference: preferences.theme_preference,
          })
          .select()
          .single();

        if (error) throw error;
        setPreferences(data);
      }

      toast.success('Configurações salvas com sucesso!');
      setHasChanges(false);
    } catch (error) {
      console.error('Error saving preferences:', error);
      toast.error('Erro ao salvar configurações');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <FuncionarioLayout>
        <div className="space-y-6 max-w-2xl mx-auto">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64" />
          <Skeleton className="h-48" />
        </div>
      </FuncionarioLayout>
    );
  }

  if (!professionalId) {
    return (
      <FuncionarioLayout>
        <Card className="max-w-lg mx-auto mt-12">
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">
              Seu perfil de profissional não foi encontrado.
            </p>
          </CardContent>
        </Card>
      </FuncionarioLayout>
    );
  }

  return (
    <FuncionarioLayout>
      <div className="space-y-6 max-w-2xl mx-auto">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Configurações</h2>
            <p className="text-muted-foreground">
              Personalize suas notificações e preferências
            </p>
          </div>
          <Button 
            onClick={handleSave} 
            disabled={!hasChanges || saving}
            className="gap-2"
          >
            {saving ? (
              <>
                <span className="animate-spin">⏳</span>
                Salvando...
              </>
            ) : hasChanges ? (
              <>
                <Save className="h-4 w-4" />
                Salvar Alterações
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4" />
                Salvo
              </>
            )}
          </Button>
        </div>

        {/* Notification Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              Notificações
            </CardTitle>
            <CardDescription>
              Configure quais notificações você deseja receber
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="notify-new" className="text-base">Novo Agendamento</Label>
                <p className="text-sm text-muted-foreground">
                  Receber notificação quando um novo agendamento for criado
                </p>
              </div>
              <Switch
                id="notify-new"
                checked={preferences?.notify_new_appointment ?? true}
                onCheckedChange={(checked) => updatePreference('notify_new_appointment', checked)}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="notify-confirmed" className="text-base">Consulta Confirmada</Label>
                <p className="text-sm text-muted-foreground">
                  Notificar quando uma consulta for confirmada
                </p>
              </div>
              <Switch
                id="notify-confirmed"
                checked={preferences?.notify_appointment_confirmed ?? true}
                onCheckedChange={(checked) => updatePreference('notify_appointment_confirmed', checked)}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="notify-cancelled" className="text-base">Consulta Cancelada</Label>
                <p className="text-sm text-muted-foreground">
                  Notificar quando uma consulta for cancelada
                </p>
              </div>
              <Switch
                id="notify-cancelled"
                checked={preferences?.notify_appointment_cancelled ?? true}
                onCheckedChange={(checked) => updatePreference('notify_appointment_cancelled', checked)}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="notify-payment" className="text-base">Pagamento Recebido</Label>
                <p className="text-sm text-muted-foreground">
                  Notificar quando um pagamento for confirmado
                </p>
              </div>
              <Switch
                id="notify-payment"
                checked={preferences?.notify_payment_received ?? true}
                onCheckedChange={(checked) => updatePreference('notify_payment_received', checked)}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="notify-reminder" className="text-base">Lembrete 24h</Label>
                <p className="text-sm text-muted-foreground">
                  Receber lembrete 24 horas antes das consultas
                </p>
              </div>
              <Switch
                id="notify-reminder"
                checked={preferences?.notify_reminder_24h ?? true}
                onCheckedChange={(checked) => updatePreference('notify_reminder_24h', checked)}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="notify-sound" className="text-base flex items-center gap-2">
                  <Volume2 className="h-4 w-4" />
                  Som de Notificação
                </Label>
                <p className="text-sm text-muted-foreground">
                  Reproduzir som ao receber notificações
                </p>
              </div>
              <Switch
                id="notify-sound"
                checked={preferences?.notify_sound_enabled ?? true}
                onCheckedChange={(checked) => updatePreference('notify_sound_enabled', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* WhatsApp Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-green-500" />
              WhatsApp
            </CardTitle>
            <CardDescription>
              Configurações de mensagens automáticas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="whatsapp-auto" className="text-base">Mensagens Automáticas</Label>
                <p className="text-sm text-muted-foreground">
                  Enviar confirmação automática via WhatsApp ao confirmar consultas
                </p>
              </div>
              <Switch
                id="whatsapp-auto"
                checked={preferences?.whatsapp_auto_message ?? false}
                onCheckedChange={(checked) => updatePreference('whatsapp_auto_message', checked)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Appearance Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sun className="h-5 w-5 text-yellow-500" />
              Aparência
            </CardTitle>
            <CardDescription>
              Personalize a aparência da interface
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="theme" className="text-base">Tema</Label>
                <p className="text-sm text-muted-foreground">
                  Escolha o tema de cores da interface
                </p>
              </div>
              <Select
                value={preferences?.theme_preference ?? 'system'}
                onValueChange={(value) => updatePreference('theme_preference', value)}
              >
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">
                    <div className="flex items-center gap-2">
                      <Sun className="h-4 w-4" />
                      Claro
                    </div>
                  </SelectItem>
                  <SelectItem value="dark">
                    <div className="flex items-center gap-2">
                      <Moon className="h-4 w-4" />
                      Escuro
                    </div>
                  </SelectItem>
                  <SelectItem value="system">
                    <div className="flex items-center gap-2">
                      <Monitor className="h-4 w-4" />
                      Sistema
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>
    </FuncionarioLayout>
  );
}