/**
 * Clinical Trials API Client
 * ClinicalTrials.gov - No auth required
 * NCI CTS API - Requires API key (optional)
 */

export interface ClinicalTrial {
  protocolSection: {
    identificationModule: {
      nctId: string;
      briefTitle: string;
      officialTitle?: string;
    };
    statusModule: {
      overallStatus: string;
      startDateStruct?: { date: string };
      completionDateStruct?: { date: string };
    };
    descriptionModule?: {
      briefSummary?: string;
      detailedDescription?: string;
    };
    conditionsModule?: {
      conditions: string[];
    };
    armsInterventionsModule?: {
      interventions: Array<{
        type: string;
        name: string;
        description?: string;
      }>;
    };
  };
}

export class ClinicalTrialsClient {
  private baseUrl = "https://clinicaltrials.gov/api/v2";
  private nciBaseUrl = "https://clinicaltrialsapi.cancer.gov/api/v2";
  private nciApiKey?: string;

  constructor(nciApiKey?: string) {
    this.nciApiKey = nciApiKey;
  }

  /**
   * Search ClinicalTrials.gov
   */
  async searchTrials(params: {
    condition?: string;
    intervention?: string;
    status?: string;
    pageSize?: number;
  }): Promise<{ studies: ClinicalTrial[]; totalCount: number }> {
    try {
      const queryParams = new URLSearchParams();

      if (params.condition) {
        queryParams.append("query.cond", params.condition);
      }
      if (params.intervention) {
        queryParams.append("query.intr", params.intervention);
      }
      if (params.status) {
        queryParams.append("filter.overallStatus", params.status);
      }
      queryParams.append("pageSize", String(params.pageSize || 20));

      const response = await fetch(
        `${this.baseUrl}/studies?${queryParams.toString()}`
      );

      if (!response.ok) {
        throw new Error(`ClinicalTrials API error: ${response.status}`);
      }

      const data = await response.json();
      return {
        studies: data.studies || [],
        totalCount: data.totalCount || 0
      };
    } catch (error) {
      console.error("Error searching trials:", error);
      return { studies: [], totalCount: 0 };
    }
  }

  /**
   * Get trial by NCT ID
   */
  async getTrialByNctId(nctId: string): Promise<ClinicalTrial | null> {
    try {
      const response = await fetch(
        `${this.baseUrl}/studies/${nctId}`
      );

      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error(`ClinicalTrials API error: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error getting trial:", error);
      return null;
    }
  }

  /**
   * Search NCI clinical trials (requires API key)
   */
  async searchNCITrials(params: {
    diseases?: string[];
    genes?: string[];
    biomarkers?: string[];
    status?: string;
    size?: number;
  }): Promise<any> {
    if (!this.nciApiKey) {
      console.warn("NCI API key not provided, skipping NCI trials search");
      return { trials: [], total: 0 };
    }

    try {
      const queryParams: any = {};

      if (params.diseases) {
        queryParams.diseases = params.diseases.join(",");
      }
      if (params.genes) {
        queryParams.gene = params.genes.join(",");
      }
      if (params.biomarkers) {
        queryParams.biomarkers = params.biomarkers.join(",");
      }
      if (params.status) {
        queryParams.current_trial_status = params.status;
      }
      queryParams.size = params.size || 20;

      const url = new URL(`${this.nciBaseUrl}/trials`);
      Object.keys(queryParams).forEach(key =>
        url.searchParams.append(key, queryParams[key])
      );

      const response = await fetch(url.toString(), {
        headers: {
          "x-api-key": this.nciApiKey
        }
      });

      if (!response.ok) {
        throw new Error(`NCI API error: ${response.status}`);
      }

      const data = await response.json();
      return {
        trials: data.trials || [],
        total: data.total || 0
      };
    } catch (error) {
      console.error("Error searching NCI trials:", error);
      return { trials: [], total: 0 };
    }
  }

  /**
   * Get NCI biomarkers
   */
  async getNCIBiomarkers(): Promise<any[]> {
    if (!this.nciApiKey) {
      return [];
    }

    try {
      const response = await fetch(`${this.nciBaseUrl}/biomarkers`, {
        headers: {
          "x-api-key": this.nciApiKey
        }
      });

      if (!response.ok) {
        throw new Error(`NCI biomarkers API error: ${response.status}`);
      }

      const data = await response.json();
      return data.biomarkers || [];
    } catch (error) {
      console.error("Error getting NCI biomarkers:", error);
      return [];
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/studies?pageSize=1`);
      return response.ok;
    } catch {
      return false;
    }
  }
}
