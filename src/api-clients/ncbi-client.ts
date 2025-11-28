/**
 * NCBI API Client - Direct API access
 * E-utilities and Datasets API - No authentication required
 */

export interface NCBIGeneInfo {
  uid: string;
  name: string;
  description: string;
  organism: {
    sci_name: string;
    common_name: string;
    tax_id: number;
  };
  chromosome: string;
  map_location?: string;
  gene_type?: string;
  summary?: string;
}

export class NCBIClient {
  private eutilsBaseUrl = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils";
  private datasetsBaseUrl = "https://api.ncbi.nlm.nih.gov/datasets/v2alpha";

  /**
   * Search gene by symbol using E-utilities
   */
  async searchGene(geneSymbol: string, organism: string = "human"): Promise<string[]> {
    try {
      const taxId = organism.toLowerCase() === "human" ? "9606" : "";
      const response = await fetch(
        `${this.eutilsBaseUrl}/esearch.fcgi?db=gene&term=${encodeURIComponent(geneSymbol)}[sym]+AND+${taxId}[taxid]&retmode=json`
      );

      if (!response.ok) {
        throw new Error(`NCBI search API error: ${response.status}`);
      }

      const data = await response.json();
      return data.esearchresult?.idlist || [];
    } catch (error) {
      console.error("Error searching gene:", error);
      return [];
    }
  }

  /**
   * Get gene summary using E-utilities
   */
  async getGeneSummary(geneId: string): Promise<any> {
    try {
      const response = await fetch(
        `${this.eutilsBaseUrl}/esummary.fcgi?db=gene&id=${geneId}&retmode=json`
      );

      if (!response.ok) {
        throw new Error(`NCBI summary API error: ${response.status}`);
      }

      const data = await response.json();
      return data.result?.[geneId] || null;
    } catch (error) {
      console.error("Error getting gene summary:", error);
      return null;
    }
  }

  /**
   * Get detailed gene info by symbol
   */
  async getGeneBySymbol(geneSymbol: string): Promise<NCBIGeneInfo | null> {
    const ids = await this.searchGene(geneSymbol);
    if (ids.length === 0) return null;

    const summary = await this.getGeneSummary(ids[0]);
    if (!summary) return null;

    return {
      uid: ids[0],
      name: summary.name || geneSymbol,
      description: summary.description || "",
      organism: {
        sci_name: summary.organism?.scientificname || "",
        common_name: summary.organism?.commonname || "",
        tax_id: summary.organism?.taxid || 0
      },
      chromosome: summary.chromosome || "",
      map_location: summary.maplocation,
      gene_type: summary.genetictype,
      summary: summary.summary
    };
  }

  /**
   * Search PubMed
   */
  async searchPubMed(query: string, maxResults: number = 20): Promise<string[]> {
    try {
      const response = await fetch(
        `${this.eutilsBaseUrl}/esearch.fcgi?db=pubmed&term=${encodeURIComponent(query)}&retmax=${maxResults}&retmode=json`
      );

      if (!response.ok) {
        throw new Error(`PubMed search API error: ${response.status}`);
      }

      const data = await response.json();
      return data.esearchresult?.idlist || [];
    } catch (error) {
      console.error("Error searching PubMed:", error);
      return [];
    }
  }

  /**
   * Get PubMed article summaries
   */
  async getPubMedSummaries(pmids: string[]): Promise<any> {
    try {
      const response = await fetch(
        `${this.eutilsBaseUrl}/esummary.fcgi?db=pubmed&id=${pmids.join(",")}&retmode=json`
      );

      if (!response.ok) {
        throw new Error(`PubMed summary API error: ${response.status}`);
      }

      const data = await response.json();
      return data.result || {};
    } catch (error) {
      console.error("Error getting PubMed summaries:", error);
      return {};
    }
  }

  /**
   * Search ClinVar for variants
   */
  async searchClinVar(query: string): Promise<string[]> {
    try {
      const response = await fetch(
        `${this.eutilsBaseUrl}/esearch.fcgi?db=clinvar&term=${encodeURIComponent(query)}&retmode=json&retmax=100`
      );

      if (!response.ok) {
        throw new Error(`ClinVar search API error: ${response.status}`);
      }

      const data = await response.json();
      return data.esearchresult?.idlist || [];
    } catch (error) {
      console.error("Error searching ClinVar:", error);
      return [];
    }
  }

  /**
   * Get ClinVar variant summaries
   */
  async getClinVarSummaries(ids: string[]): Promise<any> {
    try {
      const response = await fetch(
        `${this.eutilsBaseUrl}/esummary.fcgi?db=clinvar&id=${ids.join(",")}&retmode=json`
      );

      if (!response.ok) {
        throw new Error(`ClinVar summary API error: ${response.status}`);
      }

      const data = await response.json();
      return data.result || {};
    } catch (error) {
      console.error("Error getting ClinVar summaries:", error);
      return {};
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.eutilsBaseUrl}/einfo.fcgi?retmode=json`);
      return response.ok;
    } catch {
      return false;
    }
  }
}
