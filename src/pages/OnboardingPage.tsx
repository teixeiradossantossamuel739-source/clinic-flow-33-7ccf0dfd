import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { 
  Calendar, 
  Clock, 
  Shield, 
  Heart,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Stethoscope,
  Bell,
  CheckCircle2,
  Star
} from 'lucide-react';
import { cn } from '@/lib/utils';

const ONBOARDING_COMPLETED_KEY = 'clinic_onboarding_completed';

interface OnboardingStep {
  id: number;
  icon: React.ReactNode;
  title: string;
  description: string;
  features: string[];
  color: string;
}

const steps: OnboardingStep[] = [
  {
    id: 1,
    icon: <Sparkles className="h-12 w-12" />,
    title: 'Bem-vindo à Clínica Vida!',
    description: 'Estamos felizes em ter você conosco. Descubra como podemos cuidar da sua saúde de forma moderna e prática.',
    features: [
      'Atendimento humanizado e personalizado',
      'Profissionais altamente qualificados',
      'Ambiente moderno e acolhedor'
    ],
    color: 'from-clinic-primary to-clinic-primary/70'
  },
  {
    id: 2,
    icon: <Calendar className="h-12 w-12" />,
    title: 'Agendamento Online',
    description: 'Marque suas consultas a qualquer hora, de qualquer lugar. Simples, rápido e sem complicação.',
    features: [
      'Disponível 24 horas por dia',
      'Escolha o profissional de sua preferência',
      'Visualize horários disponíveis em tempo real'
    ],
    color: 'from-blue-500 to-blue-400'
  },
  {
    id: 3,
    icon: <Stethoscope className="h-12 w-12" />,
    title: 'Diversas Especialidades',
    description: 'Contamos com profissionais em várias áreas da saúde para atender você e sua família.',
    features: [
      'Clínica Geral e Cardiologia',
      'Dermatologia e Pediatria',
      'Ortopedia, Oftalmologia e mais'
    ],
    color: 'from-emerald-500 to-emerald-400'
  },
  {
    id: 4,
    icon: <Bell className="h-12 w-12" />,
    title: 'Lembretes Automáticos',
    description: 'Nunca mais perca uma consulta! Receba lembretes via WhatsApp antes do seu atendimento.',
    features: [
      'Notificações 24h antes da consulta',
      'Confirmação de presença pelo celular',
      'Reagendamento fácil se necessário'
    ],
    color: 'from-amber-500 to-amber-400'
  },
  {
    id: 5,
    icon: <Heart className="h-12 w-12" />,
    title: 'Pronto para começar?',
    description: 'Sua saúde em boas mãos. Agende sua primeira consulta agora e experimente um atendimento diferenciado.',
    features: [
      'Pagamento seguro via PIX',
      'Histórico de consultas sempre disponível',
      'Avalie e acompanhe seus atendimentos'
    ],
    color: 'from-rose-500 to-rose-400'
  }
];

export const hasCompletedOnboarding = (): boolean => {
  try {
    return localStorage.getItem(ONBOARDING_COMPLETED_KEY) === 'true';
  } catch {
    return false;
  }
};

export const setOnboardingCompleted = (): void => {
  localStorage.setItem(ONBOARDING_COMPLETED_KEY, 'true');
};

export default function OnboardingPage() {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState<'next' | 'prev'>('next');

  // If already completed, redirect to home
  useEffect(() => {
    if (hasCompletedOnboarding()) {
      navigate('/home', { replace: true });
    }
  }, [navigate]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setDirection('next');
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setDirection('prev');
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleComplete = () => {
    setOnboardingCompleted();
    navigate('/home', { replace: true });
  };

  const handleSkip = () => {
    setOnboardingCompleted();
    navigate('/home', { replace: true });
  };

  const step = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;

  return (
    <div className="min-h-screen bg-gradient-to-br from-clinic-surface via-background to-clinic-surface flex flex-col">
      {/* Skip button */}
      <div className="absolute top-4 right-4 z-10">
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleSkip}
          className="text-clinic-text-muted hover:text-foreground"
        >
          Pular
        </Button>
      </div>

      {/* Main content */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-lg">
          {/* Step indicator */}
          <div className="flex justify-center gap-2 mb-8">
            {steps.map((_, index) => (
              <button
                key={index}
                onClick={() => {
                  setDirection(index > currentStep ? 'next' : 'prev');
                  setCurrentStep(index);
                }}
                className={cn(
                  'h-2 rounded-full transition-all duration-300',
                  index === currentStep 
                    ? 'w-8 bg-clinic-primary' 
                    : index < currentStep
                      ? 'w-2 bg-clinic-primary/50'
                      : 'w-2 bg-clinic-border-default'
                )}
              />
            ))}
          </div>

          {/* Card */}
          <div 
            key={step.id}
            className={cn(
              'bg-background rounded-3xl shadow-clinic-xl border border-clinic-border-subtle overflow-hidden',
              'animate-fade-in'
            )}
          >
            {/* Icon header */}
            <div className={cn(
              'bg-gradient-to-r p-8 flex justify-center',
              step.color
            )}>
              <div className="h-24 w-24 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white">
                {step.icon}
              </div>
            </div>

            {/* Content */}
            <div className="p-8">
              <h1 className="text-2xl font-bold text-center mb-3">
                {step.title}
              </h1>
              <p className="text-clinic-text-secondary text-center mb-6">
                {step.description}
              </p>

              {/* Features list */}
              <div className="space-y-3 mb-8">
                {step.features.map((feature, idx) => (
                  <div 
                    key={idx}
                    className="flex items-center gap-3 p-3 rounded-xl bg-clinic-surface/50"
                  >
                    <div className="h-6 w-6 rounded-full bg-success/10 flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 className="h-4 w-4 text-success" />
                    </div>
                    <span className="text-sm text-foreground">{feature}</span>
                  </div>
                ))}
              </div>

              {/* Navigation buttons */}
              <div className="flex gap-3">
                {currentStep > 0 && (
                  <Button
                    variant="outline"
                    onClick={handlePrev}
                    className="flex-1"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Voltar
                  </Button>
                )}
                
                {isLastStep ? (
                  <Button
                    variant="clinic"
                    onClick={handleComplete}
                    className="flex-1"
                  >
                    <Star className="h-4 w-4 mr-2" />
                    Começar a usar
                  </Button>
                ) : (
                  <Button
                    variant="clinic"
                    onClick={handleNext}
                    className={cn(currentStep === 0 && 'w-full')}
                  >
                    Continuar
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Step counter */}
          <p className="text-center text-sm text-clinic-text-muted mt-4">
            {currentStep + 1} de {steps.length}
          </p>
        </div>
      </div>
    </div>
  );
}
