// Enhanced Norwegian Foundation Scraper - Phase 2 & 3

import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface FoundationSearchRequest {
  q?: string;
  organizationType?: string | null;
  mainCategory?: string | null;
  area?: string | null;
  minEquity?: number | null;
  maxEquity?: number | null;
  foundedAfter?: number | null;
  foundedBefore?: number | null;
  hasWebsite?: boolean | null;
  warmup?: boolean;
}

interface FoundationItem {
  id: string;
  orgNumber?: string;
  name: string;
  area?: string;
  organizationType?: string;
  mainCategory?: string;
  equityAmount?: number;
  equityYear?: number;
  description?: string;
  websiteUrl?: string;
  contactEmail?: string;
  contactPhone?: string;
  address?: string;
  postalCode?: string;
  city?: string;
  foundedYear?: number;
  applyUrl: string;
  logoUrl?: string;
  
  // Legacy compatibility
  deadline?: string | null;
  fundingMin?: number | null;
  fundingMax?: number | null;
  region?: string | null;
  eligibility?: string[];
  shortDescription?: string;
}

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const APIFY_TOKEN = Deno.env.get("APIFY_TOKEN");

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const startUrl = "https://stiftelsesforeningen.no/medlemmer/stiftelser";
const CACHE_KEY = `norwegian-foundations:${startUrl}`;
const CACHE_TTL_HOURS = 12; // Longer cache for structured data

