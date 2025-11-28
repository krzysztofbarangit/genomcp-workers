/**
 * Durable Object for persistent variant registry
 * Prevents duplicate API calls across Worker instances
 */

export interface VariantEntry {
  hgvs: string;
  gene: string;
  interpretation: any;
  sources: string[];
  created_at: number;
  updated_at: number;
  access_count: number;
}

export class VariantRegistry {
  private state: DurableObjectState;
  private variants: Map<string, VariantEntry>;

  constructor(state: DurableObjectState) {
    this.state = state;
    this.variants = new Map();
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // Initialize storage on first access
    if (this.variants.size === 0) {
      const stored = await this.state.storage.list<VariantEntry>();
      stored.forEach((value, key) => {
        this.variants.set(key, value);
      });
    }

    // GET /variant/:hgvs - retrieve variant
    if (request.method === "GET" && path.startsWith("/variant/")) {
      const hgvs = decodeURIComponent(path.split("/variant/")[1]);
      return this.getVariant(hgvs);
    }

    // POST /variant - store variant
    if (request.method === "POST" && path === "/variant") {
      const data = await request.json<VariantEntry>();
      return this.storeVariant(data);
    }

    // DELETE /variant/:hgvs - delete variant
    if (request.method === "DELETE" && path.startsWith("/variant/")) {
      const hgvs = decodeURIComponent(path.split("/variant/")[1]);
      return this.deleteVariant(hgvs);
    }

    // GET /stats - get registry statistics
    if (request.method === "GET" && path === "/stats") {
      return this.getStats();
    }

    return new Response("Not found", { status: 404 });
  }

  private async getVariant(hgvs: string): Promise<Response> {
    const variant = this.variants.get(hgvs);

    if (!variant) {
      return new Response(
        JSON.stringify({ error: "Variant not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // Update access count
    variant.access_count += 1;
    variant.updated_at = Date.now();
    this.variants.set(hgvs, variant);
    await this.state.storage.put(hgvs, variant);

    return new Response(JSON.stringify(variant), {
      headers: { "Content-Type": "application/json" }
    });
  }

  private async storeVariant(data: VariantEntry): Promise<Response> {
    const existing = this.variants.get(data.hgvs);

    const entry: VariantEntry = {
      ...data,
      created_at: existing?.created_at || Date.now(),
      updated_at: Date.now(),
      access_count: existing?.access_count || 0
    };

    this.variants.set(data.hgvs, entry);
    await this.state.storage.put(data.hgvs, entry);

    return new Response(JSON.stringify({ success: true, entry }), {
      headers: { "Content-Type": "application/json" }
    });
  }

  private async deleteVariant(hgvs: string): Promise<Response> {
    this.variants.delete(hgvs);
    await this.state.storage.delete(hgvs);

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" }
    });
  }

  private async getStats(): Promise<Response> {
    const stats = {
      total_variants: this.variants.size,
      variants: Array.from(this.variants.values()).map(v => ({
        hgvs: v.hgvs,
        gene: v.gene,
        access_count: v.access_count,
        created_at: new Date(v.created_at).toISOString(),
        updated_at: new Date(v.updated_at).toISOString()
      }))
    };

    return new Response(JSON.stringify(stats), {
      headers: { "Content-Type": "application/json" }
    });
  }
}
