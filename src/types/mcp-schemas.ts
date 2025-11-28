/**
 * MCP protocol schemas and types
 */

export interface MCPRequest {
  method: string;
  params: Record<string, any>;
}

export interface MCPResponse {
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

export interface MCPToolCall {
  tool: string;
  arguments: Record<string, any>;
  backend: "BioMCP" | "Ensembl" | "NCBI" | "PharmGKB";
}

export interface MCPServerConfig {
  url: string;
  api_key?: string;
  timeout?: number;
  retry_attempts?: number;
}

// BioMCP specific types
export interface BioMCPVariantResponse {
  hgvs: string;
  gene_symbol: string;
  clinical_significance: string;
  acmg_classification: string;
  gnomad_af?: number;
  clinvar_id?: string;
  disease_associations?: string[];
}

// Ensembl specific types
export interface EnsemblGeneResponse {
  gene_id: string;
  gene_symbol: string;
  description: string;
  chromosome: string;
  start: number;
  end: number;
  strand: number;
  biotype: string;
}

// NCBI specific types
export interface NCBIGeneResponse {
  gene_id: number;
  symbol: string;
  description: string;
  synonyms?: string[];
  chromosome: string;
  map_location?: string;
}

// PharmGKB specific types
export interface PharmGKBDrugResponse {
  drug_name: string;
  pharmgkb_id: string;
  gene_associations: {
    gene: string;
    variant: string;
    phenotype: string;
    evidence_level: string;
  }[];
}
