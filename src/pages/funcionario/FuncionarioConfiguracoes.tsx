import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
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
  Bell, 
  MessageSquare, 
  Volume2, 
  Sun, 
  Moon, 
  Monitor,
  Save,
  CheckCircle2,
  Sparkles
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

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
  theme_preference: 'light',
};

interface ThemeCardProps {
  value: string;
  label: string;
  icon: React.ReactNode;
  isSelected: boolean;
  onClick: () => void;
  previewBg: string;
  previewFg: string;
}

function ThemeCard({ value, label, icon, isSelected, onClick, previewBg, previewFg }: ThemeCardProps) {
  const isFuturistic = value === 'futuristic';
  
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative flex flex-col items-center gap-3 p-4 rounded-xl border-2 transition-all duration-300 group overflow-hidden",
        "hover:scale-[1.02] active:scale-[0.98]",
        isFuturistic && isSelected
          ? "border-cyan-400 bg-gradient-to-br from-blue-950 to-indigo-950 shadow-lg shadow-cyan-500/30"
          : isFuturistic
          ? "border-cyan-600/30 bg-gradient-to-br from-blue-950/80 to-indigo-950/80 hover:border-cyan-400/60"
          : isSelected 
          ? "border-primary bg-primary/5 shadow-lg shadow-primary/20" 
          : "border-border/50 bg-card hover:border-primary/50 hover:bg-accent/50"
      )}
    >
      {/* Glow effect when selected */}
      {isSelected && !isFuturistic && (
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-primary/5 animate-pulse" />
      )}
      
      {/* Futuristic glow for futuristic theme */}
      {isFuturistic && (
        <div className={cn(
          "absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-purple-500/5 to-blue-500/10",
          isSelected && "animate-pulse"
        )} />
      )}
      
      {/* Animated corner sparkles */}
      {isSelected && (
        <>
          <Sparkles className={cn(
            "absolute top-1 right-1 h-3 w-3 animate-pulse",
            isFuturistic ? "text-cyan-400/80" : "text-primary/60"
          )} />
          <Sparkles className={cn(
            "absolute bottom-1 left-1 h-3 w-3 animate-pulse",
            isFuturistic ? "text-purple-400/60" : "text-primary/40"
          )} style={{ animationDelay: '0.5s' }} />
        </>
      )}
      
      {/* Icon with animation */}
      <div className={cn(
        "relative z-10 p-3 rounded-full transition-all duration-300",
        isFuturistic && isSelected
          ? "bg-gradient-to-br from-cyan-400 to-purple-500 text-white shadow-lg shadow-cyan-400/40"
          : isFuturistic
          ? "bg-cyan-900/50 text-cyan-400 group-hover:bg-cyan-800/60"
          : isSelected 
          ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30" 
          : "bg-muted text-muted-foreground group-hover:bg-primary/20 group-hover:text-primary"
      )}>
        <div className={cn(
          "transition-transform duration-500",
          isSelected && value === 'light' && "animate-spin",
          isSelected && value === 'dark' && "animate-pulse",
          isSelected && value === 'futuristic' && "animate-bounce"
        )} style={{ animationDuration: value === 'light' ? '3s' : '2s' }}>
          {icon}
        </div>
      </div>
      
      {/* Label */}
      <span className={cn(
        "relative z-10 font-medium text-sm transition-colors duration-300",
        isFuturistic 
          ? isSelected ? "text-purple-300" : "text-purple-400/80 group-hover:text-purple-300"
          : isSelected ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
      )}>
        {label}
      </span>
      
      {/* Preview mini screen */}
      <div className={cn(
        "relative z-10 w-full h-12 rounded-lg border overflow-hidden transition-all duration-300",
        isFuturistic 
          ? isSelected ? "border-cyan-400/40 shadow-inner shadow-cyan-500/20" : "border-cyan-600/20"
          : isSelected ? "border-primary/30 shadow-inner" : "border-border/30"
      )}>
        {isFuturistic ? (
          // Futuristic preview with cyan/purple gradient
          <div className="w-full h-full bg-gradient-to-br from-blue-950 via-indigo-950 to-purple-950">
            <div className="h-2 w-full bg-gradient-to-r from-cyan-500/20 to-purple-500/20 flex items-center gap-0.5 px-1">
              <div className="w-1 h-1 rounded-full bg-cyan-400" />
              <div className="w-1 h-1 rounded-full bg-purple-400" />
              <div className="w-1 h-1 rounded-full bg-cyan-400" />
            </div>
            <div className="p-1.5 space-y-1">
              <div className="h-1.5 w-3/4 rounded bg-gradient-to-r from-purple-400/50 to-cyan-400/50" />
              <div className="h-1.5 w-1/2 rounded bg-cyan-500/30" />
            </div>
          </div>
        ) : (
          <div className="w-full h-full" style={{ backgroundColor: previewBg }}>
            {/* Mini header */}
            <div className="h-2 w-full flex items-center gap-0.5 px-1" style={{ backgroundColor: previewFg + '20' }}>
              <div className="w-1 h-1 rounded-full" style={{ backgroundColor: previewFg + '40' }} />
              <div className="w-1 h-1 rounded-full" style={{ backgroundColor: previewFg + '40' }} />
              <div className="w-1 h-1 rounded-full" style={{ backgroundColor: previewFg + '40' }} />
            </div>
            {/* Mini content lines */}
            <div className="p-1.5 space-y-1">
              <div className="h-1.5 w-3/4 rounded" style={{ backgroundColor: previewFg + '30' }} />
              <div className="h-1.5 w-1/2 rounded" style={{ backgroundColor: previewFg + '20' }} />
            </div>
          </div>
        )}
      </div>
      
      {/* Selection indicator */}
      {isSelected && (
        <div className={cn(
          "absolute -bottom-px left-1/2 -translate-x-1/2 w-8 h-1 rounded-t-full",
          isFuturistic ? "bg-gradient-to-r from-cyan-400 to-purple-500" : "bg-primary"
        )} />
      )}
    </button>
  );
}

