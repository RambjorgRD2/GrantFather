
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface GrantsRequestBody {
  q?: string;
  minAmount?: number | null;
  maxAmount?: number | null;
  deadlineBefore?: string | null; // ISO date string
  region?: string | null;
  eligibility?: string[] | null;
  warmup?: boolean;
}

type GrantItem = {
  id: string;
  name: string;
  shortDescription: string;
  deadline: string | null;
  fundingMin: number | null;
  fundingMax: number | null;
  region: string | null;
  eligibility: string[];
  applyUrl: string;
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const APIFY_TOKEN = Deno.env.get("APIFY_TOKEN");

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const startUrl = "https://stiftelsesforeningen.no/medlemmer/stiftelser";
const CACHE_KEY = `stiftelser-directory:${startUrl}`;
const CACHE_TTL_HOURS = 6; // adjust if needed

async function getCache() {
  const { data, error } = await supabaseAdmin
    .from("scrape_cache")
    .select("*")
    .eq("cache_key", CACHE_KEY)
    .maybeSingle();

  if (error) {
    console.error("getCache error:", error);
    return null;
  }
  return data as {
    cache_key: string;
    source_url: string;
    items: unknown;
    dataset_id?: string | null;
    actor_run_id?: string | null;
    refreshed_at: string;
  } | null;
}

async function setCache(payload: {
  items?: GrantItem[] | null;
  dataset_id?: string | null;
  actor_run_id?: string | null;
}) {
  const { error } = await supabaseAdmin
    .from("scrape_cache")
    .upsert({
      cache_key: CACHE_KEY,
      source_url: startUrl,
      items: payload.items ?? null,
      dataset_id: payload.dataset_id ?? null,
      actor_run_id: payload.actor_run_id ?? null,
      refreshed_at: new Date().toISOString(),
    });

  if (error) {
    console.error("setCache error:", error);
  }
}

function isFresh(refreshedAt: string, ttlHours: number) {
  const refreshed = new Date(refreshedAt).getTime();
  const ageMs = Date.now() - refreshed;
  return ageMs < ttlHours * 60 * 60 * 1000;
}

async function runScrape(): Promise<{ datasetId?: string; runId?: string }> {
  if (!APIFY_TOKEN) {
    throw new Error("Missing APIFY_TOKEN secret in project settings");
  }

  const pageFunction = `async function pageFunction(context) {
    const { request, log, saveData } = context;
    try {
      const base = request.loadedUrl || request.url;
      log.info('Processing page: ' + request.url);

      // Target specific CSS class structure for member items
      const memberItems = document.querySelectorAll('.memberItem_memberItem__j_OnM');
      log.info('Found ' + memberItems.length + ' member items with target class');

      if (memberItems.length === 0) {
        log.warning('No member items found with class memberItem_memberItem__j_OnM, falling back to generic selectors');
        // Fallback to original logic
        const container = document.querySelector('.entry-content, main, .content, .site-main') || document.body;
        const links = container.querySelectorAll('a[href]');
        
        links.forEach((el) => {
          try {
            const name = el.textContent?.trim() || '';
            const href = el.getAttribute('href') || '';
            const abs = href ? (href.startsWith('http') ? href : new URL(href, base).href) : null;

            if (!name || !abs) return;
            if (abs.startsWith('mailto:') || abs.startsWith('tel:') || abs.startsWith('#')) return;

            const parent = el.closest('li, p, article, .wp-block-group, .member, .entry') || el.parentElement;
            let snippet = parent?.textContent?.trim().replace(/\s+/g, ' ').slice(0, 300) || '';
            if (!snippet || snippet.length < 10) {
              snippet = el.parentElement?.textContent?.trim().replace(/\s+/g, ' ').slice(0, 300) || 'Member organization';
            }

            saveData({ name, url: abs, source: request.url, content: snippet, type: 'fallback' });
          } catch (linkError) {
            log.warning('Error processing fallback link:', linkError.message);
          }
        });
        return;
      }

      const seen = new Set();
      
      memberItems.forEach((memberItem, index) => {
        try {
          log.info('Processing member item ' + (index + 1) + '/' + memberItems.length);
          
          // Extract main member item data
          const memberName = memberItem.querySelector('h3, h2, .title, .name')?.textContent?.trim() || 
                            memberItem.querySelector('a')?.textContent?.trim() || 
                            'Member ' + (index + 1);
          
          // Get description from various possible locations
          let description = '';
          const descElements = memberItem.querySelectorAll('p, .description, .excerpt, .content');
          if (descElements.length > 0) {
            description = Array.from(descElements)
              .map(el => el.textContent?.trim())
              .filter(text => text && text.length > 10)
              .join(' ')
              .replace(/\s+/g, ' ')
              .slice(0, 500);
          }
          
          if (!description) {
            description = memberItem.textContent?.trim().replace(/\s+/g, ' ').slice(0, 300) || 'Foundation member organization';
          }

          // Extract all links within this member item
          const memberLinks = memberItem.querySelectorAll('a[href]');
          let hasValidLink = false;

          memberLinks.forEach((link) => {
            try {
              const href = link.getAttribute('href') || '';
              const linkText = link.textContent?.trim() || '';
              const abs = href ? (href.startsWith('http') ? href : new URL(href, base).href) : null;

              if (!abs || abs.startsWith('mailto:') || abs.startsWith('tel:') || abs.startsWith('#')) return;

              // Use member name if link text is generic
              const finalName = (linkText && linkText.length > 3 && !linkText.toLowerCase().includes('read more')) 
                ? linkText : memberName;

              const key = finalName + '|' + abs;
              if (seen.has(key)) return;
              seen.add(key);

              saveData({
                name: finalName,
                url: abs,
                source: request.url,
                content: description,
                type: 'member_item',
                memberIndex: index
              });
              
              hasValidLink = true;
            } catch (linkError) {
              log.warning('Error processing member link:', linkError.message);
            }
          });

          // If no valid links found in member item, create entry with member name and fallback URL
          if (!hasValidLink && memberName) {
            const key = memberName + '|' + base;
            if (!seen.has(key)) {
              seen.add(key);
              saveData({
                name: memberName,
                url: base,
                source: request.url,
                content: description,
                type: 'member_item_no_link',
                memberIndex: index
              });
            }
          }

          // Extract any additional structured data from sub-elements
          const contactInfo = memberItem.querySelector('.contact, .email, .phone, .address');
          if (contactInfo) {
            const contactText = contactInfo.textContent?.trim();
            if (contactText && contactText.length > 5) {
              description += ' Contact: ' + contactText.slice(0, 100);
            }
          }

          // Look for any category or type indicators
          const category = memberItem.querySelector('.category, .type, .sector');
          if (category) {
            const categoryText = category.textContent?.trim();
            if (categoryText && categoryText.length > 2) {
              description += ' Sector: ' + categoryText.slice(0, 50);
            }
          }

        } catch (memberError) {
          log.warning('Error processing member item ' + index + ':', memberError.message);
        }
      });

      log.info('Processed ' + memberItems.length + ' member items, extracted ' + seen.size + ' unique entries');
      
    } catch (e) {
      log.error('Failed on ' + request.url + ': ' + (e && e.message ? e.message : e));
    }
  }`;

  const runResp = await fetch(
    `https://api.apify.com/v2/acts/apify~web-scraper/runs?token=${APIFY_TOKEN}&waitForFinish=120&memory=512`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        startUrls: [{ url: startUrl }],
        maxRequestsPerCrawl: 1,
        pageFunction,
        proxyConfiguration: { useApifyProxy: true },
        ignoreSslErrors: true,
        requestHandlerTimeoutSecs: 30,
      }),
    }
  );

  if (!runResp.ok) {
    const txt = await runResp.text();
    console.error("Apify run start failed:", txt);
    throw new Error("Failed to start Apify run");
  }

  const runData = await runResp.json();
  const datasetId = runData?.data?.defaultDatasetId || runData?.data?.defaultDataset?.id;
  const runId = runData?.data?.id;

  if (!datasetId) {
    console.error("Apify: missing dataset id", runData);
    throw new Error("No dataset returned from Apify");
  }

  return { datasetId, runId };
}

