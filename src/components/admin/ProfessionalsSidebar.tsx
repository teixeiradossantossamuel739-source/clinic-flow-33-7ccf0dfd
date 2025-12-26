import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { 
  Users, 
  ChevronDown, 
  Stethoscope, 
  Smile, 
  Brain, 
  Syringe, 
  Activity, 
  Apple,
  User
} from 'lucide-react';

interface Professional {
  id: string;
  name: string;
  specialty_id: string;
  avatar_url: string | null;
  profession: string;
}

interface ProfessionalsSidebarProps {
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

const PROFESSION_CONFIG: Record<string, { label: string; icon: typeof Stethoscope }> = {
  'Médico': { label: 'Médicos', icon: Stethoscope },
  'Dentista': { label: 'Dentistas', icon: Smile },
  'Psicólogo': { label: 'Psicólogos', icon: Brain },
  'Enfermeiro': { label: 'Enfermeiros', icon: Syringe },
  'Fisioterapeuta': { label: 'Fisioterapeutas', icon: Activity },
  'Nutricionista': { label: 'Nutricionistas', icon: Apple },
};

const SPECIALTY_LABELS: Record<string, string> = {
  'clinica-geral': 'Clínica Geral',
  'cardiologia': 'Cardiologia',
  'dermatologia': 'Dermatologia',
  'pediatria': 'Pediatria',
  'ortopedia': 'Ortopedia',
  'oftalmologia': 'Oftalmologia',
  'ginecologia': 'Ginecologia',
  'neurologia': 'Neurologia',
  'psiquiatria': 'Psiquiatria',
};

export function ProfessionalsSidebar({ selectedId, onSelect }: ProfessionalsSidebarProps) {
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [loading, setLoading] = useState(true);
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());

  useEffect(() => {
    const fetchProfessionals = async () => {
      const { data, error } = await supabase
        .from('professionals')
        .select('id, name, specialty_id, avatar_url, profession')
        .eq('is_active', true)
        .order('name');

      if (!error && data) {
        setProfessionals(data);
        
        // Auto-open the group of the selected professional
        if (selectedId) {
          const selected = data.find(p => p.id === selectedId);
          if (selected) {
            setOpenGroups(new Set([selected.profession]));
          }
        } else {
          // Open all groups by default
          const professions = [...new Set(data.map(p => p.profession))];
          setOpenGroups(new Set(professions));
        }
      }
      setLoading(false);
    };

    fetchProfessionals();
  }, [selectedId]);

  // Group professionals by profession
  const groupedProfessionals = professionals.reduce((acc, prof) => {
    const profession = prof.profession || 'Outros';
    if (!acc[profession]) acc[profession] = [];
    acc[profession].push(prof);
    return acc;
  }, {} as Record<string, Professional[]>);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  };

  const formatSpecialty = (specialtyId: string) => {
    return SPECIALTY_LABELS[specialtyId] || specialtyId;
  };

  const toggleGroup = (profession: string) => {
    setOpenGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(profession)) {
        newSet.delete(profession);
      } else {
        newSet.add(profession);
      }
      return newSet;
    });
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

          {/* Grouped professionals by profession */}
          {Object.entries(groupedProfessionals).map(([profession, profs]) => {
            const config = PROFESSION_CONFIG[profession] || { label: profession, icon: User };
            const Icon = config.icon;
            const isOpen = openGroups.has(profession);
            const hasSelectedProfessional = profs.some(p => p.id === selectedId);

            return (
              <Collapsible
                key={profession}
                open={isOpen}
                onOpenChange={() => toggleGroup(profession)}
                className="mt-2"
              >
                <CollapsibleTrigger className={cn(
                  'w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left hover:bg-muted group',
                  hasSelectedProfessional && 'bg-primary/5'
                )}>
                  <div className={cn(
                    'h-10 w-10 rounded-full flex items-center justify-center bg-muted',
                    hasSelectedProfessional && 'bg-primary/20'
                  )}>
                    <Icon className={cn(
                      'h-5 w-5',
                      hasSelectedProfessional ? 'text-primary' : 'text-muted-foreground'
                    )} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{config.label}</p>
                    <p className="text-xs text-muted-foreground">{profs.length} profissional{profs.length !== 1 ? 'is' : ''}</p>
                  </div>
                  <ChevronDown className={cn(
                    'h-4 w-4 text-muted-foreground transition-transform',
                    isOpen && 'rotate-180'
                  )} />
                </CollapsibleTrigger>

                <CollapsibleContent className="pl-4">
                  {profs.map((professional) => (
                    <button
                      key={professional.id}
                      onClick={() => onSelect(professional.id)}
                      className={cn(
                        'w-full flex items-center gap-3 p-3 rounded-lg transition-colors text-left mt-1',
                        selectedId === professional.id
                          ? 'bg-primary/10 text-primary'
                          : 'hover:bg-muted'
                      )}
                      title={`${professional.name} - ${formatSpecialty(professional.specialty_id)}`}
                    >
                      <Avatar className="h-9 w-9">
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
                </CollapsibleContent>
              </Collapsible>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
}
