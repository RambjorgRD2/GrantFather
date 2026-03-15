-- Simple fix for application-organization relationship
-- Run this in Supabase SQL Editor

-- Add the foreign key constraint
ALTER TABLE grant_applications 
ADD CONSTRAINT fk_grant_applications_organization_id 
FOREIGN KEY (organization_id) 
REFERENCES organizations(id) 
ON DELETE CASCADE;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_grant_applications_organization_id 
ON grant_applications(organization_id);

CREATE INDEX IF NOT EXISTS idx_grant_applications_user_id 
ON grant_applications(user_id);

CREATE INDEX IF NOT EXISTS idx_grant_applications_user_org 
ON grant_applications(user_id, organization_id);
