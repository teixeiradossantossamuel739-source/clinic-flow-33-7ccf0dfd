import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, QrCode, Copy, CheckCircle2, AlertCircle } from 'lucide-react';
import { z } from 'zod';

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

interface PixData {
  qrCode: string;
  copyPaste: string;
  expiresAt: string;
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
  const [pixData, setPixData] = useState<PixData | null>(null);
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
      const { data, error } = await supabase.functions.invoke('create-pix-payment', {
        body: {
          serviceId: bookingData.serviceId,
          serviceName: bookingData.serviceName,
          servicePrice: bookingData.servicePrice,
          professionalId: bookingData.professionalId,
          professionalName: bookingData.professionalName,
          appointmentDate: bookingData.appointmentDate,
          appointmentTime: bookingData.appointmentTime,
          patientName: formData.name,
          patientEmail: formData.email,
          patientPhone: formData.phone.replace(/\D/g, ''),
          patientCpf: formData.cpf.replace(/\D/g, ''),
        },
      });

      if (error) throw error;

      if (data?.pixQrCode || data?.pixCopyPaste || data?.url) {
        setPixData({
          qrCode: data.pixQrCode || '',
          copyPaste: data.pixCopyPaste || '',
          expiresAt: data.expiresAt || '',
          appointmentId: data.appointmentId,
        });

        // If there's a URL and no QR code data, redirect to payment page
        if (data.url && !data.pixQrCode && !data.pixCopyPaste) {
          window.location.href = data.url;
          return;
        }

        toast.success('QR Code PIX gerado com sucesso!');
      } else {
        throw new Error('Dados do PIX não retornados');
      }
    } catch (err) {
      console.error('Payment error:', err);
      const message = err instanceof Error ? err.message : 'Erro ao gerar QR Code';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyPix = async () => {
    if (!pixData?.copyPaste) return;
    
    try {
      await navigator.clipboard.writeText(pixData.copyPaste);
      setCopied(true);
      toast.success('Código PIX copiado!');
      setTimeout(() => setCopied(false), 3000);
    } catch {
      toast.error('Erro ao copiar código');
    }
  };

  const handleCheckPayment = async () => {
    if (!pixData?.appointmentId) return;

    setCheckingPayment(true);
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select('status, payment_status')
        .eq('id', pixData.appointmentId)
        .single();

      if (error) throw error;

      if (data?.payment_status === 'paid' || data?.status === 'confirmed') {
        toast.success('Pagamento confirmado!');
        onSuccess(pixData.appointmentId);
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
    setPixData(null);
    setCopied(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {pixData ? 'Pague com PIX' : 'Dados para Pagamento'}
          </DialogTitle>
        </DialogHeader>

        {!pixData ? (
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
                  Gerando QR Code...
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
            {pixData.qrCode ? (
              <div className="flex justify-center">
                <img
                  src={`data:image/png;base64,${pixData.qrCode}`}
                  alt="QR Code PIX"
                  className="w-48 h-48 rounded-lg border"
                />
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
                <AlertCircle className="h-12 w-12 mb-2" />
                <p className="text-center text-sm">
                  Use o código abaixo para pagar
                </p>
              </div>
            )}

            {pixData.copyPaste && (
              <div className="space-y-2">
                <Label>Código PIX Copia e Cola</Label>
                <div className="flex gap-2">
                  <Input
                    value={pixData.copyPaste}
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
            )}

            <div className="bg-muted/50 rounded-lg p-3 text-sm text-center">
              <p className="text-muted-foreground">
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
              onClick={() => setPixData(null)}
            >
              Voltar
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