// Enhanced Norwegian Foundation Scraper
async function runFoundationScrape(): Promise<{ datasetId?: string; runId?: string }> {
  if (!APIFY_TOKEN) {
    throw new Error("Missing APIFY_TOKEN secret in project settings");
  }

  console.log("[Foundation Scraper] Starting enhanced Norwegian foundation scraping");

  const pageFunction = `async function pageFunction(context) {
    const { request, log, saveData } = context;
    
    try {
      const base = request.loadedUrl || request.url;
      log.info('Processing Norwegian foundations page: ' + request.url);

      // Enhanced extraction for Norwegian foundation structure
      const foundationElements = document.querySelectorAll('.memberItem_memberItem__j_OnM, .member-card, .foundation-item, .organization-item');
      log.info('Found ' + foundationElements.length + ' foundation elements');

      if (foundationElements.length === 0) {
        log.warning('No foundation elements found, using fallback extraction');
        // Fallback to general extraction
        await extractGeneralFoundations();
        return;
      }

      const processedFoundations = new Set();
      
      foundationElements.forEach((element, index) => {
        try {
          const foundationData = extractFoundationData(element, index, base);
          
          if (foundationData && foundationData.name) {
            const key = foundationData.name + '|' + (foundationData.orgNumber || foundationData.websiteUrl || index);
            
            if (!processedFoundations.has(key)) {
              processedFoundations.add(key);
              saveData(foundationData);
              log.info('Extracted foundation: ' + foundationData.name);
            }
          }
        } catch (error) {
          log.warning('Error processing foundation ' + index + ': ' + error.message);
        }
      });

      log.info('Successfully processed ' + processedFoundations.size + ' unique foundations');

      // Helper function to extract structured foundation data
      function extractFoundationData(element, index, baseUrl) {
        const name = extractText(element, 'h3, h2, .title, .name, .organization-name, .member-name') || 
                     'Foundation ' + (index + 1);

        // Extract organization number (critical for Norwegian foundations)
        const orgNumber = extractOrgNumber(element);
        
        // Extract area/region information
        const area = extractText(element, '.area, .region, .location, .område') || 
                     extractFromText(element.textContent, /(?:område|region|area):\\s*([^\\n,]+)/i);

        // Extract organization type
        const organizationType = extractText(element, '.type, .org-type, .organization-type') ||
                                extractFromText(element.textContent, /(?:type|stiftelse|forening|fond):[\\s]*([^\\n,]+)/i);

        // Extract main category
        const mainCategory = extractText(element, '.category, .sector, .hovedgruppe') ||
                            extractFromText(element.textContent, /(?:kategori|sektor|hovedgruppe):[\\s]*([^\\n,]+)/i);

        // Extract equity/financial information
        const equity = extractEquityAmount(element);
        
        // Extract description
        const description = extractText(element, 'p, .description, .excerpt, .summary') ||
                           element.textContent?.trim().slice(0, 300).replace(/\\s+/g, ' ') || '';

        // Extract contact information
        const contactInfo = extractContactInfo(element);
        
        // Extract website URL
        const websiteUrl = extractWebsiteUrl(element, baseUrl) || contactInfo.website;

        // Extract address information
        const addressInfo = extractAddressInfo(element);

        // Extract founded year
        const foundedYear = extractFoundedYear(element);

        return {
          name: name.trim(),
          orgNumber: orgNumber,
          area: area,
          organizationType: organizationType,
          mainCategory: mainCategory,
          equityAmount: equity?.amount,
          equityYear: equity?.year,
          description: description.trim(),
          websiteUrl: websiteUrl,
          contactEmail: contactInfo.email,
          contactPhone: contactInfo.phone,
          address: addressInfo.address,
          postalCode: addressInfo.postalCode,
          city: addressInfo.city,
          foundedYear: foundedYear,
          source: request.url,
          extractedAt: new Date().toISOString(),
          type: 'norwegian_foundation'
        };
      }

      function extractText(element, selector) {
        const el = element.querySelector ? element.querySelector(selector) : null;
        return el ? el.textContent?.trim() : null;
      }

      function extractOrgNumber(element) {
        const text = element.textContent || '';
        // Norwegian org numbers are 9 digits
        const match = text.match(/(?:org\\.?\\s*nr\\.?|organisasjonsnummer)\\s*[:\\-]?\\s*(\\d{9})/i);
        return match ? match[1] : null;
      }

      function extractFromText(text, regex) {
        if (!text) return null;
        const match = text.match(regex);
        return match ? match[1].trim() : null;
      }

      function extractEquityAmount(element) {
        const text = element.textContent || '';
        // Look for Norwegian currency amounts (NOK, kr)
        const equityMatch = text.match(/(?:egenkapital|kapital|formue)\\s*[:\\-]?\\s*([\\d\\s,\\.]+)\\s*(?:nok|kr|kroner)/i);
        if (equityMatch) {
          const amountStr = equityMatch[1].replace(/[\\s,]/g, '');
          const amount = parseInt(amountStr, 10);
          
          // Extract year if present
          const yearMatch = text.match(/(?:per|år|year)\\s*(\\d{4})/i);
          const year = yearMatch ? parseInt(yearMatch[1], 10) : new Date().getFullYear();
          
          return { amount: isNaN(amount) ? null : amount, year };
        }
        return null;
      }

      function extractContactInfo(element) {
        const text = element.textContent || '';
        
        // Extract email
        const emailMatch = text.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,})/);
        const email = emailMatch ? emailMatch[1] : null;
        
        // Extract Norwegian phone number
        const phoneMatch = text.match(/(?:tlf|telefon|phone)\\s*[:\\-]?\\s*((?:\\+47\\s*)?\\d{2}\\s*\\d{2}\\s*\\d{2}\\s*\\d{2})/i);
        const phone = phoneMatch ? phoneMatch[1] : null;
        
        // Extract website from links
        const links = element.querySelectorAll ? element.querySelectorAll('a[href]') : [];
        let website = null;
        for (const link of links) {
          const href = link.getAttribute('href');
          if (href && (href.startsWith('http') || href.includes('.'))) {
            if (!href.includes('mailto:') && !href.includes('tel:')) {
              website = href.startsWith('http') ? href : 'https://' + href;
              break;
            }
          }
        }
        
        return { email, phone, website };
      }

      function extractWebsiteUrl(element, baseUrl) {
        const links = element.querySelectorAll ? element.querySelectorAll('a[href]') : [];
        
        for (const link of links) {
          const href = link.getAttribute('href');
          if (href && !href.startsWith('mailto:') && !href.startsWith('tel:') && !href.startsWith('#')) {
            // Convert relative URLs to absolute
            if (href.startsWith('http')) {
              return href;
            } else if (href.startsWith('/')) {
              return new URL(href, baseUrl).href;
            } else if (href.includes('.')) {
              return 'https://' + href;
            }
          }
        }
        return null;
      }

      function extractAddressInfo(element) {
        const text = element.textContent || '';
        
        // Extract Norwegian postal code (4 digits)
        const postalMatch = text.match(/(\\d{4})\\s+([A-ZÆØÅ][a-zæøå\\s]+)/);
        const postalCode = postalMatch ? postalMatch[1] : null;
        const city = postalMatch ? postalMatch[2].trim() : null;
        
        // Extract full address
        const addressMatch = text.match(/(?:adresse|address)\\s*[:\\-]?\\s*([^\\n]+)/i);
        const address = addressMatch ? addressMatch[1].trim() : null;
        
        return { address, postalCode, city };
      }

      function extractFoundedYear(element) {
        const text = element.textContent || '';
        const match = text.match(/(?:etablert|grunnlagt|founded|stiftet)\\s*[:\\-]?\\s*(\\d{4})/i);
        return match ? parseInt(match[1], 10) : null;
      }

      async function extractGeneralFoundations() {
        // Fallback extraction for general foundation information
        const allLinks = document.querySelectorAll('a[href]');
        const processed = new Set();
        
        for (const link of allLinks) {
          try {
            const name = link.textContent?.trim();
            const href = link.getAttribute('href');
            
            if (name && href && name.length > 3 && !processed.has(name)) {
              processed.add(name);
              
              const absoluteUrl = href.startsWith('http') ? href : 
                                 href.startsWith('/') ? new URL(href, base).href : 
                                 'https://' + href;
              
              saveData({
                name: name,
                websiteUrl: absoluteUrl,
                description: 'Norwegian foundation member organization',
                source: request.url,
                type: 'fallback_foundation',
                extractedAt: new Date().toISOString()
              });
            }
          } catch (error) {
            log.warning('Error in fallback extraction: ' + error.message);
          }
        }
      }
      
    } catch (error) {
      log.error('Critical error in foundation scraping: ' + (error.message || error));
    }
  }`;

  const runResp = await fetch(
    `https://api.apify.com/v2/acts/apify~web-scraper/runs?token=${APIFY_TOKEN}&waitForFinish=180&memory=1024`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        startUrls: [{ url: startUrl }],
        maxRequestsPerCrawl: 3, // Allow pagination
        pageFunction,
        proxyConfiguration: { useApifyProxy: true },
        ignoreSslErrors: true,
        requestHandlerTimeoutSecs: 60,
        preNavigationHooks: [`
          async ({ page, request, log }) => {
            // Set Norwegian language preference
            await page.setExtraHTTPHeaders({
              'Accept-Language': 'no-NO,no;q=0.9,en;q=0.8'
            });
            
            // Wait for content to load
            await page.waitForTimeout(3000);
            log.info('Page prepared for Norwegian foundation extraction');
          }
        `]
      }),
    }
  );

  if (!runResp.ok) {
    const txt = await runResp.text();
    console.error("[Foundation Scraper] Apify run failed:", txt);
    throw new Error("Failed to start Norwegian foundation scraping");
  }

  const runData = await runResp.json();
  const datasetId = runData?.data?.defaultDatasetId || runData?.data?.defaultDataset?.id;
  const runId = runData?.data?.id;

  console.log("[Foundation Scraper] Started scraping job:", { datasetId, runId });

  if (!datasetId) {
    console.error("[Foundation Scraper] No dataset ID returned:", runData);
    throw new Error("No dataset returned from Norwegian foundation scraper");
  }

  return { datasetId, runId };
}

