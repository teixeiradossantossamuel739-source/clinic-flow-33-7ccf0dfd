import { Info, AlertTriangle, CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface InfoBannerProps {
  message: string;
  variant?: 'info' | 'warning' | 'success';
}

const variantStyles = {
  info: {
    bg: 'bg-primary/10',
    border: 'border-primary/20',
    text: 'text-primary',
    icon: Info
  },
  warning: {
    bg: 'bg-warning/10',
    border: 'border-warning/20',
    text: 'text-warning',
    icon: AlertTriangle
  },
  success: {
    bg: 'bg-success/10',
    border: 'border-success/20',
    text: 'text-success',
    icon: CheckCircle
  }
};

export function InfoBanner({ message, variant = 'info' }: InfoBannerProps) {
  const styles = variantStyles[variant];
  const Icon = styles.icon;

  return (
    <div className={cn(
      'flex items-center gap-3 px-4 py-3 rounded-lg border',
      styles.bg,
      styles.border
    )}>
      <Icon className={cn('h-5 w-5 flex-shrink-0', styles.text)} />
      <p className={cn('text-sm font-medium', styles.text)}>
        {message}
      </p>
    </div>
  );
}
