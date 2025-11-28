/**
 * Diagnosis API endpoints
 */

import { Hono } from "hono";
import { AppContext, Env } from "../index";
import { PatientData, VariantData } from "../types/patient";
import { DiagnosisResult } from "../types/diagnosis";
import { CACHE_TTL } from "../cache/kv-store";

const diagnosis = new Hono<{ Bindings: Env; Variables: AppContext }>();

/**
 * POST /api/diagnosis
 * Comprehensive genomic diagnosis
 */
diagnosis.post("/", async (c) => {
  try {
    const body = await c.req.json<{
      patient: PatientData;
      variants: VariantData[];
    }>();

    const { patient, variants } = body;

    if (!patient || !variants || variants.length === 0) {
      return c.json({ error: "Missing required fields: patient, variants" }, 400);
    }

    const biomcp = c.get("biomcp");
    const ensembl = c.get("ensembl");
    const ncbi = c.get("ncbi");
    const pharmgkb = c.get("pharmgkb");
    const variantCache = c.get("variantCache");
    const geneCache = c.get("geneCache");

    const diagnosisId = `dx_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    const sources: any[] = [];

    // Step 1: Map phenotype to gene candidates (with caching)
    const phenotypeCacheKey = `phenotype:${patient.phenotype.join(",")}`;
    const candidateGenes = await variantCache.getOrSet(
      phenotypeCacheKey,
      async () => {
        const result = await biomcp.mapPhenotypeToGenes(patient.phenotype);
        sources.push({
          source: "BioMCP",
          query_type: "phenotype_mapping",
          timestamp: new Date().toISOString(),
          cache_hit: false
        });
        return result;
      },
      { ttl: CACHE_TTL.GENE }
    );

    if (candidateGenes) {
      sources.push({
        source: "Cache",
        query_type: "phenotype_mapping",
        timestamp: new Date().toISOString(),
        cache_hit: true
      });
    }

    // Step 2: Variant interpretation (batch with caching)
    const variantInterpretations = await Promise.all(
      variants.map(async (variant) => {
        const cacheKey = `variant:${variant.hgvs}`;
        return variantCache.getOrSet(
          cacheKey,
          async () => {
            const result = await biomcp.interpretVariant({ hgvs: variant.hgvs });
            sources.push({
              source: "BioMCP",
              query_type: "variant_interpretation",
              timestamp: new Date().toISOString(),
              cache_hit: false
            });
            return result;
          },
          { ttl: CACHE_TTL.VARIANT }
        );
      })
    );

    // Step 3: Get gene information from Ensembl
    const uniqueGenes = [...new Set(variants.map(v => v.gene))];
    const geneInfo = await Promise.all(
      uniqueGenes.map(async (gene) => {
        const cacheKey = `gene:${gene}`;
        return geneCache.getOrSet(
          cacheKey,
          async () => {
            const result = await ensembl.getGeneInfo(gene);
            sources.push({
              source: "Ensembl",
              query_type: "gene_info",
              timestamp: new Date().toISOString(),
              cache_hit: false
            });
            return result;
          },
          { ttl: CACHE_TTL.GENE }
        );
      })
    );

    // Step 4: Cancer risk assessment
    const cancerRisk = await biomcp.assessCancerRisk({
      genes: uniqueGenes,
      variants: variants.map(v => v.hgvs),
      age: patient.age,
      family_history: patient.family_history
    });

    sources.push({
      source: "BioMCP",
      query_type: "cancer_risk",
      timestamp: new Date().toISOString(),
      cache_hit: false
    });

    // Step 5: Drug response profiling
    const drugResponse = await pharmgkb.getDrugResponse({
      genes: uniqueGenes,
      variants: variants.map(v => v.hgvs)
    });

    sources.push({
      source: "PharmGKB",
      query_type: "drug_response",
      timestamp: new Date().toISOString(),
      cache_hit: false
    });

    // Step 6: Construct diagnosis result
    const result: DiagnosisResult = {
      diagnosis_id: diagnosisId,
      timestamp: new Date().toISOString(),

      primary_diagnosis: {
        condition: candidateGenes?.diseases?.[0]?.name || "Genetic predisposition",
        confidence: candidateGenes?.diseases?.[0]?.confidence || 0.7,
        supporting_genes: uniqueGenes,
        supporting_variants: variantInterpretations
          .filter((v: any) => v.clinical_significance === "pathogenic")
          .map((v: any) => ({
            hgvs: v.hgvs,
            gene: v.gene_symbol,
            significance: v.acmg_classification
          }))
      },

      cancer_risk: {
        syndrome: cancerRisk.syndrome || "Unknown",
        lifetime_risk: cancerRisk.lifetime_risk || 0,
        actionable_variants: variantInterpretations
          .filter((v: any) => v.clinical_significance === "pathogenic")
          .map((v: any) => ({
            hgvs: v.hgvs,
            gene: v.gene_symbol,
            significance: v.acmg_classification
          })),
        surveillance_recommendations: cancerRisk.recommendations || []
      },

      drug_response: {
        medications: drugResponse.map((dr: any) => ({
          name: dr.drug_name,
          efficacy: "neutral",
          genetic_basis: dr.gene_associations.map((ga: any) => ga.gene),
          evidence_level: dr.gene_associations[0]?.evidence_level || "C"
        }))
      },

      interpretation: {
        summary: `Patient presents with ${patient.phenotype.join(", ")} and ${variants.length} genetic variants affecting ${uniqueGenes.join(", ")}`,
        actionable_items: [
          "Genetic counseling recommended",
          "Consider cascade testing for family members"
        ],
        follow_up_tests: ["Confirmatory testing in CLIA-certified lab"],
        genetic_counseling_recommended: true,
        evidence_level: "B"
      },

      sources
    };

    // Cache the diagnosis result
    await variantCache.set(`diagnosis:${diagnosisId}`, result, {
      ttl: CACHE_TTL.DIAGNOSIS
    });

    return c.json(result);

  } catch (error: any) {
    console.error("Diagnosis error:", error);
    return c.json({
      error: "Failed to generate diagnosis",
      message: error.message
    }, 500);
  }
});

/**
 * GET /api/diagnosis/:id
 * Retrieve cached diagnosis by ID
 */
diagnosis.get("/:id", async (c) => {
  const id = c.req.param("id");
  const variantCache = c.get("variantCache");

  const result = await variantCache.get<DiagnosisResult>(`diagnosis:${id}`);

  if (!result) {
    return c.json({ error: "Diagnosis not found" }, 404);
  }

  return c.json(result);
});

export { diagnosis as diagnosisEndpoint };
