import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, CheckCircle2, XCircle, Users, Shield, Briefcase, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

interface TestUser {
  email: string;
  password: string;
  fullName: string;
  role: 'admin' | 'funcionario' | 'cliente';
  description: string;
  icon: React.ReactNode;
}

type UserStatus = 'idle' | 'loading' | 'created' | 'updated' | 'exists' | 'error';

const testUsers: TestUser[] = [
  {
    email: 'admin@teste.com',
    password: 'teste123',
    fullName: 'Administrador',
    role: 'admin',
    description: 'Acesso total ao sistema',
    icon: <Shield className="h-4 w-4" />,
  },
  {
    email: 'funcionario@teste.com',
    password: 'teste123',
    fullName: 'Funcionário Teste',
    role: 'funcionario',
    description: 'Acesso operacional da clínica',
    icon: <Briefcase className="h-4 w-4" />,
  },
];

export default function SetupPage() {
  const [loading, setLoading] = useState<string | null>(null);
  const [status, setStatus] = useState<Record<string, UserStatus>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const createOrUpdateUser = async (user: TestUser) => {
    setLoading(user.email);
    setStatus((prev) => ({ ...prev, [user.email]: 'loading' }));
    setErrors((prev) => ({ ...prev, [user.email]: '' }));

    try {
      // Call the edge function to create/update user
      const { data, error } = await supabase.functions.invoke('create-test-user', {
        body: {
          email: user.email,
          password: user.password,
          fullName: user.fullName,
          role: user.role,
        },
      });

      if (error) {
        setStatus((prev) => ({ ...prev, [user.email]: 'error' }));
        setErrors((prev) => ({ ...prev, [user.email]: error.message }));
        toast.error(`Erro ao criar ${user.email}`);
        return;
      }

      if (data?.message?.includes('already exists')) {
        if (data?.updated) {
          setStatus((prev) => ({ ...prev, [user.email]: 'updated' }));
          toast.success(`${user.email} atualizado!`);
        } else {
          setStatus((prev) => ({ ...prev, [user.email]: 'exists' }));
          toast.info(`${user.email} já existe e está correto`);
        }
      } else {
        setStatus((prev) => ({ ...prev, [user.email]: 'created' }));
        toast.success(`${user.email} criado com sucesso!`);
      }
    } catch (err) {
      setStatus((prev) => ({ ...prev, [user.email]: 'error' }));
      setErrors((prev) => ({ ...prev, [user.email]: 'Erro inesperado' }));
      toast.error(`Erro ao criar ${user.email}`);
    } finally {
      setLoading(null);
    }
  };

  const createAllUsers = async () => {
    for (const user of testUsers) {
      await createOrUpdateUser(user);
      // Small delay between creations
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  };

  const getStatusIcon = (email: string) => {
    const s = status[email];
    if (s === 'created' || s === 'updated' || s === 'exists') {
      return <CheckCircle2 className="h-5 w-5 text-success" />;
    }
    if (s === 'error') {
      return <XCircle className="h-5 w-5 text-destructive" />;
    }
    return null;
  };

  const getStatusText = (email: string) => {
    const s = status[email];
    if (s === 'created') return 'Criado';
    if (s === 'updated') return 'Atualizado';
    if (s === 'exists') return 'OK';
    return null;
  };

  const allDone = testUsers.every((u) => ['created', 'updated', 'exists'].includes(status[u.email] || ''));

  return (
    <div className="min-h-screen flex items-center justify-center bg-clinic-surface p-4">
      <div className="w-full max-w-2xl">
        <div className="bg-background rounded-2xl shadow-clinic-lg p-8 border border-clinic-border-subtle">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-12 w-12 rounded-xl bg-clinic-primary/10 flex items-center justify-center">
              <Users className="h-6 w-6 text-clinic-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Setup - Usuários de Teste</h1>
              <p className="text-clinic-text-secondary">Crie os usuários administrativos para testes</p>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-info/10 border border-info/20 mb-6">
            <p className="text-sm text-info font-medium mb-1">Nota sobre Clientes</p>
            <p className="text-xs text-clinic-text-secondary">
              Clientes não precisam ser criados aqui. Eles acessam o sistema informando Nome, WhatsApp e Email, 
              e recebem um link de acesso por email (magic link).
            </p>
          </div>

          <div className="space-y-4 mb-6">
            {testUsers.map((user) => (
              <div
                key={user.email}
                className="flex items-center justify-between p-4 rounded-xl border border-clinic-border-subtle bg-clinic-surface/50"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-clinic-primary/10 flex items-center justify-center text-clinic-primary">
                      {user.icon}
                    </div>
                    <div>
                      <span className="font-medium">{user.fullName}</span>
                      <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-clinic-primary/10 text-clinic-primary capitalize">
                        {user.role}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-clinic-text-muted mt-1 ml-10">{user.email}</p>
                  <p className="text-xs text-clinic-text-secondary mt-1 ml-10">{user.description}</p>
                  {errors[user.email] && (
                    <p className="text-xs text-destructive mt-1 ml-10">{errors[user.email]}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {getStatusIcon(user.email)}
                  {getStatusText(user.email) && (
                    <span className="text-xs text-success">{getStatusText(user.email)}</span>
                  )}
                  {!['created', 'updated', 'exists'].includes(status[user.email] || '') && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => createOrUpdateUser(user)}
                      disabled={loading !== null}
                    >
                      {loading === user.email ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : status[user.email] === 'error' ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-1" />
                          Tentar novamente
                        </>
                      ) : (
                        'Criar'
                      )}
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="flex gap-4">
            <Button
              variant="clinic"
              onClick={createAllUsers}
              disabled={loading !== null || allDone}
              className="flex-1"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {allDone ? 'Todos os usuários criados' : 'Criar Todos os Usuários'}
            </Button>
            <a href="/auth" className="flex-1">
              <Button variant="outline" className="w-full">
                Ir para Login
              </Button>
            </a>
          </div>

          <div className="mt-6 p-4 rounded-lg bg-warning/10 border border-warning/20">
            <p className="text-sm text-warning font-medium mb-2">Credenciais de teste:</p>
            <div className="text-xs text-clinic-text-secondary space-y-1">
              {testUsers.map((user) => (
                <p key={user.email}>
                  <span className="font-mono">{user.email}</span> / <span className="font-mono">{user.password}</span>
                </p>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-4 text-center">
          <a href="/" className="text-sm text-clinic-text-muted hover:text-foreground transition-colors">
            ← Voltar para o início
          </a>
        </div>
      </div>
    </div>
  );
}
