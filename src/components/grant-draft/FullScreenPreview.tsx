import React, { useState, useEffect } from 'react';
import { X, Download, Share2, Eye, ZoomIn, ZoomOut, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useLanguage } from '@/contexts/LanguageContext';

interface GrantSection {
  introduction: string;
  need_statement: string;
  project_plan: string;
  budget: string;
  outcomes: string;
  conclusion: string;
}

interface GrantApplication {
  id: string;
  project_name: string;
  summary: string;
  funding_amount: number;
  target_audience: string;
  timeline_start: string;
  timeline_end: string;
  expected_impact: string;
  organizations: {
    name: string;
    org_type: string;
    mission: string;
  };
}

interface FullScreenPreviewProps {
  isOpen: boolean;
  onClose: () => void;
  sections: GrantSection;
  application: GrantApplication;
  onDownloadPDF?: () => void;
  onShare?: () => void;
}

const sectionLabels = {
  introduction: 'Introduction',
  need_statement: 'Statement of Need',
  project_plan: 'Project Plan',
  budget: 'Budget & Resources',
  outcomes: 'Expected Outcomes',
  conclusion: 'Conclusion',
};

export function FullScreenPreview({
  isOpen,
  onClose,
  sections,
  application,
  onDownloadPDF,
  onShare,
}: FullScreenPreviewProps) {
  const { formatCurrency, formatDate } = useLanguage();
  const [zoomLevel, setZoomLevel] = useState(100);
  const [copied, setCopied] = useState(false);

  // Handle escape key to close
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  const completedSections = Object.entries(sections).filter(([_, content]) => 
    content && content.trim().length > 0
  );

  const totalWordCount = completedSections.reduce((total, [_, content]) => {
    return total + content.trim().split(/\s+/).length;
  }, 0);

  const handleCopyAll = async () => {
    const fullText = [
      `${application.project_name}`,
      `Organization: ${application.organizations.name}`,
      `Funding Amount: ${formatCurrency(application.funding_amount)}`,
      `Timeline: ${formatDate(application.timeline_start)} - ${formatDate(application.timeline_end)}`,
      '',
      ...Object.entries(sections).map(([key, content]) => {
        if (!content?.trim()) return '';
        return `${sectionLabels[key as keyof typeof sectionLabels]}\n\n${content}\n`;
      }).filter(Boolean)
    ].join('\n');

    try {
      await navigator.clipboard.writeText(fullText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text:', err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-card/50 backdrop-blur-sm">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-lg font-semibold">{application.project_name}</h1>
            <p className="text-sm text-muted-foreground">{application.organizations.name}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Stats */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground mr-4">
            <span>{completedSections.length} sections</span>
            <span>{totalWordCount.toLocaleString()} words</span>
          </div>

          {/* Zoom Controls */}
          <div className="flex items-center gap-1 bg-muted/30 rounded-lg p-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setZoomLevel(Math.max(50, zoomLevel - 10))}
              disabled={zoomLevel <= 50}
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-xs font-medium px-2 min-w-[3rem] text-center">
              {zoomLevel}%
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setZoomLevel(Math.min(150, zoomLevel + 10))}
              disabled={zoomLevel >= 150}
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>

          {/* Actions */}
          <Button variant="outline" size="sm" onClick={handleCopyAll} className="gap-2">
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? 'Copied!' : 'Copy All'}
          </Button>

          {onShare && (
            <Button variant="outline" size="sm" onClick={onShare} className="gap-2">
              <Share2 className="h-4 w-4" />
              Share
            </Button>
          )}

          {onDownloadPDF && (
            <Button variant="outline" size="sm" onClick={onDownloadPDF} className="gap-2">
              <Download className="h-4 w-4" />
              PDF
            </Button>
          )}
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="h-[calc(100vh-73px)]">
        <div className="max-w-4xl mx-auto p-8">
          <div 
            className="space-y-8"
            style={{ 
              fontSize: `${zoomLevel}%`,
              lineHeight: 1.6
            }}
          >
            {/* Header */}
            <div className="text-center space-y-4 pb-8 border-b">
              <h1 className="text-4xl font-bold text-foreground">
                {application.project_name}
              </h1>
              <div className="space-y-2">
                <div className="flex items-center justify-center gap-4 text-lg text-muted-foreground">
                  <span>{application.organizations.name}</span>
                  <Badge variant="secondary" className="text-sm">
                    {application.organizations.org_type}
                  </Badge>
                </div>
                <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
                  <span className="font-medium">Funding Request: {formatCurrency(application.funding_amount)}</span>
                  <span>Timeline: {formatDate(application.timeline_start)} - {formatDate(application.timeline_end)}</span>
                </div>
                <p className="text-muted-foreground max-w-2xl mx-auto">
                  Target Audience: {application.target_audience}
                </p>
              </div>
            </div>

            {/* Sections */}
            <div className="space-y-12">
              {Object.entries(sections).map(([key, content]) => {
                if (!content?.trim()) return null;

                return (
                  <div key={key}>
                    <h2 className="text-2xl font-semibold text-foreground mb-4 pb-2 border-b">
                      {sectionLabels[key as keyof typeof sectionLabels]}
                    </h2>
                    <div className="prose prose-lg max-w-none dark:prose-invert">
                      {content.split('\n').map((paragraph, index) => {
                        if (!paragraph.trim()) return <br key={index} />;
                        return (
                          <p key={index} className="mb-4 leading-relaxed text-foreground">
                            {paragraph}
                          </p>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Footer */}
            <Separator className="my-12" />
            <div className="text-center text-sm text-muted-foreground space-y-2 pb-12">
              <p><strong>Organization:</strong> {application.organizations.name}</p>
              <p><strong>Contact Information:</strong> As provided in organization profile</p>
              <p><strong>Application Generated:</strong> {formatDate(new Date())}</p>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
}