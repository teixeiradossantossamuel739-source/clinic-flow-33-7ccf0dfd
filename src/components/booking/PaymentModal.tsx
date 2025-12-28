import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, QrCode, Copy, CheckCircle2 } from 'lucide-react';
import { z } from 'zod';
import pixQrCodeImage from '@/assets/pix-qrcode.png';

// Static PIX code
const STATIC_PIX_CODE = '00020126360014BR.GOV.BCB.PIX0114+55479978875565204000053039865802BR5925SAMUEL TEIXEIRA DOS SANTO6006ITAJAI622605224Qdm4PMbsORmpsfLhSq9X863043754';

const paymentFormSchema = z.object({
  name: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres').max(100),
  phone: z.string().min(10, 'Telefone inválido').max(20),
  email: z.string().email('E-mail inválido').max(255),
  cpf: z.string().min(11, 'CPF inválido').max(14),
});

interface PaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bookingData: {
    serviceId: string;
    serviceName: string;
    servicePrice: number;
    professionalId: string;
    professionalName: string;
    appointmentDate: string;
    appointmentTime: string;
  };
  onSuccess: (appointmentId: string) => void;
}

interface AppointmentData {
  appointmentId: string;
}

export function PaymentModal({ open, onOpenChange, bookingData, onSuccess }: PaymentModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    cpf: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [appointmentData, setAppointmentData] = useState<AppointmentData | null>(null);
  const [showPixScreen, setShowPixScreen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [checkingPayment, setCheckingPayment] = useState(false);

  const formatCpf = (value: string) => {
    const numbers = value.replace(/\D/g, '').slice(0, 11);
    return numbers
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
  };

  const formatPhone = (value: string) => {
    const numbers = value.replace(/\D/g, '').slice(0, 11);
    if (numbers.length <= 2) return numbers;
    if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
    return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
  };

  const handleChange = (field: string, value: string) => {
    let formattedValue = value;
    if (field === 'cpf') formattedValue = formatCpf(value);
    if (field === 'phone') formattedValue = formatPhone(value);
    
    setFormData(prev => ({ ...prev, [field]: formattedValue }));
    setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const validateForm = () => {
    try {
      paymentFormSchema.parse({
        name: formData.name,
        phone: formData.phone.replace(/\D/g, ''),
        email: formData.email,
        cpf: formData.cpf.replace(/\D/g, ''),
      });
      return true;
    } catch (err) {
      if (err instanceof z.ZodError) {
        const newErrors: Record<string, string> = {};
        err.errors.forEach((e) => {
          if (e.path[0]) newErrors[e.path[0] as string] = e.message;
        });
        setErrors(newErrors);
      }
      return false;
    }
  };

  const handleGenerateQrCode = async () => {
    if (!validateForm()) return;

    setLoading(true);
    setErrors({});

    try {
      // Create appointment in pending status
      const { data, error } = await supabase
        .from('appointments')
        .insert({
          service_id: bookingData.serviceId,
          professional_id: bookingData.professionalId,
          professional_uuid: bookingData.professionalId,
          appointment_date: bookingData.appointmentDate,
          appointment_time: bookingData.appointmentTime,
          patient_name: formData.name,
          patient_email: formData.email,
          patient_phone: formData.phone.replace(/\D/g, ''),
          amount_cents: bookingData.servicePrice,
          status: 'pending',
          payment_status: 'pending',
          notes: `CPF: ${formData.cpf}`,
        })
        .select()
        .single();

      if (error) throw error;

      setAppointmentData({ appointmentId: data.id });
      setShowPixScreen(true);
      toast.success('Agendamento criado! Realize o pagamento via PIX.');
    } catch (err) {
      console.error('Error creating appointment:', err);
      const message = err instanceof Error ? err.message : 'Erro ao criar agendamento';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyPix = async () => {
    try {
      await navigator.clipboard.writeText(STATIC_PIX_CODE);
      setCopied(true);
      toast.success('Código PIX copiado!');
      setTimeout(() => setCopied(false), 3000);
    } catch {
      toast.error('Erro ao copiar código');
    }
  };

  const handleCheckPayment = async () => {
    if (!appointmentData?.appointmentId) return;

    setCheckingPayment(true);
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select('status, payment_status')
        .eq('id', appointmentData.appointmentId)
        .single();

      if (error) throw error;

      if (data?.payment_status === 'paid' || data?.status === 'confirmed') {
        toast.success('Pagamento confirmado!');
        onSuccess(appointmentData.appointmentId);
      } else {
        toast.info('Pagamento ainda não confirmado. Aguarde alguns instantes.');
      }
    } catch (err) {
      console.error('Check payment error:', err);
      toast.error('Erro ao verificar pagamento');
    } finally {
      setCheckingPayment(false);
    }
  };

  const handleClose = () => {
    setFormData({ name: '', phone: '', email: '', cpf: '' });
    setErrors({});
    setAppointmentData(null);
    setShowPixScreen(false);
    setCopied(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {showPixScreen ? 'Pague com PIX' : 'Dados para Pagamento'}
          </DialogTitle>
        </DialogHeader>

        {!showPixScreen ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="modal-name">Nome Completo *</Label>
              <Input
                id="modal-name"
                placeholder="Digite seu nome completo"
                value={formData.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className={errors.name ? 'border-destructive' : ''}
              />
              {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="modal-phone">Telefone *</Label>
              <Input
                id="modal-phone"
                placeholder="(11) 99999-9999"
                value={formData.phone}
                onChange={(e) => handleChange('phone', e.target.value)}
                className={errors.phone ? 'border-destructive' : ''}
              />
              {errors.phone && <p className="text-sm text-destructive">{errors.phone}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="modal-email">E-mail *</Label>
              <Input
                id="modal-email"
                type="email"
                placeholder="seu@email.com"
                value={formData.email}
                onChange={(e) => handleChange('email', e.target.value)}
                className={errors.email ? 'border-destructive' : ''}
              />
              {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="modal-cpf">CPF *</Label>
              <Input
                id="modal-cpf"
                placeholder="000.000.000-00"
                value={formData.cpf}
                onChange={(e) => handleChange('cpf', e.target.value)}
                className={errors.cpf ? 'border-destructive' : ''}
              />
              {errors.cpf && <p className="text-sm text-destructive">{errors.cpf}</p>}
            </div>

            <div className="bg-muted/50 rounded-lg p-3 text-sm">
              <p className="font-medium">{bookingData.serviceName}</p>
              <p className="text-muted-foreground">{bookingData.professionalName}</p>
              <p className="text-muted-foreground">
                {bookingData.appointmentDate} às {bookingData.appointmentTime}
              </p>
              <p className="font-bold text-primary mt-1">
                R$ {(bookingData.servicePrice / 100).toFixed(2)}
              </p>
            </div>

            <Button
              variant="clinic"
              className="w-full"
              onClick={handleGenerateQrCode}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Processando...
                </>
              ) : (
                <>
                  <QrCode className="h-4 w-4 mr-2" />
                  Gerar QR Code PIX
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-center">
              <img
                src={pixQrCodeImage}
                alt="QR Code PIX"
                className="w-56 h-56 rounded-lg"
              />
            </div>

            <div className="text-center">
              <p className="font-bold text-lg">SAMUEL TEIXEIRA DOS SANTOS</p>
              <p className="text-muted-foreground">+55 (47) 99788-7556</p>
            </div>

            <div className="space-y-2">
              <Label>Código PIX Copia e Cola</Label>
              <div className="flex gap-2">
                <Input
                  value={STATIC_PIX_CODE}
                  readOnly
                  className="font-mono text-xs"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleCopyPix}
                  className="shrink-0"
                >
                  {copied ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            <div className="bg-muted/50 rounded-lg p-3 text-sm text-center">
              <p className="font-medium text-primary">
                Valor: R$ {(bookingData.servicePrice / 100).toFixed(2)}
              </p>
              <p className="text-muted-foreground mt-1">
                Após realizar o pagamento, clique no botão abaixo para confirmar
              </p>
            </div>

            <Button
              variant="clinic"
              className="w-full"
              onClick={handleCheckPayment}
              disabled={checkingPayment}
            >
              {checkingPayment ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Verificando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Já Paguei
                </>
              )}
            </Button>

            <Button
              variant="ghost"
              className="w-full"
              onClick={() => setShowPixScreen(false)}
            >
              Voltar
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