// Enhanced data processing and storage
async function processFoundationData(rawData: any[]): Promise<FoundationItem[]> {
  console.log(`[Foundation Processor] Processing ${rawData.length} foundation records`);
  
  const processed: FoundationItem[] = [];
  const orgNumbers = new Set<string>();
  
  for (const [index, raw] of rawData.entries()) {
    try {
      // Skip duplicates by org number if available
      if (raw.orgNumber && orgNumbers.has(raw.orgNumber)) {
        console.log(`[Foundation Processor] Skipping duplicate org number: ${raw.orgNumber}`);
        continue;
      }
      
      if (raw.orgNumber) {
        orgNumbers.add(raw.orgNumber);
      }

      const foundation: FoundationItem = {
        id: `foundation-${index}-${raw.orgNumber || raw.name?.slice(0, 20) || Date.now()}`,
        name: raw.name || "Unnamed Foundation",
        orgNumber: raw.orgNumber || null,
        area: raw.area || null,
        organizationType: raw.organizationType || null,
        mainCategory: raw.mainCategory || null,
        equityAmount: typeof raw.equityAmount === 'number' ? raw.equityAmount : null,
        equityYear: raw.equityYear || null,
        description: raw.description || "Norwegian foundation organization",
        websiteUrl: raw.websiteUrl || null,
        contactEmail: raw.contactEmail || null,
        contactPhone: raw.contactPhone || null,
        address: raw.address || null,
        postalCode: raw.postalCode || null,
        city: raw.city || null,
        foundedYear: raw.foundedYear || null,
        logoUrl: raw.logoUrl || null,
        applyUrl: raw.websiteUrl || startUrl,
        
        // Legacy compatibility
        deadline: null,
        fundingMin: null,
        fundingMax: raw.equityAmount ? Math.floor(raw.equityAmount * 0.01) : null, // Estimate 1% of equity as potential funding
        region: raw.area || "NO",
        eligibility: raw.mainCategory ? [raw.mainCategory] : [],
        shortDescription: raw.description?.slice(0, 200) || "Norwegian foundation"
      };

      processed.push(foundation);
      
    } catch (error) {
      console.error(`[Foundation Processor] Error processing record ${index}:`, error);
    }
  }
  
  console.log(`[Foundation Processor] Successfully processed ${processed.length} foundations`);
  return processed;
}

