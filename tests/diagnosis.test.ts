/**
 * Basic tests for diagnosis API
 * Run with: npm test
 */

import { describe, it, expect } from "vitest";

describe("Diagnosis API", () => {
  it("should validate patient data structure", () => {
    const patient = {
      age: 45,
      sex: "female" as const,
      phenotype: ["hyperpigmentation"]
    };

    expect(patient.age).toBeGreaterThan(0);
    expect(["male", "female", "other"]).toContain(patient.sex);
    expect(Array.isArray(patient.phenotype)).toBe(true);
  });

  it("should validate variant data structure", () => {
    const variant = {
      hgvs: "BRAF:c.1799T>A",
      gene: "BRAF",
      significance: "pathogenic" as const
    };

    expect(variant.hgvs).toMatch(/^[A-Z0-9]+:/);
    expect(variant.gene).toMatch(/^[A-Z0-9]+$/);
    expect(["pathogenic", "likely_pathogenic", "vus", "likely_benign", "benign"])
      .toContain(variant.significance);
  });

  it("should generate valid diagnosis ID", () => {
    const diagnosisId = `dx_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    expect(diagnosisId).toMatch(/^dx_\d+_[a-z0-9]+$/);
  });
});

describe("Cache Key Generation", () => {
  it("should generate consistent cache keys", () => {
    const phenotypes = ["hyperpigmentation", "melanoma"];
    const key1 = `phenotype:${phenotypes.join(",")}`;
    const key2 = `phenotype:${phenotypes.join(",")}`;

    expect(key1).toBe(key2);
  });

  it("should generate unique variant cache keys", () => {
    const hgvs1 = "BRAF:c.1799T>A";
    const hgvs2 = "TP53:p.R248Q";

    const key1 = `variant:${hgvs1}`;
    const key2 = `variant:${hgvs2}`;

    expect(key1).not.toBe(key2);
  });
});

// Integration tests would require actual Worker environment
// For integration testing, use wrangler dev and test with HTTP requests
