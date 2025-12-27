import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { FuncionarioLayout } from '@/components/layout/FuncionarioLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { User, Mail, Phone, FileText, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Professional {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  profession: string;
  specialty_id: string;
  crm: string | null;
  bio: string | null;
  avatar_url: string | null;
}

export default function FuncionarioPerfil() {
  const { user, profile } = useAuth();
  const [professional, setProfessional] = useState<Professional | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    bio: '',
  });

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user]);

  const fetchData = async () => {
    try {
      const { data: profData } = await supabase
        .from('professionals')
        .select('*')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (profData) {
        setProfessional(profData);
        setFormData({
          name: profData.name || '',
          phone: profData.phone || '',
          bio: profData.bio || '',
        });
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Erro ao carregar perfil');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!professional) return;
    
    setSaving(true);
    try {
      const { error } = await supabase
        .from('professionals')
        .update({
          name: formData.name,
          phone: formData.phone,
          bio: formData.bio,
        })
        .eq('id', professional.id);

      if (error) throw error;

      setProfessional(prev => prev ? { ...prev, ...formData } : null);
      toast.success('Perfil atualizado!');
    } catch (error) {
      console.error('Error:', error);
      toast.error('Erro ao atualizar perfil');
    } finally {
      setSaving(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <FuncionarioLayout>
        <div className="max-w-2xl mx-auto space-y-6">
          <Skeleton className="h-40" />
          <Skeleton className="h-96" />
        </div>
      </FuncionarioLayout>
    );
  }

  if (!professional) {
    return (
      <FuncionarioLayout>
        <Card className="max-w-lg mx-auto mt-12">
          <CardContent className="p-8 text-center">
            <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              Perfil profissional não encontrado
            </p>
          </CardContent>
        </Card>
      </FuncionarioLayout>
    );
  }

  return (
    <FuncionarioLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Profile Header */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-6">
              <Avatar className="h-24 w-24">
                <AvatarImage src={professional.avatar_url || ''} />
                <AvatarFallback className="bg-primary/10 text-primary text-2xl">
                  {getInitials(professional.name)}
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-2xl font-bold">{professional.name}</h2>
                <p className="text-muted-foreground">{professional.profession}</p>
                {professional.crm && (
                  <p className="text-sm text-muted-foreground">CRM: {professional.crm}</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Edit Form */}
        <Card>
          <CardHeader>
            <CardTitle>Informações do Perfil</CardTitle>
            <CardDescription>
              Atualize suas informações profissionais
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Nome Completo
              </Label>
              <Input 
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Seu nome completo"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email
              </Label>
              <Input 
                id="email"
                value={professional.email}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                O email não pode ser alterado
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Telefone
              </Label>
              <Input 
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="(11) 99999-9999"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Biografia
              </Label>
              <Textarea 
                id="bio"
                value={formData.bio}
                onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                placeholder="Conte um pouco sobre você, sua formação e experiência..."
                rows={5}
              />
            </div>

            <Button 
              onClick={handleSave}
              disabled={saving}
              className="w-full"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Salvar Alterações
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Account Info */}
        <Card>
          <CardHeader>
            <CardTitle>Informações da Conta</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between py-3 border-b">
              <div>
                <p className="font-medium">Email da Conta</p>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
              </div>
            </div>
            <div className="flex items-center justify-between py-3">
              <div>
                <p className="font-medium">Conta criada em</p>
                <p className="text-sm text-muted-foreground">
                  {user?.created_at 
                    ? new Date(user.created_at).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric'
                      })
                    : '-'
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </FuncionarioLayout>
  );
}
