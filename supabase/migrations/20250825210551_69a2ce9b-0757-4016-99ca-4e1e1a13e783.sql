-- Knowledge Base System
CREATE TABLE public.knowledge_base (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  document_type TEXT NOT NULL CHECK (document_type IN ('guidance', 'documentation', 'template', 'resource')),
  tags TEXT[] DEFAULT '{}',
  url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on knowledge_base
ALTER TABLE public.knowledge_base ENABLE ROW LEVEL SECURITY;

-- RLS policies for knowledge_base
CREATE POLICY "Organization members can view knowledge base" 
ON public.knowledge_base 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.user_roles 
  WHERE user_id = auth.uid() 
  AND organization_id = knowledge_base.organization_id
));

CREATE POLICY "Organization members can create knowledge base entries" 
ON public.knowledge_base 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM public.user_roles 
  WHERE user_id = auth.uid() 
  AND organization_id = knowledge_base.organization_id
) AND created_by = auth.uid());

CREATE POLICY "Organization members can update knowledge base entries" 
ON public.knowledge_base 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM public.user_roles 
  WHERE user_id = auth.uid() 
  AND organization_id = knowledge_base.organization_id
));

CREATE POLICY "Organization admins can delete knowledge base entries" 
ON public.knowledge_base 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM public.user_roles 
  WHERE user_id = auth.uid() 
  AND organization_id = knowledge_base.organization_id 
  AND role = 'admin'::app_role
));

-- Knowledge usage tracking
CREATE TABLE public.knowledge_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  knowledge_id UUID NOT NULL REFERENCES public.knowledge_base(id) ON DELETE CASCADE,
  application_id UUID REFERENCES public.grant_applications(id) ON DELETE CASCADE,
  usage_context TEXT NOT NULL CHECK (usage_context IN ('section_generation', 'suggestion', 'improvement')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on knowledge_usage
ALTER TABLE public.knowledge_usage ENABLE ROW LEVEL SECURITY;

-- RLS policies for knowledge_usage
CREATE POLICY "Organization members can view knowledge usage" 
ON public.knowledge_usage 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.user_roles ur
  JOIN public.knowledge_base kb ON kb.id = knowledge_usage.knowledge_id
  WHERE ur.user_id = auth.uid() 
  AND ur.organization_id = kb.organization_id
));

CREATE POLICY "Authenticated users can insert knowledge usage" 
ON public.knowledge_usage 
FOR INSERT 
WITH CHECK (auth.uid() IS NOT NULL);

-- Add language preferences to organizations
ALTER TABLE public.organizations 
ADD COLUMN ui_language TEXT DEFAULT 'en',
ADD COLUMN ai_response_language TEXT DEFAULT 'en';

-- Add language preference to system_prompts
ALTER TABLE public.system_prompts 
ADD COLUMN response_language TEXT DEFAULT 'en';

-- Create trigger for knowledge_base updated_at
CREATE TRIGGER update_knowledge_base_updated_at
  BEFORE UPDATE ON public.knowledge_base
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_knowledge_base_organization_id ON public.knowledge_base(organization_id);
CREATE INDEX idx_knowledge_base_document_type ON public.knowledge_base(document_type);
CREATE INDEX idx_knowledge_base_is_active ON public.knowledge_base(is_active);
CREATE INDEX idx_knowledge_usage_knowledge_id ON public.knowledge_usage(knowledge_id);
CREATE INDEX idx_knowledge_usage_application_id ON public.knowledge_usage(application_id);