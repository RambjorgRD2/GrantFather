// Enhanced Foundation Filters Component - Phase 4

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { X } from 'lucide-react';
import { useState } from 'react';
import type { FoundationSearchFilters } from '@/types/norwegian-foundations';

interface FoundationFiltersProps {
  filters: FoundationSearchFilters;
  onFiltersChange: (filters: FoundationSearchFilters) => void;
  onReset: () => void;
}

const organizationTypes = [
  'Aktivitetsstiftelse',
  'Utdelingsstiftelse',
  'Alminnelig',
  'Næringsdrivende',
];

const mainCategories = [
  'Næringsdrivende',
  'Alminnelig',
  'Kultur',
  'Utdanning',
  'Helse',
  'Miljø',
  'Samfunn',
  'Forskning',
  'Internasjonalt',
];

const areas = [
  'Oslo',
  'Bergen',
  'Trondheim',
  'Stavanger',
  'Innlandet',
  'Vestland',
  'Rogaland',
  'Viken',
  'Vestfold og Telemark',
  'Agder',
  'Troms og Finnmark',
  'Nordland',
];

export function FoundationFilters({
  filters,
  onFiltersChange,
  onReset,
}: FoundationFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const updateFilter = <K extends keyof FoundationSearchFilters>(
    key: K,
    value: FoundationSearchFilters[K]
  ) => {
    onFiltersChange({
      ...filters,
      [key]: value,
    });
  };

  const hasActiveFilters = Object.values(filters).some(
    (value) => value !== null && value !== undefined && value !== ''
  );

  const clearAllFilters = () => {
    onReset();
  };

  return (
    <div className="space-y-4" data-testid="foundation-filters">
      {/* Search Input */}
      <div className="space-y-2">
        <Label htmlFor="search-input">Søk i stiftelser</Label>
        <Input
          id="search-input"
          placeholder="Søk etter navn, beskrivelse eller område..."
          value={filters.q || ''}
          onChange={(e) => updateFilter('q', e.target.value)}
          className="w-full"
        />
      </div>

      {/* Expandable Filters */}
      <div className="space-y-4">
        <Button
          variant="outline"
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full"
        >
          {isExpanded ? 'Skjul' : 'Vis'} avanserte filtere
        </Button>

        {isExpanded && (
          <div className="space-y-6 p-4 border rounded-lg bg-muted/50">
            {/* Organization Type Filter */}
            <div className="space-y-3">
              <Label>Organisasjonstype</Label>
              <div className="grid grid-cols-2 gap-2">
                {organizationTypes.map((type) => (
                  <div key={type} className="flex items-center space-x-2">
                    <Checkbox
                      id={`type-${type}`}
                      checked={filters.organizationType === type}
                      onCheckedChange={(checked) =>
                        updateFilter('organizationType', checked ? type : null)
                      }
                    />
                    <Label
                      htmlFor={`type-${type}`}
                      className="text-sm font-normal"
                    >
                      {type}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            {/* Main Category Filter */}
            <div className="space-y-3">
              <Label>Hovedgruppe</Label>
              <Select
                value={filters.mainCategory || ''}
                onValueChange={(value) =>
                  updateFilter('mainCategory', value || null)
                }
              >
                <SelectTrigger data-testid="funding-type-filter">
                  <SelectValue placeholder="Velg hovedgruppe" />
                </SelectTrigger>
                <SelectContent>
                  {mainCategories.map((category) => (
                    <SelectItem
                      key={category}
                      value={category}
                      data-testid="filter-option"
                    >
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Area Filter */}
            <div className="space-y-3">
              <Label>Område</Label>
              <Select
                value={filters.area || ''}
                onValueChange={(value) => updateFilter('area', value || null)}
              >
                <SelectTrigger data-testid="region-filter">
                  <SelectValue placeholder="Velg område" />
                </SelectTrigger>
                <SelectContent>
                  {areas.map((area) => (
                    <SelectItem
                      key={area}
                      value={area}
                      data-testid="filter-option"
                    >
                      {area}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Equity Range Filter */}
            <div className="space-y-3" data-testid="amount-range-filter">
              <Label>Egenkapital (MNOK)</Label>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    type="number"
                    placeholder="Min"
                    value={filters.minEquity || ''}
                    onChange={(e) =>
                      updateFilter(
                        'minEquity',
                        e.target.value ? Number(e.target.value) : null
                      )
                    }
                    className="w-20"
                  />
                  <span className="text-muted-foreground">-</span>
                  <Input
                    type="number"
                    placeholder="Max"
                    value={filters.maxEquity || ''}
                    onChange={(e) =>
                      updateFilter(
                        'maxEquity',
                        e.target.value ? Number(e.target.value) : null
                      )
                    }
                    className="w-20"
                  />
                </div>
                <Slider
                  value={[filters.minEquity || 0, filters.maxEquity || 1000]}
                  onValueChange={([min, max]) => {
                    updateFilter('minEquity', min);
                    updateFilter('maxEquity', max);
                  }}
                  max={1000}
                  step={10}
                  className="w-full"
                />
              </div>
            </div>

            {/* Founded Year Range Filter */}
            <div className="space-y-3" data-testid="deadline-filter">
              <Label>Etableringsår</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="Fra år"
                  value={filters.foundedAfter || ''}
                  onChange={(e) =>
                    updateFilter(
                      'foundedAfter',
                      e.target.value ? Number(e.target.value) : null
                    )
                  }
                  className="w-20"
                />
                <span className="text-muted-foreground">-</span>
                <Input
                  type="number"
                  placeholder="Til år"
                  value={filters.foundedBefore || ''}
                  onChange={(e) =>
                    updateFilter(
                      'foundedBefore',
                      e.target.value ? Number(e.target.value) : null
                    )
                  }
                  className="w-20"
                />
              </div>
            </div>

            {/* Website Availability Filter */}
            <div className="space-y-3">
              <Label>Nettside tilgjengelig</Label>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="has-website"
                  checked={filters.hasWebsite === true}
                  onCheckedChange={(checked) =>
                    updateFilter('hasWebsite', checked ? true : null)
                  }
                />
                <Label htmlFor="has-website" className="text-sm font-normal">
                  Kun stiftelser med nettside
                </Label>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Filter Actions */}
      <div className="flex gap-2">
        <Button
          onClick={clearAllFilters}
          variant="outline"
          size="sm"
          className="flex-1"
          data-testid="reset-filters-button"
        >
          <X className="h-4 w-4 mr-2" />
          Nullstill
        </Button>
        <Button
          onClick={() => setIsExpanded(false)}
          variant="outline"
          size="sm"
          className="flex-1"
        >
          Lukk
        </Button>
      </div>

      {/* Active Filters Display */}
      {hasActiveFilters && (
        <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-primary">
              Aktive filtere
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearAllFilters}
              className="h-6 px-2 text-xs"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {filters.q && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-primary/20 text-primary">
                Søk: {filters.q}
              </span>
            )}
            {filters.organizationType && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-primary/20 text-primary">
                Type: {filters.organizationType}
              </span>
            )}
            {filters.mainCategory && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-primary/20 text-primary">
                Kategori: {filters.mainCategory}
              </span>
            )}
            {filters.area && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-primary/20 text-primary">
                Område: {filters.area}
              </span>
            )}
            {(filters.minEquity || filters.maxEquity) && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-primary/20 text-primary">
                Egenkapital: {filters.minEquity || 0}-{filters.maxEquity || '∞'}{' '}
                MNOK
              </span>
            )}
            {(filters.foundedAfter || filters.foundedBefore) && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-primary/20 text-primary">
                År: {filters.foundedAfter || '∞'}-{filters.foundedBefore || '∞'}
              </span>
            )}
            {filters.hasWebsite && (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-primary/20 text-primary">
                Med nettside
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
