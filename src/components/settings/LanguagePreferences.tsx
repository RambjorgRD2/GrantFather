import React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { LanguageSelector } from '@/components/ui/language-selector';
import { useLanguage, SUPPORTED_LANGUAGES } from '@/contexts/LanguageContext';
import { Globe, MessageCircle, Palette, Calendar } from 'lucide-react';

export function LanguagePreferences() {
  const { uiLanguage, aiLanguage, formatCurrency, formatDate } = useLanguage();

  const currentUILang = SUPPORTED_LANGUAGES.find(
    (lang) => lang.code === uiLanguage
  );
  const currentAILang = SUPPORTED_LANGUAGES.find(
    (lang) => lang.code === aiLanguage
  );

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <p className="text-muted-foreground">
          Configure interface language and AI response language for your
          organization.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Interface Language */}
        <Card className="glass">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Globe className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Interface Language</CardTitle>
                <CardDescription>
                  Language used for the application interface
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Current Language</Label>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{currentUILang?.flag}</span>
                  <span className="font-medium">{currentUILang?.name}</span>
                </div>
                <LanguageSelector type="ui" />
              </div>
            </div>
            <Separator />
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>
                <strong>Affects:</strong>
              </p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Menu and button labels</li>
                <li>Date formatting: {formatDate(new Date())}</li>
                <li>Currency formatting: {formatCurrency(10000)}</li>
                <li>Number and time formats</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* AI Response Language */}
        <Card className="glass">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10">
                <MessageCircle className="h-5 w-5 text-accent-foreground" />
              </div>
              <div>
                <CardTitle>AI Response Language</CardTitle>
                <CardDescription>
                  Language for AI-generated content and responses
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Current Language</Label>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{currentAILang?.flag}</span>
                  <span className="font-medium">{currentAILang?.name}</span>
                </div>
                <LanguageSelector type="ai" />
              </div>
            </div>
            <Separator />
            <div className="space-y-2 text-sm text-muted-foreground">
              <p>
                <strong>Affects:</strong>
              </p>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>Generated grant content</li>
                <li>AI suggestions and improvements</li>
                <li>Section regeneration</li>
                <li>Application drafts</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Language Support Information */}
      <Card className="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Supported Languages
          </CardTitle>
          <CardDescription>
            Languages available for interface and AI responses
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {SUPPORTED_LANGUAGES.map((lang) => (
              <div
                key={lang.code}
                className="flex items-center gap-2 p-2 rounded-md bg-muted/30"
              >
                <span className="text-lg">{lang.flag}</span>
                <span className="text-sm font-medium">{lang.name}</span>
              </div>
            ))}
          </div>
          <Separator className="my-4" />
          <div className="space-y-2 text-sm text-muted-foreground">
            <h4 className="font-medium text-foreground">Language Features:</h4>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>
                <strong>Auto-Detection:</strong> AI will respond in your
                preferred language
              </li>
              <li>
                <strong>Localized Formatting:</strong> Dates, currencies, and
                numbers adapt automatically
              </li>
              <li>
                <strong>Cultural Context:</strong> AI understands regional grant
                writing conventions
              </li>
              <li>
                <strong>Mixed Content:</strong> You can use different languages
                for interface vs AI responses
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Usage Tips */}
      <Card className="glass border-accent/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-accent-foreground">
            <Calendar className="h-5 w-5" />
            Best Practices
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 rounded-full bg-accent mt-2 flex-shrink-0" />
            <p>
              <strong>Interface Language:</strong> Choose the language your team
              is most comfortable with for navigation and daily use.
            </p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 rounded-full bg-accent mt-2 flex-shrink-0" />
            <p>
              <strong>AI Language:</strong> Select the language you want grant
              applications written in, considering your target audience and
              funders.
            </p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 rounded-full bg-accent mt-2 flex-shrink-0" />
            <p>
              <strong>Consistency:</strong> Keep AI language consistent across
              all grant applications unless specifically targeting different
              linguistic regions.
            </p>
          </div>
          <div className="flex items-start gap-3">
            <div className="w-2 h-2 rounded-full bg-accent mt-2 flex-shrink-0" />
            <p>
              <strong>Knowledge Base:</strong> Create knowledge base entries in
              your AI response language for better context and accuracy.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
