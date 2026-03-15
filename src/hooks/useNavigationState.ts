import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { NavigationItem, NavigationState } from '@/types/navigation';

export function useNavigationState(navigationItems: NavigationItem[]): NavigationState {
  const location = useLocation();

  const navigationState = useMemo(() => {
    const currentPath = location.pathname;

    // Helper function to check if a path matches any pattern
    const matchesPattern = (path: string, patterns: string[]): boolean => {
      return patterns.some(pattern => {
        if (pattern.includes('*')) {
          const regexPattern = pattern.replace(/\*/g, '.*');
          return new RegExp(`^${regexPattern}$`).test(path);
        }
        return path === pattern || path.startsWith(pattern + '/');
      });
    };

    // Helper function to check if a path is excluded
    const isExcluded = (path: string, excludePatterns?: string[]): boolean => {
      if (!excludePatterns) return false;
      return matchesPattern(path, excludePatterns);
    };

    // Find all matching items and sort by priority
    const matchingItems = navigationItems
      .map(item => {
        let isMatch = false;
        let matchedPattern: string | null = null;

        // Check for exclusions first
        if (isExcluded(currentPath, item.excludePatterns)) {
          return { item, isMatch: false, matchedPattern: null, priority: 0 };
        }

        // Check exact match first (highest priority)
        if (item.exactMatch) {
          isMatch = currentPath === item.href;
          if (isMatch) matchedPattern = item.href;
        } else {
          // Check patterns
          if (item.patterns) {
            isMatch = matchesPattern(currentPath, item.patterns);
            if (isMatch) {
              matchedPattern = item.patterns.find(pattern => {
                if (pattern.includes('*')) {
                  const regexPattern = pattern.replace(/\*/g, '.*');
                  return new RegExp(`^${regexPattern}$`).test(currentPath);
                }
                return currentPath === pattern || currentPath.startsWith(pattern + '/');
              }) || null;
            }
          }

          // Check aliases
          if (!isMatch && item.aliases) {
            isMatch = matchesPattern(currentPath, item.aliases);
            if (isMatch) {
              matchedPattern = item.aliases.find(alias => {
                if (alias.includes('*')) {
                  const regexPattern = alias.replace(/\*/g, '.*');
                  return new RegExp(`^${regexPattern}$`).test(currentPath);
                }
                return currentPath === alias || currentPath.startsWith(alias + '/');
              }) || null;
            }
          }

          // Default pattern matching
          if (!isMatch && !item.patterns && !item.aliases) {
            isMatch = currentPath === item.href || currentPath.startsWith(item.href + '/');
            if (isMatch) matchedPattern = item.href;
          }
        }

        return {
          item,
          isMatch,
          matchedPattern,
          priority: item.priority || 0
        };
      })
      .filter(result => result.isMatch)
      .sort((a, b) => {
        // Sort by priority (higher first), then by specificity (longer patterns first)
        if (a.priority !== b.priority) {
          return b.priority - a.priority;
        }
        
        // More specific paths (longer) get higher priority
        const aLength = a.matchedPattern?.length || 0;
        const bLength = b.matchedPattern?.length || 0;
        return bLength - aLength;
      });

    // Get the highest priority active item
    const activeResult = matchingItems[0] || null;
    const activeItem = activeResult?.item || null;

    const isActive = (item: NavigationItem): boolean => {
      return activeItem === item;
    };

    const getActivePattern = (item: NavigationItem): string | null => {
      if (activeItem === item) {
        return activeResult?.matchedPattern || null;
      }
      return null;
    };

    return {
      activeItem,
      isActive,
      getActivePattern
    };
  }, [location.pathname, navigationItems]);

  return navigationState;
}