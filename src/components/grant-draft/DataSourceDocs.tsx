import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from "@/components/ui/tabs";
import { 
  Database, 
  ExternalLink, 
  FileText, 
  Settings, 
  Code,
  CheckCircle,
  AlertCircle,
  Info,
  Copy
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface DataSource {
  id: string;
  name: string;
  description: string;
  difficulty: 'Easy' | 'Medium' | 'Advanced';
  type: 'API' | 'Database' | 'File Import' | 'Webhook';
  documentation: string;
  setupSteps: string[];
  codeExample?: string;
  requirements: string[];
}

const DATA_SOURCES: DataSource[] = [
  {
    id: 'airtable',
    name: 'Airtable',
    description: 'Connect to Airtable bases to sync grant applications and organization data',
    difficulty: 'Easy',
    type: 'API',
    documentation: 'https://airtable.com/developers/web/api/introduction',
    setupSteps: [
      'Create an Airtable Personal Access Token',
      'Find your Base ID from the API documentation',
      'Configure table names and field mappings',
      'Set up automatic sync schedule'
    ],
    codeExample: `// Airtable integration example
const airtable = new Airtable({apiKey: 'your-token'});
const base = airtable.base('your-base-id');

// Fetch grant applications
const records = await base('Grant Applications').select({
  filterByFormula: '{Status} = "Draft"'
}).firstPage();`,
    requirements: ['Airtable Personal Access Token', 'Base ID', 'Table structure mapping']
  },
  {
    id: 'google-sheets',
    name: 'Google Sheets',
    description: 'Import and sync data from Google Sheets spreadsheets',
    difficulty: 'Medium',
    type: 'API',
    documentation: 'https://developers.google.com/sheets/api',
    setupSteps: [
      'Enable Google Sheets API in Google Cloud Console',
      'Create service account credentials',
      'Share spreadsheet with service account email',
      'Configure column mappings'
    ],
    codeExample: `// Google Sheets integration
const sheets = google.sheets({version: 'v4', auth: jwtClient});
const response = await sheets.spreadsheets.values.get({
  spreadsheetId: 'your-sheet-id',
  range: 'Applications!A:Z',
});`,
    requirements: ['Google Cloud Project', 'Service Account Key', 'Spreadsheet access']
  },
  {
    id: 'csv-import',
    name: 'CSV Import',
    description: 'Bulk import grant applications and organization data from CSV files',
    difficulty: 'Easy',
    type: 'File Import',
    documentation: '/docs/csv-import',
    setupSteps: [
      'Prepare CSV file with required columns',
      'Use the import wizard to map fields',
      'Review and validate imported data',
      'Confirm import and sync to database'
    ],
    codeExample: `// CSV format example
Project Name,Organization,Funding Amount,Status,Deadline
"Clean Energy Initiative","Green Tech Inc",250000,"Draft","2024-06-15"
"Education Program","Learning Foundation",150000,"Submitted","2024-08-30"`,
    requirements: ['CSV file with proper headers', 'Data validation rules']
  },
  {
    id: 'salesforce',
    name: 'Salesforce',
    description: 'Sync grant applications with Salesforce CRM opportunities',
    difficulty: 'Advanced',
    type: 'API',
    documentation: 'https://developer.salesforce.com/docs/apis',
    setupSteps: [
      'Create a Connected App in Salesforce',
      'Configure OAuth 2.0 authentication',
      'Map Salesforce objects to grant fields',
      'Set up real-time sync with webhooks'
    ],
    codeExample: `// Salesforce integration
const conn = new jsforce.Connection();
await conn.login(username, password + securityToken);
const opportunities = await conn.sobject('Opportunity')
  .find({Type: 'Grant Application'});`,
    requirements: ['Salesforce org access', 'Connected App', 'API permissions']
  },
  {
    id: 'webhook',
    name: 'Custom Webhook',
    description: 'Receive real-time updates from external systems via webhooks',
    difficulty: 'Advanced',
    type: 'Webhook',
    documentation: '/docs/webhooks',
    setupSteps: [
      'Configure webhook endpoint URL',
      'Set up authentication (optional)',
      'Define payload structure and mappings',
      'Test webhook with sample data'
    ],
    codeExample: `// Webhook endpoint example
export async function POST(request: Request) {
  const payload = await request.json();
  
  // Validate webhook signature
  const signature = request.headers.get('x-webhook-signature');
  if (!validateSignature(payload, signature)) {
    return Response.json({error: 'Invalid signature'}, {status: 401});
  }
  
  // Process grant application data
  await createGrantApplication(payload);
  return Response.json({success: true});
}`,
    requirements: ['Webhook URL endpoint', 'Authentication setup', 'Payload validation']
  }
];

export function DataSourceDocs() {
  const { toast } = useToast();

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied to clipboard",
      description: "Code example copied successfully"
    });
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'Medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'Advanced': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'API': return <Code className="h-4 w-4" />;
      case 'Database': return <Database className="h-4 w-4" />;
      case 'File Import': return <FileText className="h-4 w-4" />;
      case 'Webhook': return <Settings className="h-4 w-4" />;
      default: return <Database className="h-4 w-4" />;
    }
  };

  return (
    <Card className="glass">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Data Source Integration
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Connect your existing databases and tools to streamline grant management
        </p>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue={DATA_SOURCES[0].id} className="w-full">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-3">
            {DATA_SOURCES.slice(0, 6).map((source) => (
              <TabsTrigger key={source.id} value={source.id} className="text-xs">
                {source.name}
              </TabsTrigger>
            ))}
          </TabsList>

          {DATA_SOURCES.map((source) => (
            <TabsContent key={source.id} value={source.id} className="mt-6">
              <div className="space-y-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {getTypeIcon(source.type)}
                      <h3 className="text-lg font-semibold">{source.name}</h3>
                      <Badge className={getDifficultyColor(source.difficulty)}>
                        {source.difficulty}
                      </Badge>
                      <Badge variant="outline">{source.type}</Badge>
                    </div>
                    <p className="text-muted-foreground">{source.description}</p>
                  </div>
                  <Button variant="outline" size="sm" asChild>
                    <a href={source.documentation} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Docs
                    </a>
                  </Button>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        Setup Steps
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ol className="space-y-2">
                        {source.setupSteps.map((step, index) => (
                          <li key={index} className="flex gap-3 text-sm">
                            <span className="flex-shrink-0 w-5 h-5 bg-primary/10 text-primary rounded-full flex items-center justify-center text-xs font-medium">
                              {index + 1}
                            </span>
                            <span>{step}</span>
                          </li>
                        ))}
                      </ol>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-orange-600" />
                        Requirements
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2">
                        {source.requirements.map((req, index) => (
                          <li key={index} className="flex gap-3 text-sm">
                            <Info className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                            <span>{req}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </div>

                {source.codeExample && (
                  <Card>
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Code className="h-4 w-4" />
                          Code Example
                        </CardTitle>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => copyToClipboard(source.codeExample!)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <pre className="bg-muted p-4 rounded-lg text-sm overflow-x-auto">
                        <code>{source.codeExample}</code>
                      </pre>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}