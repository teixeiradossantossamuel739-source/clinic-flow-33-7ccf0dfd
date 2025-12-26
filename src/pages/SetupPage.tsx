import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, CheckCircle2, XCircle, Users } from 'lucide-react';
import { toast } from 'sonner';

interface TestUser {
  email: string;
  password: string;
  fullName: string;
  role: 'admin' | 'funcionario' | 'cliente';
  description: string;
}

const testUsers: TestUser[] = [
  {
    email: 'admin@teste.com',
    password: 'teste',
    fullName: 'Administrador',
    role: 'admin',
    description: 'Usuário com acesso total ao sistema',
  },
  {
    email: 'funcionario@teste.com',
    password: 'teste',
    fullName: 'Funcionário Teste',
    role: 'funcionario',
    description: 'Usuário operacional da clínica',
  },
  {
    email: 'cliente@teste.com',
    password: 'teste',
    fullName: 'Cliente Teste',
    role: 'cliente',
    description: 'Usuário final (paciente)',
  },
];

export default function SetupPage() {
  const [loading, setLoading] = useState<string | null>(null);
  const [created, setCreated] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  const createUser = async (user: TestUser) => {
    setLoading(user.email);
    setErrors((prev) => ({ ...prev, [user.email]: '' }));

    try {
      // Try to sign up the user
      const { error } = await supabase.auth.signUp({
        email: user.email,
        password: user.password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            full_name: user.fullName,
            role: user.role,
          },
        },
      });

      if (error) {
        if (error.message.includes('already registered')) {
          setCreated((prev) => ({ ...prev, [user.email]: true }));
          toast.info(`${user.email} já existe`);
        } else {
          setErrors((prev) => ({ ...prev, [user.email]: error.message }));
          toast.error(`Erro ao criar ${user.email}`);
        }
      } else {
        setCreated((prev) => ({ ...prev, [user.email]: true }));
        toast.success(`${user.email} criado com sucesso!`);
        
        // Sign out so we don't stay logged in as this user
        await supabase.auth.signOut();
      }
    } catch (err) {
      setErrors((prev) => ({ ...prev, [user.email]: 'Erro inesperado' }));
    } finally {
      setLoading(null);
    }
  };

  const createAllUsers = async () => {
    for (const user of testUsers) {
      if (!created[user.email]) {
        await createUser(user);
        // Small delay between creations
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }
  };

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
              <p className="text-clinic-text-secondary">Crie os usuários para ambiente de testes</p>
            </div>
          </div>

          <div className="space-y-4 mb-6">
            {testUsers.map((user) => (
              <div
                key={user.email}
                className="flex items-center justify-between p-4 rounded-xl border border-clinic-border-subtle bg-clinic-surface/50"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{user.fullName}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-clinic-primary/10 text-clinic-primary capitalize">
                      {user.role}
                    </span>
                  </div>
                  <p className="text-sm text-clinic-text-muted">{user.email}</p>
                  <p className="text-xs text-clinic-text-secondary mt-1">{user.description}</p>
                  {errors[user.email] && (
                    <p className="text-xs text-destructive mt-1">{errors[user.email]}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {created[user.email] ? (
                    <CheckCircle2 className="h-5 w-5 text-success" />
                  ) : errors[user.email] ? (
                    <XCircle className="h-5 w-5 text-destructive" />
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => createUser(user)}
                      disabled={loading !== null}
                    >
                      {loading === user.email ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
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
              disabled={loading !== null || testUsers.every((u) => created[u.email])}
              className="flex-1"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Criar Todos os Usuários
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
