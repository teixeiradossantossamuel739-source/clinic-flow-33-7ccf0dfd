import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Mail, Lock, User, ArrowRight, Phone, Sparkles, Shield } from 'lucide-react';
import { toast } from 'sonner';

const staffLoginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(4, 'Senha deve ter no mínimo 4 caracteres'),
});

const clientLoginSchema = z.object({
  fullName: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres'),
  email: z.string().email('Email inválido'),
  whatsapp: z.string().min(10, 'WhatsApp inválido').max(15, 'WhatsApp inválido'),
});

type LoginType = 'client' | 'staff';

export default function AuthPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading, signIn, signInWithOtp } = useAuth();
  
  const [loginType, setLoginType] = useState<LoginType>('client');
  const [loading, setLoading] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    whatsapp: '',
    password: '',
  });

  // Redirect if already logged in
  useEffect(() => {
    if (!authLoading && user) {
      navigate('/');
    }
  }, [user, authLoading, navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handleClientSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setLoading(true);

    try {
      const validation = clientLoginSchema.safeParse(formData);
      if (!validation.success) {
        const fieldErrors: Record<string, string> = {};
        validation.error.errors.forEach((err) => {
          if (err.path[0]) {
            fieldErrors[err.path[0].toString()] = err.message;
          }
        });
        setErrors(fieldErrors);
        setLoading(false);
        return;
      }

      const { error } = await signInWithOtp(formData.email, formData.fullName, formData.whatsapp);
      if (error) {
        toast.error(error.message);
      } else {
        setMagicLinkSent(true);
        toast.success('Link de acesso enviado para seu email!');
      }
    } catch (err) {
      toast.error('Erro inesperado. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const handleStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setLoading(true);

    try {
      const validation = staffLoginSchema.safeParse(formData);
      if (!validation.success) {
        const fieldErrors: Record<string, string> = {};
        validation.error.errors.forEach((err) => {
          if (err.path[0]) {
            fieldErrors[err.path[0].toString()] = err.message;
          }
        });
        setErrors(fieldErrors);
        setLoading(false);
        return;
      }

      const { error } = await signIn(formData.email, formData.password);
      if (error) {
        if (error.message.includes('Invalid login credentials')) {
          toast.error('Email ou senha incorretos');
        } else {
          toast.error(error.message);
        }
      } else {
        toast.success('Login realizado com sucesso!');
        navigate('/');
      }
    } catch (err) {
      toast.error('Erro inesperado. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-clinic-surface">
        <Loader2 className="h-8 w-8 animate-spin text-clinic-primary" />
      </div>
    );
  }

  if (magicLinkSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-clinic-surface p-4">
        <div className="w-full max-w-md">
          <div className="bg-background rounded-2xl shadow-clinic-lg p-8 border border-clinic-border-subtle text-center">
            <div className="h-16 w-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-6">
              <Mail className="h-8 w-8 text-success" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">
              Verifique seu email
            </h1>
            <p className="text-clinic-text-secondary mb-6">
              Enviamos um link de acesso para <span className="font-medium text-foreground">{formData.email}</span>. 
              Clique no link para acessar sua conta.
            </p>
            <Button
              variant="outline"
              onClick={() => {
                setMagicLinkSent(false);
                setFormData({ fullName: '', email: '', whatsapp: '', password: '' });
              }}
              className="w-full"
            >
              Voltar
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-clinic-surface p-4">
      <div className="w-full max-w-md">
        <div className="bg-background rounded-2xl shadow-clinic-lg p-8 border border-clinic-border-subtle">
          {/* Header */}
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-foreground">
              Entrar
            </h1>
            <p className="text-clinic-text-secondary mt-2">
              Acesse sua conta para continuar
            </p>
          </div>

          {/* Login Type Toggle */}
          <div className="flex gap-2 mb-6">
            <button
              type="button"
              onClick={() => setLoginType('client')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-medium transition-all ${
                loginType === 'client'
                  ? 'bg-clinic-primary text-white'
                  : 'bg-clinic-surface text-clinic-text-secondary hover:bg-clinic-surface/80'
              }`}
            >
              <User className="h-4 w-4" />
              Cliente
            </button>
            <button
              type="button"
              onClick={() => setLoginType('staff')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-medium transition-all ${
                loginType === 'staff'
                  ? 'bg-clinic-primary text-white'
                  : 'bg-clinic-surface text-clinic-text-secondary hover:bg-clinic-surface/80'
              }`}
            >
              <Shield className="h-4 w-4" />
              Equipe
            </button>
          </div>

          {/* Client Login Form (Magic Link) */}
          {loginType === 'client' && (
            <form onSubmit={handleClientSubmit} className="space-y-4">
              <div className="p-3 rounded-lg bg-clinic-primary/5 border border-clinic-primary/10 mb-4">
                <div className="flex items-center gap-2 text-clinic-primary">
                  <Sparkles className="h-4 w-4" />
                  <span className="text-sm font-medium">Acesso sem senha</span>
                </div>
                <p className="text-xs text-clinic-text-secondary mt-1">
                  Enviaremos um link de acesso para seu email
                </p>
              </div>

              <div>
                <Label htmlFor="fullName">Nome completo</Label>
                <div className="relative mt-1">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-clinic-text-muted" />
                  <Input
                    id="fullName"
                    name="fullName"
                    placeholder="Seu nome"
                    value={formData.fullName}
                    onChange={handleChange}
                    className="pl-10"
                  />
                </div>
                {errors.fullName && (
                  <p className="text-sm text-destructive mt-1">{errors.fullName}</p>
                )}
              </div>

              <div>
                <Label htmlFor="email">Email</Label>
                <div className="relative mt-1">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-clinic-text-muted" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={formData.email}
                    onChange={handleChange}
                    className="pl-10"
                  />
                </div>
                {errors.email && (
                  <p className="text-sm text-destructive mt-1">{errors.email}</p>
                )}
              </div>

              <div>
                <Label htmlFor="whatsapp">WhatsApp</Label>
                <div className="relative mt-1">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-clinic-text-muted" />
                  <Input
                    id="whatsapp"
                    name="whatsapp"
                    type="tel"
                    placeholder="(11) 99999-9999"
                    value={formData.whatsapp}
                    onChange={handleChange}
                    className="pl-10"
                  />
                </div>
                {errors.whatsapp && (
                  <p className="text-sm text-destructive mt-1">{errors.whatsapp}</p>
                )}
              </div>

              <Button
                type="submit"
                variant="clinic"
                className="w-full"
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Enviar link de acesso
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </form>
          )}

          {/* Staff Login Form (Email + Password) */}
          {loginType === 'staff' && (
            <form onSubmit={handleStaffSubmit} className="space-y-4">
              <div>
                <Label htmlFor="email">Email</Label>
                <div className="relative mt-1">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-clinic-text-muted" />
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={formData.email}
                    onChange={handleChange}
                    className="pl-10"
                  />
                </div>
                {errors.email && (
                  <p className="text-sm text-destructive mt-1">{errors.email}</p>
                )}
              </div>

              <div>
                <Label htmlFor="password">Senha</Label>
                <div className="relative mt-1">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-clinic-text-muted" />
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={handleChange}
                    className="pl-10"
                  />
                </div>
                {errors.password && (
                  <p className="text-sm text-destructive mt-1">{errors.password}</p>
                )}
              </div>

              <Button
                type="submit"
                variant="clinic"
                className="w-full"
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                Entrar
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </form>
          )}
        </div>

        {/* Back to home */}
        <div className="mt-4 text-center">
          <a
            href="/"
            className="text-sm text-clinic-text-muted hover:text-foreground transition-colors"
          >
            ← Voltar para o início
          </a>
        </div>
      </div>
    </div>
  );
}