// Enhanced caching with structured data
async function getCachedFoundations(): Promise<{ items: FoundationItem[]; timestamp: string } | null> {
  try {
    const { data, error } = await supabaseAdmin
      .from("scrape_cache")
      .select("foundation_data, refreshed_at")
      .eq("cache_key", CACHE_KEY)
      .eq("scrape_type", "norwegian_foundations")
      .maybeSingle();

    if (error) {
      console.error("[Cache] Error reading foundation cache:", error);
      return null;
    }

    if (data && data.foundation_data) {
      return {
        items: data.foundation_data as FoundationItem[],
        timestamp: data.refreshed_at
      };
    }

    return null;
  } catch (error) {
    console.error("[Cache] Cache read error:", error);
    return null;
  }
}

async function setCachedFoundations(foundations: FoundationItem[], datasetId?: string, runId?: string) {
  try {
    const { error } = await supabaseAdmin
      .from("scrape_cache")
      .upsert({
        cache_key: CACHE_KEY,
        source_url: startUrl,
        foundation_data: foundations,
        dataset_id: datasetId,
        actor_run_id: runId,
        scrape_type: "norwegian_foundations",
        refreshed_at: new Date().toISOString(),
      });

    if (error) {
      console.error("[Cache] Error caching foundations:", error);
    } else {
      console.log(`[Cache] Cached ${foundations.length} foundations successfully`);
    }
  } catch (error) {
    console.error("[Cache] Cache write error:", error);
  }
}

// Enhanced filtering for Norwegian foundations
function filterFoundations(foundations: FoundationItem[], filters: FoundationSearchRequest): FoundationItem[] {
  let filtered = [...foundations];
  
  // Text search across multiple fields
  if (filters.q) {
    const query = filters.q.toLowerCase().trim();
    filtered = filtered.filter(f => 
      f.name.toLowerCase().includes(query) ||
      (f.description || "").toLowerCase().includes(query) ||
      (f.mainCategory || "").toLowerCase().includes(query) ||
      (f.organizationType || "").toLowerCase().includes(query) ||
      (f.area || "").toLowerCase().includes(query)
    );
  }
  
  // Filter by organization type
  if (filters.organizationType) {
    filtered = filtered.filter(f => f.organizationType === filters.organizationType);
  }
  
  // Filter by main category
  if (filters.mainCategory) {
    filtered = filtered.filter(f => f.mainCategory === filters.mainCategory);
  }
  
  // Filter by area
  if (filters.area) {
    filtered = filtered.filter(f => f.area === filters.area);
  }
  
  // Filter by equity range
  if (filters.minEquity || filters.maxEquity) {
    filtered = filtered.filter(f => {
      if (!f.equityAmount) return false;
      if (filters.minEquity && f.equityAmount < filters.minEquity) return false;
      if (filters.maxEquity && f.equityAmount > filters.maxEquity) return false;
      return true;
    });
  }
  
  // Filter by founded year range
  if (filters.foundedAfter || filters.foundedBefore) {
    filtered = filtered.filter(f => {
      if (!f.foundedYear) return false;
      if (filters.foundedAfter && f.foundedYear < filters.foundedAfter) return false;
      if (filters.foundedBefore && f.foundedYear > filters.foundedBefore) return false;
      return true;
    });
  }
  
  // Filter by website availability
  if (filters.hasWebsite !== null) {
    filtered = filtered.filter(f => 
      filters.hasWebsite ? !!f.websiteUrl : !f.websiteUrl
    );
  }
  
  return filtered;
}

function isCacheFresh(timestamp: string): boolean {
  const cached = new Date(timestamp).getTime();
  const now = Date.now();
  const ageHours = (now - cached) / (1000 * 60 * 60);
  return ageHours < CACHE_TTL_HOURS;
}

