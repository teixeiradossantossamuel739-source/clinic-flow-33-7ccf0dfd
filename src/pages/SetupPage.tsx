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
  professionalId?: string;
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
    email: 'funcionariolucas@gmail.com',
    password: 'teste123',
    fullName: 'Dr. Lucas Silva',
    role: 'funcionario',
    description: 'Setor: Clínica Geral',
    professionalId: '0147089c-d119-43fc-9132-5f9299f9d861',
    icon: <Briefcase className="h-4 w-4" />,
  },
  {
    email: 'funcionariomaria@gmail.com',
    password: 'teste123',
    fullName: 'Dra. Maria Santos',
    role: 'funcionario',
    description: 'Setor: Dermatologia',
    professionalId: 'fafbb4f6-af76-47a5-b57a-f70a3bc8422a',
    icon: <Briefcase className="h-4 w-4" />,
  },
  {
    email: 'funcionariocarlos@gmail.com',
    password: 'teste123',
    fullName: 'Dr. Carlos Oliveira',
    role: 'funcionario',
    description: 'Setor: Cardiologia',
    professionalId: '898d6900-3e8b-4a9a-b162-69a66e9438ee',
    icon: <Briefcase className="h-4 w-4" />,
  },
  {
    email: 'funcionariocarol@gmail.com',
    password: 'teste123',
    fullName: 'Dra. Carol Ferreira',
    role: 'funcionario',
    description: 'Setor: Pediatria',
    professionalId: '25f74fb5-6fa7-462a-a538-7b81c76aa970',
    icon: <Briefcase className="h-4 w-4" />,
  },
  {
    email: 'funcionarioleandro@gmail.com',
    password: 'teste123',
    fullName: 'Dr. Leandro Costa',
    role: 'funcionario',
    description: 'Setor: Ortopedia',
    professionalId: '841ef393-3a32-489b-9f34-dc24384e866a',
    icon: <Briefcase className="h-4 w-4" />,
  },
  {
    email: 'funcionariojulia@gmail.com',
    password: 'teste123',
    fullName: 'Dra. Julia Mendes',
    role: 'funcionario',
    description: 'Setor: Oftalmologia',
    professionalId: 'b6a03493-f586-4db7-8c34-e30cc649f9f1',
    icon: <Briefcase className="h-4 w-4" />,
  },
  {
    email: 'funcionarioandre@gmail.com',
    password: 'teste123',
    fullName: 'Dr. André Nascimento',
    role: 'funcionario',
    description: 'Setor: Cardiologia',
    professionalId: 'a56d0791-a848-4abf-ab1c-a2cae8bc5f57',
    icon: <Briefcase className="h-4 w-4" />,
  },
  {
    email: 'funcionariobeatriz@gmail.com',
    password: 'teste123',
    fullName: 'Dra. Beatriz Oliveira',
    role: 'funcionario',
    description: 'Setor: Ginecologia',
    professionalId: 'a2d3f55f-0936-4588-b1b2-8615c4b0f63d',
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
      const { data, error } = await supabase.functions.invoke('create-test-user', {
        body: {
          email: user.email,
          password: user.password,
          fullName: user.fullName,
          role: user.role,
          professionalId: user.professionalId,
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
              <p className="text-clinic-text-secondary">1 Admin + 8 Funcionários (Setores)</p>
            </div>
          </div>

          <div className="p-4 rounded-lg bg-info/10 border border-info/20 mb-6">
            <p className="text-sm text-info font-medium mb-1">8 Funcionários em 7 Setores</p>
            <p className="text-xs text-clinic-text-secondary">
              Clínica Geral, Cardiologia (2), Dermatologia, Pediatria, Ortopedia, Oftalmologia e Ginecologia.
            </p>
          </div>

          <div className="space-y-3 mb-6 max-h-[400px] overflow-y-auto">
            {testUsers.map((user) => (
              <div
                key={user.email}
                className="flex items-center justify-between p-3 rounded-xl border border-clinic-border-subtle bg-clinic-surface/50"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-clinic-primary/10 flex items-center justify-center text-clinic-primary shrink-0">
                      {user.icon}
                    </div>
                    <div className="min-w-0">
                      <span className="font-medium text-sm truncate block">{user.fullName}</span>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-clinic-primary/10 text-clinic-primary capitalize">
                        {user.role}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-clinic-text-muted mt-1 ml-10 truncate">{user.email}</p>
                  <p className="text-xs text-clinic-text-secondary ml-10">{user.description}</p>
                  {errors[user.email] && (
                    <p className="text-xs text-destructive mt-1 ml-10">{errors[user.email]}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
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
                        <RefreshCw className="h-4 w-4" />
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
              {allDone ? 'Todos criados ✓' : 'Criar Todos'}
            </Button>
            <a href="/auth" className="flex-1">
              <Button variant="outline" className="w-full">
                Ir para Login
              </Button>
            </a>
          </div>

          <div className="mt-6 p-4 rounded-lg bg-warning/10 border border-warning/20">
            <p className="text-sm text-warning font-medium mb-2">Senha para todos:</p>
            <p className="text-xs font-mono text-clinic-text-secondary">teste123</p>
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
