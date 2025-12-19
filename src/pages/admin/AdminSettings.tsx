import { useState } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Building2,
  Clock,
  Bell,
  MessageSquare,
  Palette,
  Shield,
  Save,
} from 'lucide-react';
import { toast } from 'sonner';

export default function AdminSettings() {
  const [settings, setSettings] = useState({
    clinicName: 'Clínica Vida',
    phone: '(11) 3456-7890',
    email: 'contato@clinicavida.com.br',
    address: 'Av. Paulista, 1000 - Bela Vista, São Paulo - SP, 01310-100',
    whatsapp: '11999999999',
    workingHours: 'Seg-Sex: 8h às 18h | Sáb: 8h às 12h',
    whatsappReminders: true,
    emailReminders: true,
    reminderHours: 24,
    autoConfirm: false,
  });

  const handleSave = () => {
    toast.success('Configurações salvas com sucesso!');
  };

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-4xl">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold">Configurações</h1>
          <p className="text-clinic-text-secondary">
            Gerencie as configurações da clínica
          </p>
        </div>

        {/* Clinic Info */}
        <div className="bg-background rounded-2xl p-6 shadow-clinic-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-10 w-10 rounded-xl bg-clinic-primary/10 flex items-center justify-center">
              <Building2 className="h-5 w-5 text-clinic-primary" />
            </div>
            <div>
              <h3 className="font-semibold">Informações da Clínica</h3>
              <p className="text-sm text-clinic-text-muted">Dados básicos do estabelecimento</p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="clinicName">Nome da Clínica</Label>
              <Input
                id="clinicName"
                value={settings.clinicName}
                onChange={(e) => setSettings({ ...settings, clinicName: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input
                id="phone"
                value={settings.phone}
                onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={settings.email}
                onChange={(e) => setSettings({ ...settings, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="whatsapp">WhatsApp</Label>
              <Input
                id="whatsapp"
                value={settings.whatsapp}
                onChange={(e) => setSettings({ ...settings, whatsapp: e.target.value })}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="address">Endereço</Label>
              <Textarea
                id="address"
                value={settings.address}
                onChange={(e) => setSettings({ ...settings, address: e.target.value })}
              />
            </div>
          </div>
        </div>

        {/* Working Hours */}
        <div className="bg-background rounded-2xl p-6 shadow-clinic-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-10 w-10 rounded-xl bg-warning/10 flex items-center justify-center">
              <Clock className="h-5 w-5 text-warning" />
            </div>
            <div>
              <h3 className="font-semibold">Horário de Funcionamento</h3>
              <p className="text-sm text-clinic-text-muted">Defina os horários de atendimento</p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="workingHours">Horários</Label>
            <Input
              id="workingHours"
              value={settings.workingHours}
              onChange={(e) => setSettings({ ...settings, workingHours: e.target.value })}
            />
            <p className="text-xs text-clinic-text-muted">
              Exibido no site e nos lembretes enviados aos pacientes
            </p>
          </div>
        </div>

        {/* Notifications */}
        <div className="bg-background rounded-2xl p-6 shadow-clinic-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-10 w-10 rounded-xl bg-success/10 flex items-center justify-center">
              <Bell className="h-5 w-5 text-success" />
            </div>
            <div>
              <h3 className="font-semibold">Notificações e Lembretes</h3>
              <p className="text-sm text-clinic-text-muted">Configure lembretes automáticos</p>
            </div>
          </div>

          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Lembretes via WhatsApp</p>
                <p className="text-sm text-clinic-text-muted">
                  Enviar lembrete automático antes da consulta
                </p>
              </div>
              <Switch
                checked={settings.whatsappReminders}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, whatsappReminders: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Lembretes via E-mail</p>
                <p className="text-sm text-clinic-text-muted">
                  Enviar confirmação por e-mail
                </p>
              </div>
              <Switch
                checked={settings.emailReminders}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, emailReminders: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Confirmação Automática</p>
                <p className="text-sm text-clinic-text-muted">
                  Confirmar agendamentos automaticamente
                </p>
              </div>
              <Switch
                checked={settings.autoConfirm}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, autoConfirm: checked })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reminderHours">Antecedência do Lembrete (horas)</Label>
              <Input
                id="reminderHours"
                type="number"
                value={settings.reminderHours}
                onChange={(e) =>
                  setSettings({ ...settings, reminderHours: parseInt(e.target.value) })
                }
                className="max-w-[120px]"
              />
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button variant="clinic" size="lg" onClick={handleSave}>
            <Save className="h-4 w-4" />
            Salvar Alterações
          </Button>
        </div>
      </div>
    </AdminLayout>
  );
}
