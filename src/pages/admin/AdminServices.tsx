import { useState } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { specialties } from '@/data/mockData';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Search,
  Plus,
  Clock,
  DollarSign,
  Edit,
  Trash2,
  MoreHorizontal,
  Stethoscope,
  Heart,
  Sparkles,
  Baby,
  Bone,
  Eye,
  HeartPulse,
  Brain,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

const iconMap: Record<string, React.ReactNode> = {
  Stethoscope: <Stethoscope className="h-6 w-6" />,
  Heart: <Heart className="h-6 w-6" />,
  Sparkles: <Sparkles className="h-6 w-6" />,
  Baby: <Baby className="h-6 w-6" />,
  Bone: <Bone className="h-6 w-6" />,
  Eye: <Eye className="h-6 w-6" />,
  HeartPulse: <HeartPulse className="h-6 w-6" />,
  Brain: <Brain className="h-6 w-6" />,
};

export default function AdminServices() {
  const [searchQuery, setSearchQuery] = useState('');
  const [services, setServices] = useState(specialties.map((s) => ({ ...s, active: true })));
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const filteredServices = services.filter((s) =>
    s.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleService = (id: string) => {
    setServices((prev) =>
      prev.map((s) => (s.id === id ? { ...s, active: !s.active } : s))
    );
    toast.success('Status atualizado');
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Serviços</h1>
            <p className="text-clinic-text-secondary">
              Gerencie especialidades e valores
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="clinic">
                <Plus className="h-4 w-4" />
                Novo Serviço
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Novo Serviço</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Nome do Serviço</Label>
                  <Input id="name" placeholder="Ex: Cardiologia" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Descrição</Label>
                  <Input id="description" placeholder="Descrição breve..." />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="duration">Duração (min)</Label>
                    <Input id="duration" type="number" placeholder="30" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="price">Valor (R$)</Label>
                    <Input id="price" type="number" placeholder="150.00" />
                  </div>
                </div>
                <Button
                  variant="clinic"
                  className="w-full"
                  onClick={() => {
                    toast.success('Serviço criado com sucesso');
                    setIsDialogOpen(false);
                  }}
                >
                  Criar Serviço
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Search */}
        <div className="bg-background rounded-2xl p-4 shadow-clinic-sm">
          <div className="flex items-center gap-2 bg-clinic-surface rounded-xl px-4 py-2 max-w-md">
            <Search className="h-4 w-4 text-clinic-text-muted" />
            <Input
              type="text"
              placeholder="Buscar serviços..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none shadow-none px-0 focus-visible:ring-0"
            />
          </div>
        </div>

        {/* Services Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredServices.map((service) => (
            <div
              key={service.id}
              className={`bg-background rounded-2xl p-6 shadow-clinic-sm border border-clinic-border-subtle transition-all ${
                !service.active && 'opacity-60'
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="h-12 w-12 rounded-xl bg-clinic-primary/10 flex items-center justify-center text-clinic-primary">
                  {iconMap[service.icon] || <Stethoscope className="h-6 w-6" />}
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={service.active}
                    onCheckedChange={() => toggleService(service.id)}
                  />
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon-sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <Edit className="h-4 w-4 mr-2" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Excluir
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              <h3 className="font-semibold mb-1">{service.name}</h3>
              <p className="text-sm text-clinic-text-muted mb-4 line-clamp-2">
                {service.description}
              </p>

              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-1.5 text-clinic-text-secondary">
                  <Clock className="h-4 w-4" />
                  {service.duration} min
                </div>
                <div className="flex items-center gap-1.5 font-semibold text-clinic-primary">
                  <DollarSign className="h-4 w-4" />
                  R$ {service.price.toFixed(2)}
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredServices.length === 0 && (
          <div className="bg-background rounded-2xl p-12 text-center shadow-clinic-sm">
            <p className="text-clinic-text-muted">Nenhum serviço encontrado</p>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
