import { Button } from '@/components/ui/button';
import { Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SectionSettingsButtonProps {
  onClick: (e?: React.MouseEvent) => void;
  variant?: 'ghost' | 'outline' | 'default';
  size?: 'sm' | 'icon' | 'default';
  className?: string;
}

export function SectionSettingsButton({
  onClick,
  variant = 'ghost',
  size = 'icon',
  className,
}: SectionSettingsButtonProps) {
  return (
    <Button
      variant={variant}
      size={size}
      onClick={onClick}
      className={cn('h-8 w-8', className)}
      aria-label="Section settings"
    >
      <Settings className="h-4 w-4" />
    </Button>
  );
}