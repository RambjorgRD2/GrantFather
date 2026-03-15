import React from 'react';
import { SEOHead } from '@/components/SEOHead';
import { ApplicationLandingContent } from '@/components/ApplicationLandingContent';
import { AppLayout } from '@/components/layout/AppLayout';

const ApplicationLanding: React.FC = () => {
  return (
    <>
      <SEOHead
        title="Create Grant Application"
        description="Start your grant application journey with AI-powered assistance for organizations worldwide. Specialized expertise in Norwegian and Nordic funding opportunities."
        canonical="/app"
      />
      <AppLayout>
        <ApplicationLandingContent />
      </AppLayout>
    </>
  );
};

export default ApplicationLanding;
