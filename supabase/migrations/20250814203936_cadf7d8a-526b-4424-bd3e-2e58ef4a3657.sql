-- Create system_prompts table for customizable AI prompts
CREATE TABLE public.system_prompts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  section_name TEXT NOT NULL,
  prompt_template TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, section_name)
);

-- Enable Row Level Security
ALTER TABLE public.system_prompts ENABLE ROW LEVEL SECURITY;

-- Create policies for user access
CREATE POLICY "Users can view their own system prompts" 
ON public.system_prompts 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own system prompts" 
ON public.system_prompts 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own system prompts" 
ON public.system_prompts 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own system prompts" 
ON public.system_prompts 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_system_prompts_updated_at
BEFORE UPDATE ON public.system_prompts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default system prompts for all sections
INSERT INTO public.system_prompts (user_id, section_name, prompt_template) 
SELECT 
  auth.uid(),
  section_name,
  prompt_template
FROM (
  VALUES 
    ('introduction', 'Write a compelling introduction for a grant application. The introduction should clearly state the organization''s mission, the purpose of the project, and why it deserves funding. Make it engaging and professional.'),
    ('need_statement', 'Write a detailed need statement that clearly identifies the problem or issue that this project will address. Include relevant statistics, evidence, and community impact. Make it persuasive and data-driven.'),
    ('project_plan', 'Create a comprehensive project plan that outlines the activities, timeline, methodology, and approach for achieving the project goals. Be specific about implementation steps and deliverables.'),
    ('budget', 'Develop a detailed budget section that justifies all expenses and shows how funds will be used efficiently. Include cost-effectiveness analysis and explain how the budget aligns with project goals.'),
    ('outcomes', 'Describe the expected outcomes and impact of the project. Include measurable goals, success metrics, evaluation methods, and long-term sustainability plans.'),
    ('conclusion', 'Write a strong conclusion that summarizes the key points, reinforces the value proposition, and makes a compelling final case for funding. End with a clear call to action.')
) AS defaults(section_name, prompt_template)
WHERE auth.uid() IS NOT NULL;