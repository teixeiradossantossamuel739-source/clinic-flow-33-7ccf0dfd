import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Users } from 'lucide-react';

interface Professional {
  id: string;
  name: string;
  specialty_id: string;
  avatar_url: string | null;
}

interface ProfessionalsSidebarProps {
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

export function ProfessionalsSidebar({ selectedId, onSelect }: ProfessionalsSidebarProps) {
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfessionals = async () => {
      const { data, error } = await supabase
        .from('professionals')
        .select('id, name, specialty_id, avatar_url')
        .eq('is_active', true)
        .order('name');

      if (!error && data) {
        setProfessionals(data);
      }
      setLoading(false);
    };

    fetchProfessionals();
  }, []);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  };

  const formatSpecialty = (specialtyId: string) => {
    const specialties: Record<string, string> = {
      'cardiologia': 'Cardiologia',
      'dermatologia': 'Dermatologia',
      'ortopedia': 'Ortopedia',
      'pediatria': 'Pediatria',
      'ginecologia': 'Ginecologia',
      'neurologia': 'Neurologia',
      'psiquiatria': 'Psiquiatria',
      'oftalmologia': 'Oftalmologia',
    };
    return specialties[specialtyId] || specialtyId;
  };

  if (loading) {
    return (
      <div className="w-64 bg-background border-r border-border p-4">
        <div className="animate-pulse space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-muted" />
              <div className="flex-1 space-y-1">
                <div className="h-4 bg-muted rounded w-24" />
                <div className="h-3 bg-muted rounded w-16" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="w-64 bg-background border-r border-border flex flex-col">
      <div className="p-4 border-b border-border">
        <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
          Profissionais
        </h2>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2">
          {/* All professionals option */}
          <button
            onClick={() => onSelect(null)}
            className={cn(
              'w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left',
              selectedId === null
                ? 'bg-primary/10 text-primary'
                : 'hover:bg-muted'
            )}
          >
            <div className={cn(
              'h-10 w-10 rounded-full flex items-center justify-center',
              selectedId === null ? 'bg-primary text-primary-foreground' : 'bg-muted'
            )}>
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="font-medium text-sm">Todos</p>
              <p className="text-xs text-muted-foreground">{professionals.length} profissionais</p>
            </div>
          </button>

          {/* Individual professionals */}
          {professionals.map((professional) => (
            <button
              key={professional.id}
              onClick={() => onSelect(professional.id)}
              className={cn(
                'w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left mt-1',
                selectedId === professional.id
                  ? 'bg-primary/10 text-primary'
                  : 'hover:bg-muted'
              )}
            >
              <Avatar className="h-10 w-10">
                <AvatarImage src={professional.avatar_url || undefined} alt={professional.name} />
                <AvatarFallback className={cn(
                  'text-xs font-medium',
                  selectedId === professional.id && 'bg-primary text-primary-foreground'
                )}>
                  {getInitials(professional.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm truncate">{professional.name}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {formatSpecialty(professional.specialty_id)}
                </p>
              </div>
            </button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