function mapRawToGrants(rawItems: Array<{
  name?: string;
  url?: string;
  source?: string;
  text?: string;
  content?: string;
}>): GrantItem[] {
  return rawItems.map((it, idx) => ({
    id: `${idx}-${(it.name || it.url || '').slice(0, 40)}`,
    name: it.name || (it.url ? new URL(it.url).hostname : "Unknown"),
    shortDescription: it.content || it.text || "Foundation / member organization",
    deadline: null,
    fundingMin: null,
    fundingMax: null,
    region: "NO",
    eligibility: [],
    applyUrl: it.url || it.source || startUrl,
  }));
}

async function fetchDatasetFiltered(datasetId: string, q?: string, chunkSize = 200): Promise<GrantItem[]> {
  if (!APIFY_TOKEN) throw new Error("Missing APIFY_TOKEN secret in project settings");
  let offset = 0;
  const results: GrantItem[] = [];

  while (true) {
    const url = `https://api.apify.com/v2/datasets/${datasetId}/items?clean=true&format=json&limit=${chunkSize}&offset=${offset}&token=${APIFY_TOKEN}`;
    const resp = await fetch(url);
    if (!resp.ok) {
      const txt = await resp.text();
      console.error("Apify dataset chunk fetch failed:", txt);
      throw new Error("Failed to fetch dataset items (chunk)");
    }
    const raw = (await resp.json()) as Array<{
      name?: string;
      url?: string;
      source?: string;
      text?: string;
      content?: string;
    }>;

    if (!raw.length) break;

    const grantsChunk = mapRawToGrants(raw);
    const filteredChunk = filterItems(grantsChunk, q);
    results.push(...filteredChunk);

    if (raw.length < chunkSize) break;
    offset += chunkSize;
  }

  if (results.length === 0) {
    // Provide a small fallback item to avoid empty UI
    return filterItems([
      {
        id: "fallback-1",
        name: "Stiftelsesforeningen members directory",
        shortDescription: "Directory of Norwegian foundations and member organizations",
        deadline: null,
        fundingMin: null,
        fundingMax: null,
        region: "NO",
        eligibility: [],
        applyUrl: startUrl,
      },
    ], q);
  }

  return results;
}