// Main handler
serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Use POST method" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = (await req.json()) as FoundationSearchRequest;
    console.log("[Foundation API] Request received:", { ...body, warmup: body.warmup });

    // Warmup request - prepare cache
    if (body.warmup) {
      const cached = await getCachedFoundations();
      if (cached && isCacheFresh(cached.timestamp)) {
        return new Response(
          JSON.stringify({ 
            success: true, 
            warmed: false, 
            cachedAt: cached.timestamp,
            count: cached.items.length 
          }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Run scraping for warmup
      const { datasetId, runId } = await runFoundationScrape();
      console.log("[Foundation API] Warmup scraping initiated:", { datasetId, runId });
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          warmed: true, 
          datasetId, 
          runId 
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Search request - use cache or scrape
    let foundations: FoundationItem[] = [];
    
    // Try cache first
    const cached = await getCachedFoundations();
    if (cached && isCacheFresh(cached.timestamp)) {
      console.log(`[Foundation API] Using cached data (${cached.items.length} foundations)`);
      foundations = cached.items;
    } else {
      // Scrape fresh data
      console.log("[Foundation API] Cache miss, scraping fresh data");
      const { datasetId } = await runFoundationScrape();
      
      if (datasetId) {
        // Fetch and process scraped data
        const rawDataUrl = `https://api.apify.com/v2/datasets/${datasetId}/items?clean=true&format=json&token=${APIFY_TOKEN}`;
        const rawResp = await fetch(rawDataUrl);
        
        if (rawResp.ok) {
          const rawData = await rawResp.json();
          foundations = await processFoundationData(rawData);
          await setCachedFoundations(foundations, datasetId);
        } else {
          throw new Error("Failed to fetch scraped foundation data");
        }
      }
    }

    // Apply filters
    const filteredFoundations = filterFoundations(foundations, body);
    
    // If no foundations found, provide fallback data
    if (filteredFoundations.length === 0 && foundations.length === 0) {
      console.log("[Foundation API] No foundations found, providing fallback data");
      const fallbackFoundations: FoundationItem[] = [
        {
          id: "fallback-1",
          name: "Stiftelsesforeningen",
          description: "Norges største organisasjon for stiftelser og fond",
          websiteUrl: "https://stiftelsesforeningen.no",
          area: "Norge",
          organizationType: "Stiftelse",
          mainCategory: "Generell",
          applyUrl: "https://stiftelsesforeningen.no/medlemmer/stiftelser",
          shortDescription: "Finn stiftelser og fond i Norge"
        },
        {
          id: "fallback-2", 
          name: "Innovasjon Norge",
          description: "Norges nasjonale innovasjons- og utviklingsselskap",
          websiteUrl: "https://innovasjonnorge.no",
          area: "Norge",
          organizationType: "Statlig",
          mainCategory: "Innovasjon",
          applyUrl: "https://innovasjonnorge.no",
          shortDescription: "Støtte til innovasjon og utvikling"
        },
        {
          id: "fallback-3",
          name: "Forskningsrådet",
          description: "Norges forskningsråd - finansierer forskning og innovasjon",
          websiteUrl: "https://forskningsradet.no", 
          area: "Norge",
          organizationType: "Statlig",
          mainCategory: "Forskning",
          applyUrl: "https://forskningsradet.no",
          shortDescription: "Forskningsfinansiering og innovasjon"
        }
      ];
      
      const response = {
        items: fallbackFoundations,
        totalCount: fallbackFoundations.length,
        filters: {
          organizationTypes: ["Stiftelse", "Statlig"],
          mainCategories: ["Generell", "Innovasjon", "Forskning"],
          areas: ["Norge"]
        }
      };
      
      return new Response(
        JSON.stringify(response),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    // Prepare response with filter options
    const allTypes = [...new Set(foundations.map(f => f.organizationType).filter(Boolean))];
    const allCategories = [...new Set(foundations.map(f => f.mainCategory).filter(Boolean))];
    const allAreas = [...new Set(foundations.map(f => f.area).filter(Boolean))];
    
    const response = {
      items: filteredFoundations,
      totalCount: foundations.length,
      filters: {
        organizationTypes: allTypes,
        mainCategories: allCategories,
        areas: allAreas
      }
    };

    console.log(`[Foundation API] Returning ${filteredFoundations.length} of ${foundations.length} foundations`);
    
    return new Response(
      JSON.stringify(response),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[Foundation API] Error:", error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : "Unknown error",
        type: "foundation_scraper_error" 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});