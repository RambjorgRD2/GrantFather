-- Create application suggestions table
CREATE TABLE public.application_suggestions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  suggestion_type TEXT NOT NULL CHECK (suggestion_type IN ('event_based', 'mission_based', 'recurring')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  suggested_funding_amount INTEGER,
  funding_sources TEXT[] DEFAULT '{}',
  application_deadline DATE,
  is_recurring BOOLEAN DEFAULT false,
  recurrence_period TEXT CHECK (recurrence_period IN ('annual', 'quarterly', 'monthly') OR recurrence_period IS NULL),
  status TEXT DEFAULT 'suggested' CHECK (status IN ('suggested', 'applied', 'dismissed')),
  applied_application_id UUID REFERENCES public.grant_applications(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create suggestion history table
CREATE TABLE public.suggestion_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  suggestion_key TEXT NOT NULL,
  last_suggested TIMESTAMP WITH TIME ZONE DEFAULT now(),
  times_suggested INTEGER DEFAULT 1,
  times_applied INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(organization_id, suggestion_key)
);

-- Enable Row Level Security
ALTER TABLE public.application_suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suggestion_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for application_suggestions
CREATE POLICY "Organization members can view suggestions" 
ON public.application_suggestions 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.user_roles 
  WHERE user_id = auth.uid() 
  AND organization_id = application_suggestions.organization_id
));

CREATE POLICY "Organization admins can insert suggestions" 
ON public.application_suggestions 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.user_roles 
  WHERE user_id = auth.uid() 
  AND organization_id = application_suggestions.organization_id 
  AND role = 'admin'
));

CREATE POLICY "Organization members can update suggestions" 
ON public.application_suggestions 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.user_roles 
  WHERE user_id = auth.uid() 
  AND organization_id = application_suggestions.organization_id
));

-- RLS Policies for suggestion_history
CREATE POLICY "Organization members can view suggestion history" 
ON public.suggestion_history 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.user_roles 
  WHERE user_id = auth.uid() 
  AND organization_id = suggestion_history.organization_id
));

CREATE POLICY "Organization admins can manage suggestion history" 
ON public.suggestion_history 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.user_roles 
  WHERE user_id = auth.uid() 
  AND organization_id = suggestion_history.organization_id 
  AND role = 'admin'
));

-- Add indexes for performance
CREATE INDEX idx_application_suggestions_org_status ON public.application_suggestions(organization_id, status);
CREATE INDEX idx_suggestion_history_org_key ON public.suggestion_history(organization_id, suggestion_key);

-- Add trigger for updated_at
CREATE TRIGGER update_application_suggestions_updated_at
  BEFORE UPDATE ON public.application_suggestions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();