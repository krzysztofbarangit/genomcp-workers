/**
 * Ensembl REST API Client - Direct API access
 * No authentication required
 * https://rest.ensembl.org
 */

export interface EnsemblGene {
  id: string;
  display_name: string;
  description: string;
  biotype: string;
  start: number;
  end: number;
  strand: number;
  seq_region_name: string;
  assembly_name: string;
}

export interface EnsemblVariant {
  id: string;
  seq_region_name: string;
  start: number;
  end: number;
  allele_string: string;
  most_severe_consequence: string;
  MAF?: number;
  clinical_significance?: string[];
}

export class EnsemblClient {
  private baseUrl = "https://rest.ensembl.org";
  private headers = { "Content-Type": "application/json" };

  /**
   * Lookup gene by symbol
   */
  async lookupGeneBySymbol(symbol: string, species: string = "human"): Promise<EnsemblGene | null> {
    try {
      const response = await fetch(
        `${this.baseUrl}/lookup/symbol/${species}/${symbol}?expand=0`,
        { headers: this.headers }
      );

      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error(`Ensembl API error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error looking up gene:", error);
      return null;
    }
  }

  /**
   * Lookup gene by Ensembl ID
   */
  async lookupGeneById(id: string): Promise<EnsemblGene | null> {
    try {
      const response = await fetch(
        `${this.baseUrl}/lookup/id/${id}?expand=0`,
        { headers: this.headers }
      );

      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error(`Ensembl API error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error looking up gene by ID:", error);
      return null;
    }
  }

  /**
   * Batch lookup genes
   */
  async lookupGenesBatch(ids: string[]): Promise<Record<string, EnsemblGene>> {
    try {
      const response = await fetch(`${this.baseUrl}/lookup/id`, {
        method: "POST",
        headers: this.headers,
        body: JSON.stringify({ ids })
      });

      if (!response.ok) {
        throw new Error(`Ensembl batch API error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error batch looking up genes:", error);
      return {};
    }
  }

  /**
   * Get variants for a gene
   */
  async getVariantsForGene(geneId: string): Promise<EnsemblVariant[]> {
    try {
      const response = await fetch(
        `${this.baseUrl}/overlap/id/${geneId}?feature=variation`,
        { headers: this.headers }
      );

      if (!response.ok) {
        throw new Error(`Ensembl variants API error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error getting variants:", error);
      return [];
    }
  }

  /**
   * Get variant by ID
   */
  async getVariantById(variantId: string, species: string = "human"): Promise<EnsemblVariant | null> {
    try {
      const response = await fetch(
        `${this.baseUrl}/variation/${species}/${variantId}?content-type=application/json`,
        { headers: this.headers }
      );

      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error(`Ensembl variant API error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error getting variant:", error);
      return null;
    }
  }

  /**
   * Get transcripts for a gene
   */
  async getTranscripts(geneId: string): Promise<any[]> {
    try {
      const response = await fetch(
        `${this.baseUrl}/lookup/id/${geneId}?expand=1`,
        { headers: this.headers }
      );

      if (!response.ok) {
        throw new Error(`Ensembl transcripts API error: ${response.status}`);
      }

      const data = await response.json();
      return data.Transcript || [];
    } catch (error) {
      console.error("Error getting transcripts:", error);
      return [];
    }
  }

  /**
   * Get sequence for a region
   */
  async getSequence(region: string, species: string = "human"): Promise<string | null> {
    try {
      const response = await fetch(
        `${this.baseUrl}/sequence/region/${species}/${region}?content-type=text/plain`
      );

      if (!response.ok) {
        throw new Error(`Ensembl sequence API error: ${response.status}`);
      }

      return await response.text();
    } catch (error) {
      console.error("Error getting sequence:", error);
      return null;
    }
  }

  /**
   * Get phenotype associations
   */
  async getPhenotypes(geneId: string): Promise<any[]> {
    try {
      const response = await fetch(
        `${this.baseUrl}/phenotype/gene/homo_sapiens/${geneId}`,
        { headers: this.headers }
      );

      if (!response.ok) {
        return [];
      }

      return await response.json();
    } catch (error) {
      console.error("Error getting phenotypes:", error);
      return [];
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/info/ping`, {
        headers: this.headers
      });
      const data = await response.json();
      return data.ping === 1;
    } catch {
      return false;
    }
  }
}
