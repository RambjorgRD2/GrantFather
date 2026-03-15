import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { 
  Globe, 
  Search, 
  RefreshCw, 
  ExternalLink, 
  Info, 
  Loader2,
  Database,
  Link
} from "lucide-react";

interface GrantPortal {
  id: string;
  name: string;
  description: string;
  url: string;
  type: 'government' | 'foundation' | 'corporate' | 'international';
  country: string;
  searchCapable: boolean;
}

const GRANT_PORTALS: GrantPortal[] = [
  {
    id: 'grants-gov',
    name: 'Grants.gov',
    description: 'US Federal Government grants portal',
    url: 'https://grants.gov',
    type: 'government',
    country: 'US',
    searchCapable: true
  },
  {
    id: 'innovasjon-norge',
    name: 'Innovasjon Norge',
    description: 'Norwegian innovation and development funding',
    url: 'https://innovasjonnorge.no',
    type: 'government',
    country: 'NO',
    searchCapable: true
  },
  {
    id: 'forskningsradet',
    name: 'Forskningsrådet',
    description: 'The Research Council of Norway',
    url: 'https://forskningsradet.no',
    type: 'government',
    country: 'NO',
    searchCapable: true
  },
  {
    id: 'horizon-europe',
    name: 'Horizon Europe',
    description: 'EU research and innovation program',
    url: 'https://ec.europa.eu/horizon-europe',
    type: 'international',
    country: 'EU',
    searchCapable: true
  },
  {
    id: 'gates-foundation',
    name: 'Gates Foundation',
    description: 'Bill & Melinda Gates Foundation grants',
    url: 'https://gatesfoundation.org',
    type: 'foundation',
    country: 'US',
    searchCapable: false
  }
];

export function GrantPortalIntegration() {
  const { toast } = useToast();
  const [selectedPortal, setSelectedPortal] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);

  const currentPortal = GRANT_PORTALS.find(p => p.id === selectedPortal);

  const handleSearch = async () => {
    if (!selectedPortal || !searchQuery) {
      toast({
        title: "Missing Information",
        description: "Please select a portal and enter search terms",
        variant: "destructive"
      });
      return;
    }

    setIsSearching(true);
    try {
      // This would integrate with actual grant portal APIs or scraping services
      // For now, we'll simulate the search
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Simulated results
      const mockResults = [
        {
          id: '1',
          title: 'Innovation in Sustainable Technology',
          deadline: '2024-06-15',
          amount: '$500,000',
          agency: currentPortal?.name,
          description: 'Funding for breakthrough technologies in sustainability...',
          matchScore: 92
        },
        {
          id: '2',
          title: 'Community Development Grant',
          deadline: '2024-08-30',
          amount: '$250,000',
          agency: currentPortal?.name,
          description: 'Support for community-based development projects...',
          matchScore: 78
        }
      ];
      
      setSearchResults(mockResults);
      toast({
        title: "Search Complete",
        description: `Found ${mockResults.length} potential grants`
      });
    } catch (error) {
      toast({
        title: "Search Failed",
        description: "Unable to search grant portal. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSearching(false);
    }
  };

  const getPortalTypeColor = (type: string) => {
    switch (type) {
      case 'government': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'foundation': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'corporate': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'international': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  return (
    <TooltipProvider>
      <Card className="glass">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Grant Portal Integration
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-4 w-4 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-sm">
                <p>
                  Search for relevant grants across major funding portals. 
                  Some portals require API keys or have usage limits.
                </p>
              </TooltipContent>
            </Tooltip>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="portal-select">Grant Portal</Label>
              <Select value={selectedPortal} onValueChange={setSelectedPortal}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a grant portal">
                    {currentPortal && (
                      <div className="flex items-center gap-2">
                        <Database className="h-4 w-4" />
                        <span>{currentPortal.name}</span>
                        <Badge className={getPortalTypeColor(currentPortal.type)}>
                          {currentPortal.type}
                        </Badge>
                      </div>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {GRANT_PORTALS.map((portal) => (
                    <SelectItem key={portal.id} value={portal.id}>
                      <div className="flex items-center gap-3 py-1">
                        <Database className="h-4 w-4" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{portal.name}</span>
                            <Badge className={getPortalTypeColor(portal.type)}>
                              {portal.type}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {portal.country}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {portal.description}
                          </p>
                        </div>
                        {!portal.searchCapable && (
                          <Badge variant="outline" className="text-xs">
                            Manual Only
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="search-query">Search Terms</Label>
              <div className="flex gap-2">
                <Input
                  id="search-query"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="e.g., sustainability, education, health technology"
                  disabled={!currentPortal?.searchCapable}
                />
                <Button 
                  onClick={handleSearch}
                  disabled={isSearching || !currentPortal?.searchCapable || !searchQuery}
                >
                  {isSearching ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {currentPortal && !currentPortal.searchCapable && (
                <p className="text-xs text-muted-foreground mt-1">
                  This portal requires manual browsing. Click the link below to visit.
                </p>
              )}
            </div>

            {currentPortal && (
              <Button variant="outline" asChild className="w-full">
                <a href={currentPortal.url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Visit {currentPortal.name}
                </a>
              </Button>
            )}
          </div>

          {searchResults.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium">Search Results</h4>
              {searchResults.map((result) => (
                <Card key={result.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h5 className="font-medium">{result.title}</h5>
                      <p className="text-sm text-muted-foreground mt-1">
                        {result.description}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                        <span>Amount: {result.amount}</span>
                        <span>Deadline: {result.deadline}</span>
                        <span>Agency: {result.agency}</span>
                      </div>
                    </div>
                    <Badge variant="outline" className="ml-2">
                      {result.matchScore}% match
                    </Badge>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}