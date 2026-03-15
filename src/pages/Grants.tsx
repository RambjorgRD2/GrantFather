import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Filter,
  Loader2,
  Search as SearchIcon,
  Plus,
  Building2,
} from 'lucide-react';
import { OrganizationRequired } from '@/components/auth/UnifiedRouteGuard';
import { CreateApplicationModal } from '@/components/grants/CreateApplicationModal';
import { useAuth } from '@/providers/AuthProvider';
import { FoundationCard } from '@/features/grants/components/FoundationCard';
import { FoundationFilters } from '@/features/grants/components/FoundationFilters';
import type {
  FoundationItem,
  FoundationSearchFilters,
  FoundationSearchResponse,
} from '@/types/norwegian-foundations';
import { Badge } from '@/components/ui/badge';
import { ErrorBoundary } from '@/components/ErrorBoundary';

const EMPTY_FILTERS: FoundationSearchFilters = {
  q: '',
  organizationType: null,
  mainCategory: null,
  area: null,
  minEquity: null,
  maxEquity: null,
  foundedAfter: null,
  foundedBefore: null,
  hasWebsite: null,
};

const hasActiveFilters = (filters: FoundationSearchFilters) =>
  Object.keys(filters).some(
    (key) =>
      filters[key as keyof FoundationSearchFilters] !== null &&
      filters[key as keyof FoundationSearchFilters] !== ''
  );

