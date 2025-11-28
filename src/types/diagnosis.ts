/**
 * Diagnosis result types
 */

import { VariantData } from "./patient";

export interface DiagnosisResult {
  diagnosis_id: string;
  timestamp: string;

  primary_diagnosis: {
    condition: string;
    confidence: number; // 0-1
    supporting_genes: string[];
    supporting_variants: VariantData[];
    omim_ids?: string[];
  };

  cancer_risk?: {
    syndrome: string;
    lifetime_risk: number; // percentage
    actionable_variants: VariantData[];
    surveillance_recommendations: string[];
    associated_cancers?: string[];
  };

  drug_response?: {
    medications: DrugResponse[];
  };

  interpretation: {
    summary: string;
    actionable_items: string[];
    follow_up_tests: string[];
    genetic_counseling_recommended: boolean;
    evidence_level: "A" | "B" | "C" | "D";
  };

  sources: DataSource[];
}

export interface DrugResponse {
  name: string;
  drug_class?: string;
  efficacy: "likely_responsive" | "neutral" | "likely_resistant";
  metabolizer_phenotype?: "ultra_rapid" | "rapid" | "normal" | "slow" | "ultra_slow";
  genetic_basis: string[];
  evidence_level: "A" | "B" | "C" | "D";
  pharmgkb_id?: string;
  dosing_recommendation?: string;
}

export interface DataSource {
  source: "BioMCP" | "Ensembl" | "NCBI" | "PharmGKB" | "Cache";
  query_type: string;
  timestamp: string;
  cache_hit: boolean;
}
