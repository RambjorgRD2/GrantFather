-- Create grant_applications table
CREATE TABLE public.grant_applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  project_name TEXT NOT NULL,
  summary TEXT NOT NULL,
  organization_mission TEXT NOT NULL,
  funding_amount INTEGER NOT NULL,
  target_audience TEXT NOT NULL,
  expected_impact TEXT NOT NULL,
  timeline_start DATE NOT NULL,
  timeline_end DATE NOT NULL,
  contact_name TEXT NOT NULL,
  contact_email TEXT NOT NULL,
  contact_phone TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'reviewed', 'approved', 'rejected')),
  generated_draft TEXT,
  submitted_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.grant_applications ENABLE ROW LEVEL SECURITY;

-- Create policies for grant_applications
CREATE POLICY "Users can view their own organization's applications" 
ON public.grant_applications 
FOR SELECT 
USING (user_id = auth.uid());

CREATE POLICY "Users can create applications for their organization" 
ON public.grant_applications 
FOR INSERT 
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own organization's applications" 
ON public.grant_applications 
FOR UPDATE 
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own organization's applications" 
ON public.grant_applications 
FOR DELETE 
USING (user_id = auth.uid());

-- Create supporting_documents storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('supporting_documents', 'supporting_documents', false);

-- Create policies for supporting_documents bucket
CREATE POLICY "Users can view their own documents" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'supporting_documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can upload their own documents" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'supporting_documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own documents" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'supporting_documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own documents" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'supporting_documents' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_grant_applications_updated_at
BEFORE UPDATE ON public.grant_applications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better performance
CREATE INDEX idx_grant_applications_user_id ON public.grant_applications(user_id);
CREATE INDEX idx_grant_applications_organization_id ON public.grant_applications(organization_id);