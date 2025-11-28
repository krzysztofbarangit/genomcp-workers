/**
 * PharmGKB Client - Direct REST API access
 * Pharmacogenomics knowledge base
 * https://api.pharmgkb.org/v1
 * Most endpoints are public - optional API key for higher limits
 */

export interface PharmGKBDrugResponse {
  drug_name: string;
  pharmgkb_id: string;
  gene_associations: Array<{
    gene: string;
    variant: string;
    phenotype: string;
    evidence_level: string;
  }>;
}

export class PharmGKBClient {
  private baseUrl: string;
  private apiKey?: string;

  constructor(config: { url?: string; api_key?: string } = {}) {
    this.baseUrl = config.url || "https://api.pharmgkb.org/v1";
    this.apiKey = config.api_key;
  }

  private async request(endpoint: string, params: Record<string, any> = {}): Promise<any> {
    const url = new URL(`${this.baseUrl}${endpoint}`);

    // Add query parameters
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, String(value));
      }
    });

    const headers: Record<string, string> = {
      "Accept": "application/json"
    };

    if (this.apiKey) {
      headers["Authorization"] = `Bearer ${this.apiKey}`;
    }

    try {
      const response = await fetch(url.toString(), { headers });

      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error(`PharmGKB API error: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`PharmGKB request failed for ${endpoint}:`, error);
      throw error;
    }
  }

  /**
   * Get drug information by name or ID
   */
  async getDrug(drugNameOrId: string): Promise<any> {
    return this.request("/data/drug", {
      name: drugNameOrId,
      view: "base"
    });
  }

  /**
   * Get gene-drug associations (clinical annotations)
   */
  async getGeneDrugAssociations(geneSymbol: string): Promise<any> {
    return this.request("/data/clinicalAnnotation", {
      gene: geneSymbol,
      view: "base"
    });
  }

  /**
   * Get drug response based on variants
   */
  async getDrugResponse(params: {
    genes: string[];
    variants?: string[];
  }): Promise<PharmGKBDrugResponse[]> {
    // Query each gene for drug associations
    const results = await Promise.all(
      params.genes.map(async (gene) => {
        try {
          const associations = await this.getGeneDrugAssociations(gene);
          return {
            gene,
            associations: associations?.data || []
          };
        } catch (error) {
          console.error(`Error fetching drug response for gene ${gene}:`, error);
          return { gene, associations: [] };
        }
      })
    );

    // Transform to PharmGKBDrugResponse format
    const drugResponses: PharmGKBDrugResponse[] = [];

    for (const result of results) {
      if (result.associations.length > 0) {
        for (const assoc of result.associations) {
          drugResponses.push({
            drug_name: assoc.drug?.name || "Unknown",
            pharmgkb_id: assoc.id || "",
            gene_associations: [{
              gene: result.gene,
              variant: assoc.variant?.name || "N/A",
              phenotype: assoc.phenotype?.name || "N/A",
              evidence_level: assoc.evidenceLevel || "C"
            }]
          });
        }
      }
    }

    return drugResponses;
  }

  /**
   * Get variant annotations from PharmGKB
   */
  async getVariantAnnotation(variantId: string): Promise<any> {
    return this.request("/data/variant", {
      rsid: variantId,
      view: "base"
    });
  }

  /**
   * Get clinical guidelines for drugs
   */
  async getClinicalGuidelines(drugName: string): Promise<any> {
    return this.request("/data/guideline", {
      drug: drugName,
      view: "base"
    });
  }

  /**
   * Get phenotype information
   */
  async getPhenotype(phenotypeId: string): Promise<any> {
    return this.request("/data/phenotype", {
      id: phenotypeId,
      view: "base"
    });
  }

  /**
   * Search for chemicals/drugs
   */
  async searchChemicals(query: string): Promise<any> {
    return this.request("/data/chemical", {
      name: query,
      view: "base"
    });
  }

  /**
   * Get metabolizer status for specific genes
   * Simplified version - in production would need proper diplotype to phenotype mapping
   */
  async getMetabolizerStatus(params: {
    gene: string;
    variants: string[];
  }): Promise<{
    gene: string;
    phenotype: string;
    activity: string;
  }> {
    try {
      const associations = await this.getGeneDrugAssociations(params.gene);

      // Simplified logic - real implementation would map diplotypes to phenotypes
      return {
        gene: params.gene,
        phenotype: "normal_metabolizer",
        activity: "normal"
      };
    } catch (error) {
      console.error("Error getting metabolizer status:", error);
      return {
        gene: params.gene,
        phenotype: "unknown",
        activity: "unknown"
      };
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      // Use site/stats endpoint which doesn't require auth
      const response = await fetch(`${this.baseUrl}/site/stats`);
      return response.ok;
    } catch {
      return false;
    }
  }
}
