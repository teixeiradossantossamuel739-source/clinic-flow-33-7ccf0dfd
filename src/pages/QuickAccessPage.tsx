import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2, Mail, User, ArrowRight, Phone, Sparkles, Shield } from 'lucide-react';
import { toast } from 'sonner';
import { hasCompletedOnboarding } from './OnboardingPage';

const VISITOR_DATA_KEY = 'clinic_visitor_data';

interface VisitorData {
  fullName: string;
  email: string;
  whatsapp: string;
  createdAt: string;
}

const quickAccessSchema = z.object({
  fullName: z.string().min(2, 'Nome deve ter no mínimo 2 caracteres').max(100, 'Nome muito longo'),
  email: z.string().email('Email inválido').max(255, 'Email muito longo'),
  whatsapp: z
    .string()
    .min(10, 'WhatsApp inválido')
    .max(15, 'WhatsApp inválido')
    .regex(/^[\d\s()-]+$/, 'Apenas números são permitidos'),
});

// Mask for WhatsApp input
const formatWhatsApp = (value: string): string => {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  
  if (digits.length === 0) return '';
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
};

export const getVisitorData = (): VisitorData | null => {
  try {
    const stored = localStorage.getItem(VISITOR_DATA_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // Invalid data
  }
  return null;
};

export const setVisitorData = (data: VisitorData): void => {
  localStorage.setItem(VISITOR_DATA_KEY, JSON.stringify(data));
};

export const hasVisitorAccess = (): boolean => {
  const data = getVisitorData();
  return data !== null && !!data.fullName && !!data.email && !!data.whatsapp;
};

export default function QuickAccessPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, loading: authLoading, signUpClient } = useAuth();
  
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    whatsapp: '',
  });

  // Check if already has access or is authenticated
  useEffect(() => {
    if (authLoading) return;
    
    // If user is authenticated, redirect to intended destination
    if (user) {
      const redirectTo = (location.state as { from?: string })?.from || '/';
      navigate(redirectTo, { replace: true });
      return;
    }
    
    // If visitor already filled data, allow access
    if (hasVisitorAccess()) {
      const redirectTo = (location.state as { from?: string })?.from || '/';
      navigate(redirectTo, { replace: true });
    }
  }, [user, authLoading, navigate, location.state]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    if (name === 'whatsapp') {
      setFormData((prev) => ({ ...prev, [name]: formatWhatsApp(value) }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
    setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setLoading(true);

    try {
      // Remove mask for validation
      const cleanWhatsapp = formData.whatsapp.replace(/\D/g, '');
      const dataToValidate = { ...formData, whatsapp: cleanWhatsapp };
      
      const validation = quickAccessSchema.safeParse(dataToValidate);
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

      // Try to create/login user
      const { error } = await signUpClient(formData.email, formData.fullName, formData.whatsapp);
      
      if (error) {
        // Even if there's an error (user exists), save as visitor
        setVisitorData({
          fullName: formData.fullName,
          email: formData.email,
          whatsapp: formData.whatsapp,
          createdAt: new Date().toISOString(),
        });
        
        if (error.message.includes('já cadastrado')) {
          toast.info('Bem-vindo de volta! Verifique seu email para acessar sua conta.');
        } else {
          // Save visitor data anyway for guest access
          toast.success('Bem-vindo!');
        }
      } else {
        // Save visitor data
        setVisitorData({
          fullName: formData.fullName,
          email: formData.email,
          whatsapp: formData.whatsapp,
          createdAt: new Date().toISOString(),
        });
        toast.success('Bem-vindo!');
      }

      // Check if first time (needs onboarding) or has destination
      const intendedDestination = (location.state as { from?: string })?.from;
      
      if (!hasCompletedOnboarding() && !intendedDestination) {
        // First time user - show onboarding
        navigate('/onboarding', { replace: true });
      } else {
        // Returning user or has specific destination
        navigate(intendedDestination || '/home', { replace: true });
      }
    } catch (err) {
      // Save as visitor anyway
      setVisitorData({
        fullName: formData.fullName,
        email: formData.email,
        whatsapp: formData.whatsapp,
        createdAt: new Date().toISOString(),
      });
      
      if (!hasCompletedOnboarding()) {
        navigate('/onboarding', { replace: true });
      } else {
        const redirectTo = (location.state as { from?: string })?.from || '/home';
        navigate(redirectTo, { replace: true });
      }
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

  return (
    <div className="min-h-screen flex items-center justify-center bg-clinic-surface p-4">
      <div className="w-full max-w-md">
        <div className="bg-background rounded-2xl shadow-clinic-lg p-8 border border-clinic-border-subtle">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="h-16 w-16 rounded-full bg-clinic-primary/10 flex items-center justify-center mx-auto mb-4">
              <Sparkles className="h-8 w-8 text-clinic-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">
              Bem-vindo à Clínica Vida
            </h1>
            <p className="text-clinic-text-secondary mt-2">
              Preencha seus dados para continuar
            </p>
          </div>

          {/* Quick Access Info */}
          <div className="p-3 rounded-lg bg-success/10 border border-success/20 mb-6">
            <div className="flex items-center gap-2 text-success">
              <Sparkles className="h-4 w-4" />
              <span className="text-sm font-medium">Acesso rápido</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Preencha uma única vez e navegue livremente
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
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
                  autoComplete="name"
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
                  autoComplete="email"
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
                  autoComplete="tel"
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
              Continuar
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </form>

          {/* Trust text */}
          <div className="mt-4 flex items-center justify-center gap-2 text-xs text-clinic-text-muted">
            <Shield className="h-3.5 w-3.5" />
            <span>Seus dados estão seguros. Não enviamos spam.</span>
          </div>
        </div>

        {/* Staff login link */}
        <div className="mt-4 text-center">
          <a
            href="/auth"
            className="text-sm text-clinic-text-muted hover:text-foreground transition-colors"
          >
            Acesso para equipe →
          </a>
        </div>
      </div>
    </div>
  );
}
