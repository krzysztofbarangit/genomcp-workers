/**
 * GenomCP Workers - Standalone Cloudflare Worker
 * Direct API access to genomic databases - NO external MCP servers required
 */

import { Hono } from "hono";
import { cors } from "hono/cors";
import { BioThingsClient } from "./api-clients/biothings-client";
import { EnsemblClient } from "./api-clients/ensembl-client";
import { NCBIClient } from "./api-clients/ncbi-client";
import { ClinicalTrialsClient } from "./api-clients/clinical-trials-client";
import { PharmGKBClient } from "./api-clients/pharmgkb-client";
import { KVCache } from "./cache/kv-store";
import { diagnosisEndpoint } from "./api/diagnosis";
import { variantsEndpoint } from "./api/variants";
import { drugsEndpoint } from "./api/drugs";

export interface Env {
  VARIANT_CACHE: KVNamespace;
  GENE_CACHE: KVNamespace;
  VARIANT_REGISTRY: DurableObjectNamespace;

  // Environment
  ENVIRONMENT: string;

  // Optional API Keys
  NCI_API_KEY?: string;
  PHARMGKB_API_KEY?: string;
}

export interface AppContext {
  biothings: BioThingsClient;
  ensembl: EnsemblClient;
  ncbi: NCBIClient;
  clinicalTrials: ClinicalTrialsClient;
  pharmgkb: PharmGKBClient;
  variantCache: KVCache;
  geneCache: KVCache;
  variantRegistry: DurableObjectNamespace;
}

const app = new Hono<{ Bindings: Env; Variables: AppContext }>();

// Middleware: CORS
app.use("/*", cors({
  origin: "*",
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization"],
}));

// Middleware: Initialize API clients and caches
app.use("/*", async (c, next) => {
  const env = c.env;

  // Initialize direct API clients (no external MCP servers needed!)
  c.set("biothings", new BioThingsClient());
  c.set("ensembl", new EnsemblClient());
  c.set("ncbi", new NCBIClient());
  c.set("clinicalTrials", new ClinicalTrialsClient(env.NCI_API_KEY));
  c.set("pharmgkb", new PharmGKBClient({ api_key: env.PHARMGKB_API_KEY }));

  // Initialize caches
  c.set("variantCache", new KVCache(env.VARIANT_CACHE, "variants"));
  c.set("geneCache", new KVCache(env.GENE_CACHE, "genes"));
  c.set("variantRegistry", env.VARIANT_REGISTRY);

  await next();
});

// Health check endpoint
app.get("/health", async (c) => {
  const biothings = c.get("biothings");
  const ensembl = c.get("ensembl");
  const ncbi = c.get("ncbi");
  const clinicalTrials = c.get("clinicalTrials");
  const pharmgkb = c.get("pharmgkb");

  const health = {
    status: "healthy",
    environment: c.env.ENVIRONMENT || "development",
    timestamp: new Date().toISOString(),
    backends: {
      biothings: await biothings.healthCheck().catch(() => false),
      ensembl: await ensembl.healthCheck().catch(() => false),
      ncbi: await ncbi.healthCheck().catch(() => false),
      clinicalTrials: await clinicalTrials.healthCheck().catch(() => false),
      pharmgkb: await pharmgkb.healthCheck().catch(() => false)
    },
    note: "All APIs are public - no external MCP servers required!"
  };

  const allHealthy = Object.values(health.backends).every(v => v);
  return c.json(health, allHealthy ? 200 : 503);
});

// API Routes
app.route("/api/diagnosis", diagnosisEndpoint);
app.route("/api/variants", variantsEndpoint);
app.route("/api/drugs", drugsEndpoint);

// Root endpoint
app.get("/", (c) => {
  return c.json({
    name: "GenomCP Workers API",
    version: "2.0.0",
    description: "Standalone Cloudflare Worker for genomic diagnostics - Direct API access, NO external servers required",
    features: [
      "Direct BioThings Suite integration (MyVariant, MyGene, MyDisease, MyChem)",
      "Direct Ensembl REST API access",
      "Direct NCBI E-utilities access",
      "ClinicalTrials.gov and NCI CTS integration",
      "PharmGKB pharmacogenomics data",
      "Smart caching with KV and Durable Objects",
      "No external MCP servers needed!"
    ],
    endpoints: {
      health: "/health",
      diagnosis: "/api/diagnosis",
      variants: "/api/variants",
      drugs: "/api/drugs"
    },
    public_apis_used: [
      "MyVariant.info - variant annotations",
      "MyGene.info - gene information",
      "Ensembl REST API - genomic features",
      "NCBI E-utilities - PubMed, ClinVar, Gene",
      "ClinicalTrials.gov - clinical trials",
      "PharmGKB - drug response data"
    ]
  });
});

// Export the Durable Object class
export { VariantRegistry } from "./cache/variant-registry";

// Export the Worker
export default app;
