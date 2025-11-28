/**
 * Drug response API endpoints
 */

import { Hono } from "hono";
import { AppContext, Env } from "../index";
import { CACHE_TTL } from "../cache/kv-store";

const drugs = new Hono<{ Bindings: Env; Variables: AppContext }>();

/**
 * POST /api/drugs/response
 * Get drug response predictions based on genetics
 */
drugs.post("/response", async (c) => {
  try {
    const body = await c.req.json<{
      genes: string[];
      variants?: string[];
    }>();

    const { genes, variants } = body;

    if (!genes || genes.length === 0) {
      return c.json({ error: "Missing required field: genes" }, 400);
    }

    const biomcp = c.get("biomcp");
    const pharmgkb = c.get("pharmgkb");
    const geneCache = c.get("geneCache");

    const cacheKey = `drug_response:${genes.sort().join(",")}`;

    const response = await geneCache.getOrSet(
      cacheKey,
      async () => {
        // Get drug response from both sources
        const [biomcpResponse, pharmgkbResponse] = await Promise.all([
          biomcp.getDrugResponse({ genes, variants }),
          pharmgkb.getDrugResponse({ genes, variants })
        ]);

        return {
          biomcp: biomcpResponse,
          pharmgkb: pharmgkbResponse,
          combined: [
            ...(biomcpResponse.medications || []),
            ...pharmgkbResponse.map((pr: any) => ({
              name: pr.drug_name,
              drug_class: "pharmacogenomics",
              efficacy: "neutral",
              genetic_basis: pr.gene_associations.map((ga: any) => ga.gene),
              evidence_level: pr.gene_associations[0]?.evidence_level || "C",
              pharmgkb_id: pr.pharmgkb_id
            }))
          ]
        };
      },
      { ttl: CACHE_TTL.DRUG }
    );

    return c.json(response);

  } catch (error: any) {
    console.error("Drug response error:", error);
    return c.json({
      error: "Failed to get drug response",
      message: error.message
    }, 500);
  }
});

/**
 * GET /api/drugs/:drugName
 * Get drug information from PharmGKB
 */
drugs.get("/:drugName", async (c) => {
  const drugName = c.req.param("drugName");
  const pharmgkb = c.get("pharmgkb");
  const geneCache = c.get("geneCache");

  const cacheKey = `drug:${drugName}`;

  const drug = await geneCache.getOrSet(
    cacheKey,
    async () => {
      return await pharmgkb.getDrug(drugName);
    },
    { ttl: CACHE_TTL.DRUG }
  );

  return c.json(drug);
});

/**
 * GET /api/drugs/guidelines/:drugName
 * Get clinical guidelines for a drug
 */
drugs.get("/guidelines/:drugName", async (c) => {
  const drugName = c.req.param("drugName");
  const pharmgkb = c.get("pharmgkb");
  const geneCache = c.get("geneCache");

  const cacheKey = `drug_guidelines:${drugName}`;

  const guidelines = await geneCache.getOrSet(
    cacheKey,
    async () => {
      return await pharmgkb.getClinicalGuidelines(drugName);
    },
    { ttl: CACHE_TTL.DRUG }
  );

  return c.json(guidelines);
});

/**
 * POST /api/drugs/metabolizer
 * Get metabolizer status for specific genes
 */
drugs.post("/metabolizer", async (c) => {
  try {
    const body = await c.req.json<{
      gene: string;
      variants: string[];
    }>();

    const { gene, variants } = body;

    if (!gene) {
      return c.json({ error: "Missing required field: gene" }, 400);
    }

    const pharmgkb = c.get("pharmgkb");

    const status = await pharmgkb.getMetabolizerStatus({ gene, variants: variants || [] });

    return c.json(status);

  } catch (error: any) {
    console.error("Metabolizer status error:", error);
    return c.json({
      error: "Failed to get metabolizer status",
      message: error.message
    }, 500);
  }
});

export { drugs as drugsEndpoint };
