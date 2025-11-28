/**
 * Patient data types for genomic diagnosis
 */

export interface PatientData {
  patient_id?: string;
  age: number;
  sex: "male" | "female" | "other";
  ethnicity?: string;
  phenotype: string[];
  family_history?: FamilyHistory;
  medical_history?: string[];
  current_medications?: string[];
}

export interface FamilyHistory {
  cancer_type?: string;
  affected_relatives?: number;
  inheritance_pattern?: "autosomal_dominant" | "autosomal_recessive" | "x_linked" | "unknown";
  age_of_onset?: number;
}

export interface VariantData {
  hgvs: string;
  gene: string;
  chromosome?: string;
  position?: number;
  ref?: string;
  alt?: string;
  significance?: "pathogenic" | "likely_pathogenic" | "vus" | "likely_benign" | "benign";
  zygosity?: "heterozygous" | "homozygous" | "hemizygous";
  allele_frequency?: number;
  inheritance?: "de_novo" | "inherited" | "unknown";
}