function filterItems(items: GrantItem[], q?: string) {
  const query = (q || "").toLowerCase().trim();
  if (!query) return items;
  return items.filter((g) =>
    g.name.toLowerCase().includes(query) ||
    (g.shortDescription || "").toLowerCase().includes(query)
  );
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Use POST" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = (await req.json()) as GrantsRequestBody;

    // Warmup: ensure cache is fresh; return minimal info fast if already fresh
    if (body.warmup) {
      const existing = await getCache();
      if (existing && isFresh(existing.refreshed_at, CACHE_TTL_HOURS)) {
        return new Response(
          JSON.stringify({ ok: true, warmed: false, cachedAt: existing.refreshed_at }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Run scrape and store results (metadata only)
      const { datasetId, runId } = await runScrape();
      await setCache({ items: null, dataset_id: datasetId, actor_run_id: runId });

      return new Response(
        JSON.stringify({ ok: true, warmed: true, datasetId }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Regular search: use fresh dataset chunks if available, otherwise scrape now
    const cached = await getCache();

    if (cached && isFresh(cached.refreshed_at, CACHE_TTL_HOURS) && cached.dataset_id) {
      const items = await fetchDatasetFiltered(cached.dataset_id as string, body.q);
      return new Response(
        JSON.stringify({ items }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (cached && Array.isArray(cached.items) && (cached.items as any[]).length) {
      const filtered = filterItems(cached.items as GrantItem[], body.q);
      return new Response(
        JSON.stringify({ items: filtered }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // No usable cache: scrape now, store metadata, then chunk-fetch filtered results
    const { datasetId, runId } = await runScrape();
    await setCache({ items: null, dataset_id: datasetId, actor_run_id: runId });

    const items = datasetId ? await fetchDatasetFiltered(datasetId, body.q) : [];
    return new Response(
      JSON.stringify({ items }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("grants-search error:", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message || "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
