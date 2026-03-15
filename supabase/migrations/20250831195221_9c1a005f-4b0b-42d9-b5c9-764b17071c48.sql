-- Phase 1: Database Schema for Norwegian Foundation Data

-- Create enhanced foundation item structure
CREATE TABLE IF NOT EXISTS public.norwegian_foundations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  org_number text UNIQUE, -- Norwegian organization number
  name text NOT NULL,
  area text, -- Geographic area/region (Område)
  organization_type text, -- Type of organization
  main_category text, -- Hovedgruppe
  equity_amount bigint, -- Egenkapital in NOK
  equity_year integer, -- Year of equity data
  description text,
  website_url text,
  contact_email text,
  contact_phone text,
  address text,
  postal_code text,
  city text,
  founded_year integer,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on norwegian_foundations
ALTER TABLE public.norwegian_foundations ENABLE ROW LEVEL SECURITY;

-- Create policies for norwegian_foundations (public readable for grants search)
CREATE POLICY "Norwegian foundations are publicly readable" 
ON public.norwegian_foundations 
FOR SELECT 
USING (true);

CREATE POLICY "Only service role can manage foundations" 
ON public.norwegian_foundations 
FOR ALL
USING (false)
WITH CHECK (false);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_norwegian_foundations_org_number ON public.norwegian_foundations(org_number);
CREATE INDEX IF NOT EXISTS idx_norwegian_foundations_name ON public.norwegian_foundations USING gin(to_tsvector('norwegian', name));
CREATE INDEX IF NOT EXISTS idx_norwegian_foundations_area ON public.norwegian_foundations(area);
CREATE INDEX IF NOT EXISTS idx_norwegian_foundations_type ON public.norwegian_foundations(organization_type);
CREATE INDEX IF NOT EXISTS idx_norwegian_foundations_category ON public.norwegian_foundations(main_category);
CREATE INDEX IF NOT EXISTS idx_norwegian_foundations_equity ON public.norwegian_foundations(equity_amount);

-- Extend scrape_cache table to support structured foundation data
ALTER TABLE public.scrape_cache ADD COLUMN IF NOT EXISTS foundation_data jsonb;
ALTER TABLE public.scrape_cache ADD COLUMN IF NOT EXISTS scrape_type text DEFAULT 'legacy';

-- Create trigger for timestamp updates
CREATE TRIGGER update_norwegian_foundations_updated_at
BEFORE UPDATE ON public.norwegian_foundations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();