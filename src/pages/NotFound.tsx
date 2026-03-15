import { useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { SEOHead } from '@/components/SEOHead';

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      '404 Error: User attempted to access non-existent route:',
      location.pathname
    );
  }, [location.pathname]);

  return (
    <>
      <SEOHead
        title="Page Not Found"
        description="The page you are looking for does not exist. Return to GrantFather homepage."
        canonical="/404"
      />
      <main className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-4xl font-bold mb-4 text-foreground">404</h1>
          <p className="text-xl text-muted-foreground mb-4">
            Oops! Page not found
          </p>
          <a
            href="/"
            className="text-primary hover:text-primary/80 underline underline-offset-4"
          >
            Return to Home
          </a>
        </div>
      </main>
    </>
  );
};

export default NotFound;
