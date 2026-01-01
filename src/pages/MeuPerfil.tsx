import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { PublicLayout } from "@/components/layout/PublicLayout";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, Mail, Phone, Save, Loader2, Calendar } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const MeuPerfil = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    full_name: "",
    whatsapp: "",
  });

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    
    if (profile) {
      setFormData({
        full_name: profile.full_name || "",
        whatsapp: profile.whatsapp || "",
      });
    }
  }, [user, profile, navigate]);

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: formData.full_name.trim(),
          whatsapp: formData.whatsapp.trim(),
        })
        .eq("user_id", user.id);

      if (error) throw error;

      toast({
        title: "Perfil atualizado",
        description: "Suas informações foram salvas com sucesso.",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao salvar",
        description: error.message || "Não foi possível atualizar o perfil.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (!user) {
    return null;
  }

  return (
    <PublicLayout>
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <h1 className="text-3xl font-bold text-foreground mb-8">Meu Perfil</h1>

        {/* Header com Avatar */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src={profile?.avatar_url || ""} />
                <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                  {getInitials(formData.full_name || profile?.email || "U")}
                </AvatarFallback>
              </Avatar>
              <div>
                <h2 className="text-xl font-semibold text-foreground">
                  {formData.full_name || "Cliente"}
                </h2>
                <p className="text-muted-foreground">{profile?.email}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Formulário de Edição */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Informações Pessoais
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Nome Completo</Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) =>
                  setFormData({ ...formData, full_name: e.target.value })
                }
                placeholder="Seu nome completo"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                E-mail
              </Label>
              <Input
                id="email"
                value={profile?.email || ""}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                O e-mail não pode ser alterado.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="whatsapp" className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                WhatsApp
              </Label>
              <Input
                id="whatsapp"
                value={formData.whatsapp}
                onChange={(e) =>
                  setFormData({ ...formData, whatsapp: e.target.value })
                }
                placeholder="(00) 00000-0000"
              />
            </div>

            <Button
              onClick={handleSave}
              disabled={saving}
              className="w-full mt-4"
            >
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Salvar Alterações
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Informações da Conta */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Informações da Conta
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-muted-foreground">
              <p>
                <span className="font-medium text-foreground">E-mail:</span>{" "}
                {profile?.email || "—"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </PublicLayout>
  );
};

export default MeuPerfil;
