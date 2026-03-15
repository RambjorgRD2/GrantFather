-- Create the update timestamp function first
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create grant_applications table
CREATE TABLE public.grant_applications (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    organization_id UUID,
    project_name TEXT NOT NULL,
    summary TEXT,
    funding_amount INTEGER,
    target_audience TEXT,
    timeline_start DATE,
    timeline_end DATE,
    expected_impact TEXT,
    generated_draft JSONB,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'in_review', 'approved', 'rejected')),
    submitted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.grant_applications ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own applications" 
ON public.grant_applications 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Users can create their own applications" 
ON public.grant_applications 
FOR INSERT 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own applications" 
ON public.grant_applications 
FOR UPDATE 
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own applications" 
ON public.grant_applications 
FOR DELETE 
USING (user_id = auth.uid());

-- Add foreign key to organizations if it exists
ALTER TABLE public.grant_applications 
ADD CONSTRAINT fk_grant_applications_organization_id 
FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE SET NULL;

-- Create updated_at trigger
CREATE TRIGGER update_grant_applications_updated_at
BEFORE UPDATE ON public.grant_applications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();