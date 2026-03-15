// Norwegian Foundation Types - Phase 1: Enhanced Data Models

export interface FoundationItem {
  id: string;
  orgNumber?: string; // Org. nr.
  name: string;
  area?: string; // Område
  organizationType?: string; // Type of organization
  mainCategory?: string; // Hovedgruppe
  equityAmount?: number; // Egenkapital in NOK
  equityYear?: number;
  description?: string;
  websiteUrl?: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  postalCode?: string;
  city?: string;
  foundedYear?: number;
  logoUrl?: string; // Foundation logo/branding
  applyUrl: string; // For legacy compatibility
  
  // Legacy compatibility fields
  deadline?: string | null;
  fundingMin?: number | null;
  fundingMax?: number | null;
  region?: string | null;
  eligibility?: string[];
  shortDescription?: string;
}

export interface FoundationSearchFilters {
  q?: string;
  organizationType?: string | null;
  mainCategory?: string | null;
  area?: string | null;
  minEquity?: number | null;
  maxEquity?: number | null;
  foundedAfter?: number | null;
  foundedBefore?: number | null;
  hasWebsite?: boolean | null;
  warmup?: boolean;
}

export interface FoundationSearchResponse {
  items: FoundationItem[];
  totalCount?: number;
  filters?: {
    organizationTypes: string[];
    mainCategories: string[];
    areas: string[];
  };
}

// Raw scraped data structure from Norwegian foundation website
export interface RawFoundationData {
  name?: string;
  url?: string;
  orgNumber?: string;
  area?: string;
  type?: string;
  category?: string;
  equity?: string | number;
  description?: string;
  contact?: string;
  address?: string;
  founded?: string | number;
  website?: string;
  email?: string;
  phone?: string;
}

// Constants for Norwegian foundation system
export const NORWEGIAN_ORGANIZATION_TYPES = [
  'Stiftelse',
  'Ideell organisasjon', 
  'Forening',
  'Fond',
  'Kirkelig organisasjon',
  'Humanitær organisasjon',
  'Kulturell organisasjon',
  'Utdanningsorganisasjon',
  'Forskningsorganisasjon'
] as const;

export const NORWEGIAN_MAIN_CATEGORIES = [
  'Utdanning',
  'Helse og omsorg',
  'Kultur',
  'Sport og friluftsliv',
  'Miljø og klima',
  'Humanitært arbeid',
  'Forskning og utvikling',
  'Religion og livssyn',
  'Samfunn og politikk',
  'Internasjonal virksomhet'
] as const;

export const NORWEGIAN_AREAS = [
  'Oslo',
  'Akershus',
  'Østfold',
  'Buskerud',
  'Vestfold',
  'Telemark',
  'Aust-Agder',
  'Vest-Agder',
  'Rogaland',
  'Hordaland',
  'Bergen',
  'Sogn og Fjordane',
  'Møre og Romsdal',
  'Trøndelag',
  'Nordland',
  'Troms',
  'Finnmark',
  'Nasjonalt',
  'Internasjonalt'
] as const;

export type OrganizationType = typeof NORWEGIAN_ORGANIZATION_TYPES[number];
export type MainCategory = typeof NORWEGIAN_MAIN_CATEGORIES[number];
export type Area = typeof NORWEGIAN_AREAS[number];