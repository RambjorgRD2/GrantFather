import { LucideIcon } from 'lucide-react';

export interface NavigationItem {
  name: string;
  href: string;
  icon: LucideIcon;
  exactMatch?: boolean;
  patterns?: string[];
  aliases?: string[];
  priority?: number;
  excludePatterns?: string[];
}

export interface NavigationState {
  activeItem: NavigationItem | null;
  isActive: (item: NavigationItem) => boolean;
  getActivePattern: (item: NavigationItem) => string | null;
}