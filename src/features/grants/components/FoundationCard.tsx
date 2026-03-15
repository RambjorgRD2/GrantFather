// Enhanced Foundation Card Component - Phase 4

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  ExternalLink,
  MapPin,
  Building2,
  Calendar,
  DollarSign,
  Globe,
  Mail,
  Phone,
  Tag,
  User,
  Image as ImageIcon,
} from 'lucide-react';
import type { FoundationItem } from '@/types/norwegian-foundations';

interface FoundationCardProps {
  foundation: FoundationItem;
  onApply?: (foundation: FoundationItem) => void;
  onSave?: (foundation: FoundationItem) => void;
  isSaved?: boolean;
}

export function FoundationCard({
  foundation,
  onApply,
  onSave,
  isSaved,
}: FoundationCardProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('no-NO', {
      style: 'currency',
      currency: 'NOK',
      maximumFractionDigits: 0,
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatLargeNumber = (amount: number) => {
    if (amount >= 1_000_000) {
      return `${(amount / 1_000_000).toFixed(1)}M NOK`;
    } else if (amount >= 1_000) {
      return `${(amount / 1_000).toFixed(0)}k NOK`;
    }
    return formatCurrency(amount);
  };

  return (
    <Card
      className="group relative h-full transition-all duration-200 hover:shadow-lg hover:-translate-y-1 backdrop-blur supports-[backdrop-filter]:bg-card/95"
      data-testid="foundation-card"
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg leading-tight line-clamp-2 group-hover:text-primary transition-colors">
              {foundation.name}
            </CardTitle>
            {foundation.orgNumber && (
              <div
                className="flex items-center gap-1 mt-1 text-xs text-muted-foreground"
                data-testid="org-number"
              >
                <Building2 className="h-3 w-3" />
                <span>Org.nr. {foundation.orgNumber}</span>
              </div>
            )}
          </div>

          {/* Foundation Logo */}
          {foundation.logoUrl ? (
            <div className="shrink-0">
              <img
                src={foundation.logoUrl}
                alt={`${foundation.name} logo`}
                className="h-12 w-12 rounded-lg object-cover border border-border"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  target.style.display = 'none';
                }}
              />
            </div>
          ) : (
            foundation.organizationType && (
              <Badge variant="secondary" className="shrink-0 text-xs">
                {foundation.organizationType}
              </Badge>
            )
          )}
        </div>

        <CardDescription className="line-clamp-2 text-sm">
          {foundation.description ||
            foundation.shortDescription ||
            'Norwegian foundation organization'}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4 pt-0">
        {/* Key Information */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          {foundation.area && (
            <div
              className="flex items-center gap-2"
              data-testid="foundation-area"
            >
              <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="truncate" title={foundation.area}>
                {foundation.area}
              </span>
            </div>
          )}

          {foundation.mainCategory && (
            <div
              className="flex items-center gap-2"
              data-testid="foundation-category"
            >
              <Tag className="h-4 w-4 text-muted-foreground shrink-0" />
              <span className="truncate" title={foundation.mainCategory}>
                {foundation.mainCategory}
              </span>
            </div>
          )}

          {foundation.equityAmount && (
            <div
              className="flex items-center gap-2 col-span-2"
              data-testid="foundation-equity"
            >
              <DollarSign className="h-4 w-4 text-muted-foreground shrink-0" />
              <div>
                <span className="font-medium">
                  {formatLargeNumber(foundation.equityAmount)}
                </span>
                {foundation.equityYear && (
                  <span className="text-muted-foreground ml-1">
                    ({foundation.equityYear})
                  </span>
                )}
              </div>
            </div>
          )}

          {foundation.foundedYear && (
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
              <span>Etablert {foundation.foundedYear}</span>
            </div>
          )}
        </div>

        {/* Contact Information */}
        {(foundation.contactEmail ||
          foundation.contactPhone ||
          foundation.address ||
          foundation.websiteUrl) && (
          <div className="space-y-2 text-sm">
            {foundation.contactEmail && (
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                <a
                  href={`mailto:${foundation.contactEmail}`}
                  className="text-primary hover:underline truncate"
                  title={foundation.contactEmail}
                >
                  {foundation.contactEmail}
                </a>
              </div>
            )}

            {foundation.contactPhone && (
              <div className="flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                <a
                  href={`tel:${foundation.contactPhone}`}
                  className="text-primary hover:underline"
                >
                  {foundation.contactPhone}
                </a>
              </div>
            )}

            {foundation.address && (
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
                <div className="text-muted-foreground">
                  <div>{foundation.address}</div>
                  {foundation.postalCode && foundation.city && (
                    <div>
                      {foundation.postalCode} {foundation.city}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          {foundation.websiteUrl && (
            <Button variant="outline" size="sm" className="flex-1" asChild>
              <a
                href={foundation.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2"
                data-testid="visit-website-button"
              >
                <Globe className="h-4 w-4" />
                Besøk nettside
              </a>
            </Button>
          )}

          {onApply && (
            <Button
              size="sm"
              className="flex-1"
              onClick={() => onApply(foundation)}
              data-testid="apply-foundation-button"
            >
              <User className="mr-2 h-4 w-4" />
              Søk
            </Button>
          )}
        </div>

        {/* Save Button */}
        {onSave && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full"
            onClick={() => onSave(foundation)}
            data-testid="save-foundation-button"
          >
            {isSaved ? (
              <>
                <Tag className="mr-2 h-4 w-4" />
                Lagret
              </>
            ) : (
              <>
                <Tag className="mr-2 h-4 w-4" />
                Lagre
              </>
            )}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
