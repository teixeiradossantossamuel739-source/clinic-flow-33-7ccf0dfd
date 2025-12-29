import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Mail, Lock, User, ArrowRight, Phone, Sparkles, Shield, Wrench } from 'lucide-react';
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

type SeedStaff = { fullName: string; professionalId: string };

const seedStaffByEmail: Record<string, SeedStaff> = {
  'funcionariolucas@gmail.com': { fullName: 'Dr. Lucas Silva', professionalId: '0147089c-d119-43fc-9132-5f9299f9d861' },
  'funcionariomaria@gmail.com': { fullName: 'Dra. Maria Santos', professionalId: 'fafbb4f6-af76-47a5-b57a-f70a3bc8422a' },
  'funcionariocarlos@gmail.com': { fullName: 'Dr. Carlos Oliveira', professionalId: '898d6900-3e8b-4a9a-b162-69a66e9438ee' },
  'funcionariocarol@gmail.com': { fullName: 'Dra. Carol Ferreira', professionalId: '25f74fb5-6fa7-462a-a538-7b81c76aa970' },
  'funcionarioleandro@gmail.com': { fullName: 'Dr. Leandro Costa', professionalId: '841ef393-3a32-489b-9f34-dc24384e866a' },
  'funcionariojulia@gmail.com': { fullName: 'Dra. Julia Mendes', professionalId: 'b6a03493-f586-4db7-8c34-e30cc649f9f1' },
  'funcionarioandre@gmail.com': { fullName: 'Dr. André Nascimento', professionalId: 'a56d0791-a848-4abf-ab1c-a2cae8bc5f57' },
  'funcionariobeatriz@gmail.com': { fullName: 'Dra. Beatriz Oliveira', professionalId: 'a2d3f55f-0936-4588-b1b2-8615c4b0f63d' },
};

const normalizeEmail = (email: string) => email.trim().toLowerCase();
const getSeedStaff = (email: string): SeedStaff | null => seedStaffByEmail[normalizeEmail(email)] ?? null;

export default function AuthPage() {
  const navigate = useNavigate();
  const { user, role, loading: authLoading, signIn, signUpClient } = useAuth();
  
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

  // Redirect based on role if already logged in
  useEffect(() => {
    if (!authLoading && user) {
      // Give time for role to be fetched
      const checkRoleAndRedirect = async () => {
        // Wait a bit for role to be fetched
        await new Promise(r => setTimeout(r, 200));
        
        if (role === 'admin') {
          navigate('/admin');
        } else if (role === 'funcionario') {
          navigate('/funcionario');
        } else {
          navigate('/');
        }
      };
      checkRoleAndRedirect();
    }
  }, [user, role, authLoading, navigate]);

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

      const { error } = await signUpClient(formData.email, formData.fullName, formData.whatsapp);
      if (error) {
        if (error.message.includes('já cadastrado')) {
          setMagicLinkSent(true);
          toast.info('Usuário já cadastrado. Verifique seu email para acessar.');
        } else {
          toast.error(error.message);
        }
      } else {
        toast.success('Bem-vindo!');
        navigate('/');
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

  const handleCreateSeedStaffAccess = async () => {
    const email = normalizeEmail(formData.email);
    const seed = getSeedStaff(email);

    if (!seed) {
      toast.error('Este email não está na lista de funcionários de teste.');
      return;
    }

    if (formData.password !== 'teste123') {
      toast.error('Para criar acesso de teste, use a senha padrão: teste123');
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-test-user', {
        body: {
          email,
          password: 'teste123',
          fullName: seed.fullName,
          role: 'funcionario',
          professionalId: seed.professionalId,
        },
      });

      if (error) {
        toast.error(error.message);
        return;
      }

      const result = data?.results?.[0];
      if (result?.status === 'error') {
        toast.error(result?.error ?? 'Erro ao criar usuário de teste');
        return;
      }

      toast.success('Acesso de teste criado/atualizado. Tente entrar novamente.');

      // Tenta login automático
      const { error: signInError } = await signIn(email, 'teste123');
      if (signInError) {
        toast.info('Usuário criado. Agora clique em Entrar novamente.');
      }
    } catch (err) {
      toast.error('Erro inesperado ao criar acesso.');
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
              <div className="p-3 rounded-lg bg-success/10 border border-success/20 mb-4">
                <div className="flex items-center gap-2 text-success">
                  <Sparkles className="h-4 w-4" />
                  <span className="text-sm font-medium">Acesso rápido</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Preencha seus dados e acesse imediatamente
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
                Entrar
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

              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleCreateSeedStaffAccess}
                disabled={loading || !formData.email || !formData.password}
              >
                <Wrench className="h-4 w-4 mr-2" />
                Criar acesso de teste
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