export default function Grants() {
  const { user, loading: authLoading } = useAuth();

  const [q, setQ] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedFoundation, setSelectedFoundation] = useState<FoundationItem | null>(null);
  const [savedFoundations, setSavedFoundations] = useState<Set<string>>(
    new Set()
  );

  const [filters, setFilters] = useState<FoundationSearchFilters>(EMPTY_FILTERS);

  // Pre-warm the foundation scraper cache
  useEffect(() => {
    if (!authLoading && user) {
      supabase.functions.invoke('foundation-scraper', { body: { warmup: true } });
    }
  }, [authLoading, user]);

  const queryKey = useMemo(
    () => ['norwegian-foundations', { ...filters, q }],
    [filters, q]
  );

  const {
    data,
    isLoading,
    refetch,
    isFetching,
    error: queryError,
  } = useQuery<FoundationSearchResponse>({
    queryKey,
    queryFn: async () => {
      const searchFilters = { ...filters, q };
      const { data, error } = await supabase.functions.invoke(
        'foundation-scraper',
        { body: searchFilters }
      );

      if (error) {
        throw new Error(
          `Foundation scraper error: ${error.message || 'Unknown error'}`
        );
      }

      if (!data) {
        throw new Error('No data returned from foundation scraper');
      }

      return data as FoundationSearchResponse;
    },
    enabled: !!user && !authLoading,
    retry: 2,
    retryDelay: 1000,
  });

  useEffect(() => {
    document.title = 'Norwegian Foundations & Funds – GrantFather';
    const meta = document.querySelector('meta[name="description"]');
    if (meta)
      meta.setAttribute(
        'content',
        'Search 550+ Norwegian foundations and funds with advanced filters. Find the right funding for your project with our specialized search engine for Norwegian grant makers.'
      );
  }, []);

  const foundations = data?.items ?? [];
  const totalCount = data?.totalCount ?? 0;

  const resetFilters = () => {
    setFilters(EMPTY_FILTERS);
    setQ('');
  };

  const handleSaveFoundation = (foundation: FoundationItem) => {
    setSavedFoundations((prev) => {
      const newSaved = new Set(prev);
      if (newSaved.has(foundation.id)) {
        newSaved.delete(foundation.id);
      } else {
        newSaved.add(foundation.id);
      }
      return newSaved;
    });
  };

  const handleApplyToFoundation = (foundation: FoundationItem) => {
    setSelectedFoundation(foundation);
    setShowCreateModal(true);
  };

  if (authLoading) {
    return (
      <OrganizationRequired>
        <main className="container py-6">
          <div className="flex items-center justify-center min-h-[50vh]">
            <div className="flex items-center gap-2">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span>Loading...</span>
            </div>
          </div>
        </main>
      </OrganizationRequired>
    );
  }

  const activeFilters = hasActiveFilters(filters);
  const activeFilterCount = Object.keys(filters).filter(
    (key) =>
      filters[key as keyof FoundationSearchFilters] !== null &&
      filters[key as keyof FoundationSearchFilters] !== ''
  ).length;

  return (
    <OrganizationRequired>
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Norwegian Foundations & Funds</h1>
          <p className="text-muted-foreground">
            Search 550+ Norwegian foundations and find funding for your project
          </p>

          {/* Statistics */}
          <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
            <span data-testid="total-foundations-count">
              {totalCount || 0} foundations total
            </span>
            {activeFilters && (
              <span data-testid="filtered-foundations-count">
                {foundations.length || 0} shown after filtering
              </span>
            )}
          </div>
        </div>

        {/* Search and Filters Bar */}
        <div className="flex flex-col lg:flex-row gap-4 mb-8">
          {/* Search Input */}
          <div className="flex-1 relative">
            <SearchIcon
              className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground"
              aria-hidden="true"
              data-testid="search-icon"
            />
            <Input
              placeholder="Search foundations by name, area or category..."
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-10"
              maxLength={200}
              aria-label="Search foundations"
              data-testid="search-input"
            />
          </div>

          {/* Filter Toggle */}
          <Sheet open={showFilters} onOpenChange={setShowFilters}>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                className="lg:w-auto"
                aria-label="Open advanced filters"
                data-testid="advanced-filters-toggle"
              >
                <Filter className="h-4 w-4 mr-2" />
                Filters
                {activeFilters && (
                  <Badge variant="secondary" className="ml-2">
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[400px] sm:w-[540px]">
              <SheetHeader>
                <SheetTitle>Advanced Filters</SheetTitle>
              </SheetHeader>
              <div className="mt-6">
                <FoundationFilters
                  filters={filters}
                  onFiltersChange={setFilters}
                  onReset={resetFilters}
                />
              </div>
            </SheetContent>
          </Sheet>

          {/* Create Application Button */}
          <Button
            onClick={() => setShowCreateModal(true)}
            className="lg:w-auto"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Application
          </Button>
        </div>

        {/* Active Filters Display */}
        {(activeFilters || q) && (
          <div className="mb-6 p-3 bg-primary/10 rounded-lg border border-primary/20">
            <div className="flex items-center justify-between mb-2">
              <span
                className="text-sm font-medium text-primary"
                data-testid="active-filters-badge"
              >
                Active filters
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={resetFilters}
                className="h-6 px-2 text-xs"
                data-testid="reset-filters-button"
              >
                Reset all
              </Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {q && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-primary/20 text-primary">
                  Search: {q}
                </span>
              )}
              {filters.organizationType && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-primary/20 text-primary">
                  Type: {filters.organizationType}
                </span>
              )}
              {filters.mainCategory && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-primary/20 text-primary">
                  Category: {filters.mainCategory}
                </span>
              )}
              {filters.area && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-primary/20 text-primary">
                  Area: {filters.area}
                </span>
              )}
              {(filters.minEquity || filters.maxEquity) && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-primary/20 text-primary">
                  Equity: {filters.minEquity || 0}–{filters.maxEquity || '∞'} MNOK
                </span>
              )}
              {(filters.foundedAfter || filters.foundedBefore) && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-primary/20 text-primary">
                  Founded: {filters.foundedAfter || '∞'}–{filters.foundedBefore || '∞'}
                </span>
              )}
              {filters.hasWebsite && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-primary/20 text-primary">
                  Has website
                </span>
              )}
            </div>
          </div>
        )}

        {/* Content */}
        <div className="space-y-6">
          {/* Error State */}
          {queryError && (
            <div className="text-center py-12" data-testid="error-message">
              <Building2 className="h-12 w-12 mx-auto text-red-500 mb-4" />
              <h3 className="text-lg font-semibold mb-2 text-red-600">
                Failed to load foundations
              </h3>
              <p className="text-muted-foreground mb-4">
                {queryError.message || 'An unexpected error occurred while loading foundation data.'}
              </p>
              <div className="flex gap-2 justify-center">
                <Button
                  onClick={() => refetch()}
                  variant="outline"
                  disabled={isFetching}
                >
                  {isFetching ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Loading...
                    </>
                  ) : (
                    'Try again'
                  )}
                </Button>
                <Button
                  onClick={() => { resetFilters(); refetch(); }}
                  variant="outline"
                >
                  Reset and try again
                </Button>
              </div>
            </div>
          )}

          {/* Loading State */}
          {isLoading && !queryError && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" aria-busy="true">
              {Array.from({ length: 6 }).map((_, index) => (
                <div
                  key={index}
                  className="h-64 bg-muted rounded-lg animate-pulse"
                  data-testid="loading-skeleton"
                />
              ))}
            </div>
          )}

          {/* Results */}
          {!isLoading && !queryError && (
            <>
              {!data?.items || data.items.length === 0 ? (
                <div
                  className="text-center py-12"
                  data-testid="no-foundations-message"
                >
                  <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">
                    No foundations found
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    Try adjusting your search criteria or reset filters.
                  </p>
                  <Button onClick={resetFilters} variant="outline">
                    Reset filters
                  </Button>
                </div>
              ) : (
                <ErrorBoundary>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {data.items.map((foundation) => (
                      <FoundationCard
                        key={foundation.id}
                        foundation={foundation}
                        onApply={() => handleApplyToFoundation(foundation)}
                        onSave={handleSaveFoundation}
                        isSaved={savedFoundations.has(foundation.id)}
                      />
                    ))}
                  </div>
                </ErrorBoundary>
              )}
            </>
          )}
        </div>

        {/* Create Application Modal */}
        <CreateApplicationModal
          open={showCreateModal}
          onOpenChange={(open) => {
            setShowCreateModal(open);
            if (!open) setSelectedFoundation(null);
          }}
          prefillData={selectedFoundation ? { projectName: selectedFoundation.name } : undefined}
        />
      </div>
    </OrganizationRequired>
  );
}
