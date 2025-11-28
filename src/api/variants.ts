/**
 * Variants API endpoints - Using direct API clients
 */

import { Hono } from "hono";
import { AppContext, Env } from "../index";
import { CACHE_TTL } from "../cache/kv-store";

const variants = new Hono<{ Bindings: Env; Variables: AppContext }>();

/**
 * POST /api/variants/interpret
 * Interpret variants using BioThings MyVariant.info
 */
variants.post("/interpret", async (c) => {
  try {
    const body = await c.req.json<{
      variants: string[];  // HGVS notation
      includeEnsembl?: boolean;
      includeClinVar?: boolean;
    }>();

    const { variants: variantList, includeEnsembl = true, includeClinVar = true } = body;

    if (!variantList || variantList.length === 0) {
      return c.json({ error: "Missing required field: variants" }, 400);
    }

    const biothings = c.get("biothings");
    const ensembl = c.get("ensembl");
    const variantCache = c.get("variantCache");

    const results = await Promise.all(
      variantList.map(async (hgvs) => {
        const cacheKey = `variant:${hgvs}`;

        // Try cache first
        const cached = await variantCache.get(cacheKey);
        if (cached) {
          return { ...cached, source: "cache" };
        }

        // Fetch from BioThings MyVariant
        const variantData = await biothings.getVariant(hgvs);

        if (!variantData) {
          return {
            hgvs,
            error: "Variant not found",
            source: "biothings"
          };
        }

        const result: any = {
          hgvs,
          gene: variantData.gene?.symbol || "Unknown",
          source: "biothings",
          clinvar: variantData.clinvar ? {
            significance: variantData.clinvar.rcv?.[0]?.clinical_significance || "Unknown",
            review_status: variantData.clinvar.rcv?.[0]?.review_status,
            variant_id: variantData.clinvar.variant_id,
            allele_id: variantData.clinvar.allele_id
          } : null,
          gnomad: variantData.gnomad_genome ? {
            allele_frequency: variantData.gnomad_genome.af,
            allele_count: variantData.gnomad_genome.ac,
            allele_number: variantData.gnomad_genome.an
          } : null,
          cadd: variantData.cadd ? {
            phred_score: variantData.cadd.phred
          } : null,
          predictions: {
            revel: variantData.dbnsfp?.revel?.score,
            sift: {
              score: variantData.dbnsfp?.sift?.score,
              prediction: variantData.dbnsfp?.sift?.pred
            },
            polyphen2: {
              score: variantData.dbnsfp?.polyphen2?.hdiv?.score,
              prediction: variantData.dbnsfp?.polyphen2?.hdiv?.pred
            }
          }
        };

        // Optionally add Ensembl data
        if (includeEnsembl && variantData._id) {
          const ensemblVariant = await ensembl.getVariantById(variantData._id).catch(() => null);
          if (ensemblVariant) {
            result.ensembl = {
              id: ensemblVariant.id,
              consequence: ensemblVariant.most_severe_consequence,
              maf: ensemblVariant.MAF,
              clinical_significance: ensemblVariant.clinical_significance
            };
          }
        }

        // Store in cache
        await variantCache.set(cacheKey, result, { ttl: CACHE_TTL.VARIANT });

        return result;
      })
    );

    return c.json({
      count: results.length,
      variants: results,
      note: "Data from MyVariant.info (BioThings Suite) + Ensembl"
    });

  } catch (error: any) {
    console.error("Variant interpretation error:", error);
    return c.json({
      error: "Failed to interpret variants",
      message: error.message
    }, 500);
  }
});

/**
 * GET /api/variants/:hgvs
 * Get single variant information
 */
variants.get("/:hgvs", async (c) => {
  const hgvs = decodeURIComponent(c.req.param("hgvs"));
  const variantCache = c.get("variantCache");
  const biothings = c.get("biothings");

  const cacheKey = `variant:${hgvs}`;

  const result = await variantCache.getOrSet(
    cacheKey,
    async () => {
      const variantData = await biothings.getVariant(hgvs);
      if (!variantData) {
        throw new Error("Variant not found");
      }
      return {
        hgvs,
        gene: variantData.gene?.symbol || "Unknown",
        clinvar: variantData.clinvar,
        gnomad: variantData.gnomad_genome,
        cadd: variantData.cadd,
        predictions: variantData.dbnsfp,
        source: "biothings"
      };
    },
    { ttl: CACHE_TTL.VARIANT }
  );

  return c.json(result);
});

/**
 * POST /api/variants/search
 * Search variants by query
 */
variants.post("/search", async (c) => {
  try {
    const body = await c.req.json<{
      query: string;
      size?: number;
    }>();

    const { query, size = 10 } = body;

    if (!query) {
      return c.json({ error: "Missing required field: query" }, 400);
    }

    const biothings = c.get("biothings");
    const results = await biothings.searchVariants(query, size);

    return c.json({
      query,
      total: results.total || 0,
      hits: results.hits || [],
      source: "MyVariant.info"
    });

  } catch (error: any) {
    console.error("Variant search error:", error);
    return c.json({
      error: "Failed to search variants",
      message: error.message
    }, 500);
  }
});

/**
 * GET /api/variants/registry/stats
 * Get variant registry statistics
 */
variants.get("/registry/stats", async (c) => {
  const variantRegistry = c.get("variantRegistry");

  // Use a stable ID for global stats
  const registryId = variantRegistry.idFromName("global-stats");
  const registryStub = variantRegistry.get(registryId);

  const response = await registryStub.fetch(
    new Request("https://dummy/stats")
  );

  if (!response.ok) {
    return c.json({ error: "Failed to get registry stats" }, 500);
  }

  const stats = await response.json();
  return c.json(stats);
});

export { variants as variantsEndpoint };