export default function FuncionarioConfiguracoes() {
  const { user } = useAuth();
  const { theme, setTheme } = useTheme();
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
          // Normalize old "system" preference into one of our 3 supported themes
          const normalizedTheme =
            prefData.theme_preference === 'system' ? 'dark' : prefData.theme_preference;

          setPreferences({ ...prefData, theme_preference: normalizedTheme });

          // Sync theme with saved preference
          if (normalizedTheme) {
            setTheme(normalizedTheme);
          }
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

  const handleThemeChange = (newTheme: string) => {
    // Apply theme immediately
    setTheme(newTheme);
    // Update preference state
    updatePreference('theme_preference', newTheme);
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

  const currentTheme = preferences?.theme_preference ?? 'light';

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

        {/* Appearance Settings - Moved to top for prominence */}
        <Card className="relative overflow-hidden">
          {/* Subtle gradient background */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none" />
          
          <CardHeader className="relative">
            <CardTitle className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-gradient-to-br from-yellow-400 to-orange-500 text-white">
                <Sparkles className="h-5 w-5" />
              </div>
              Aparência
            </CardTitle>
            <CardDescription>
              Personalize a aparência da interface
            </CardDescription>
          </CardHeader>
          <CardContent className="relative">
            <div className="space-y-4">
              <Label className="text-base">Escolha seu tema</Label>
              <div className="grid grid-cols-3 gap-4">
                <ThemeCard
                  value="light"
                  label="Claro"
                  icon={<Sun className="h-5 w-5" />}
                  isSelected={currentTheme === 'light'}
                  onClick={() => handleThemeChange('light')}
                  previewBg="#ffffff"
                  previewFg="#1a1a2e"
                />
                <ThemeCard
                  value="dark"
                  label="Escuro"
                  icon={<Moon className="h-5 w-5" />}
                  isSelected={currentTheme === 'dark'}
                  onClick={() => handleThemeChange('dark')}
                  previewBg="#1a1a2e"
                  previewFg="#ffffff"
                />
                <ThemeCard
                  value="futuristic"
                  label="Futurístico"
                  icon={<Sparkles className="h-5 w-5" />}
                  isSelected={currentTheme === 'futuristic'}
                  onClick={() => handleThemeChange('futuristic')}
                  previewBg="#0f172a"
                  previewFg="#a855f7"
                />
              </div>
              <p className="text-xs text-muted-foreground text-center pt-2">
                O tema é aplicado instantaneamente. Clique em "Salvar" para manter a preferência.
              </p>
            </div>
          </CardContent>
        </Card>

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
      </div>
    </FuncionarioLayout>
  );
}
