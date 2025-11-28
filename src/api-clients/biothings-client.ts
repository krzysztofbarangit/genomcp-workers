/**
 * BioThings Suite Client - Direct API access
 * MyVariant.info, MyGene.info, MyDisease.info, MyChem.info
 * No authentication required
 */

export interface VariantAnnotation {
  _id: string;
  hgvs?: string;
  clinvar?: {
    rcv?: {
      clinical_significance?: string;
      accession?: string;
      review_status?: string;
      conditions?: Array<{ name: string }>;
    }[];
    variant_id?: number;
    allele_id?: number;
  };
  gnomad_genome?: {
    af?: number;
    ac?: number;
    an?: number;
  };
  cadd?: {
    phred?: number;
  };
  dbnsfp?: {
    revel?: { score?: number };
    sift?: { score?: number; pred?: string };
    polyphen2?: { hdiv?: { score?: number; pred?: string } };
  };
  gene?: {
    geneid?: string;
    symbol?: string;
  };
}

export interface GeneInfo {
  _id: string;
  symbol: string;
  name: string;
  taxid: number;
  entrezgene: number;
  ensembl?: {
    gene: string;
    transcript: string[];
  };
  genomic_pos?: {
    chr: string;
    start: number;
    end: number;
    strand: number;
  };
  summary?: string;
  type_of_gene?: string;
}

export class BioThingsClient {
  private variantBaseUrl = "https://myvariant.info/v1";
  private geneBaseUrl = "https://mygene.info/v3";
  private diseaseBaseUrl = "https://mydisease.info/v1";
  private chemBaseUrl = "https://mychem.info/v1";

  /**
   * Query variant annotations by HGVS
   */
  async getVariant(hgvs: string): Promise<VariantAnnotation | null> {
    try {
      const response = await fetch(
        `${this.variantBaseUrl}/variant/${encodeURIComponent(hgvs)}?fields=clinvar,gnomad_genome,cadd,dbnsfp,gene`
      );

      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error(`MyVariant API error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error fetching variant:", error);
      return null;
    }
  }

  /**
   * Batch query variants
   */
  async getVariantsBatch(hgvsList: string[]): Promise<VariantAnnotation[]> {
    try {
      const response = await fetch(`${this.variantBaseUrl}/variant`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: hgvsList,
          fields: "clinvar,gnomad_genome,cadd,dbnsfp,gene"
        })
      });

      if (!response.ok) {
        throw new Error(`MyVariant batch API error: ${response.status}`);
      }

      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error("Error fetching variants batch:", error);
      return [];
    }
  }

  /**
   * Search variants by query
   */
  async searchVariants(query: string, size: number = 10): Promise<any> {
    try {
      const response = await fetch(
        `${this.variantBaseUrl}/query?q=${encodeURIComponent(query)}&size=${size}&fields=clinvar,gnomad_genome,gene`
      );

      if (!response.ok) {
        throw new Error(`MyVariant search API error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error searching variants:", error);
      return { hits: [] };
    }
  }

  /**
   * Get gene information by symbol or ID
   */
  async getGene(geneSymbol: string): Promise<GeneInfo | null> {
    try {
      const response = await fetch(
        `${this.geneBaseUrl}/gene/${encodeURIComponent(geneSymbol)}?species=human`
      );

      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error(`MyGene API error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error fetching gene:", error);
      return null;
    }
  }

  /**
   * Batch query genes
   */
  async getGenesBatch(geneSymbols: string[]): Promise<GeneInfo[]> {
    try {
      const response = await fetch(`${this.geneBaseUrl}/gene`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ids: geneSymbols,
          species: "human"
        })
      });

      if (!response.ok) {
        throw new Error(`MyGene batch API error: ${response.status}`);
      }

      const data = await response.json();
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error("Error fetching genes batch:", error);
      return [];
    }
  }

  /**
   * Search genes by query
   */
  async searchGenes(query: string, size: number = 10): Promise<any> {
    try {
      const response = await fetch(
        `${this.geneBaseUrl}/query?q=${encodeURIComponent(query)}&species=human&size=${size}`
      );

      if (!response.ok) {
        throw new Error(`MyGene search API error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error searching genes:", error);
      return { hits: [] };
    }
  }

  /**
   * Get disease information
   */
  async getDisease(diseaseId: string): Promise<any> {
    try {
      const response = await fetch(
        `${this.diseaseBaseUrl}/disease/${encodeURIComponent(diseaseId)}`
      );

      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error(`MyDisease API error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error fetching disease:", error);
      return null;
    }
  }

  /**
   * Search diseases
   */
  async searchDiseases(query: string, size: number = 10): Promise<any> {
    try {
      const response = await fetch(
        `${this.diseaseBaseUrl}/query?q=${encodeURIComponent(query)}&size=${size}`
      );

      if (!response.ok) {
        throw new Error(`MyDisease search API error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error searching diseases:", error);
      return { hits: [] };
    }
  }

  /**
   * Get chemical/drug information
   */
  async getChem(chemId: string): Promise<any> {
    try {
      const response = await fetch(
        `${this.chemBaseUrl}/chem/${encodeURIComponent(chemId)}`
      );

      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error(`MyChem API error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error fetching chem:", error);
      return null;
    }
  }

  /**
   * Search chemicals/drugs
   */
  async searchChems(query: string, size: number = 10): Promise<any> {
    try {
      const response = await fetch(
        `${this.chemBaseUrl}/query?q=${encodeURIComponent(query)}&size=${size}`
      );

      if (!response.ok) {
        throw new Error(`MyChem search API error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error searching chems:", error);
      return { hits: [] };
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.variantBaseUrl}/metadata`);
      return response.ok;
    } catch {
      return false;
    }
  }
}
