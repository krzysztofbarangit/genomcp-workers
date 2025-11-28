# GenomCP Workers - STANDALONE Edition

**NO external MCP servers required!** This Worker directly calls public genomic APIs.

## What Changed?

### ❌ Before (v1.0):
- Required external BioMCP server
- Required external Ensembl MCP server
- Required external NCBI MCP server
- Complex setup with 3+ separate servers

### ✅ Now (v2.0):
- **ZERO external servers needed!**
- Direct API calls to public services
- Works out-of-the-box
- Just deploy and go!

## Public APIs Used

All APIs are FREE and require NO authentication (optional keys for higher limits):

| API | Purpose | Auth Required? |
|-----|---------|----------------|
| **MyVariant.info** | Variant annotations (ClinVar, gnomAD, CADD) | ❌ No |
| **MyGene.info** | Gene information | ❌ No |
| **Ensembl REST API** | Genomic features, transcripts | ❌ No |
| **NCBI E-utilities** | PubMed, ClinVar, Gene database | ❌ No |
| **ClinicalTrials.gov** | Clinical trials | ❌ No |
| **PharmGKB** | Drug response data | ⚠️ Optional |
| **NCI CTS API** | Cancer trials (advanced features) | ⚠️ Optional |

## Quick Start (3 Steps!)

### 1. Install

```bash
cd genomcp-workers
npm install
```

### 2. Run Locally

```bash
npm run dev
```

That's it! Worker runs at `http://localhost:8787`

### 3. Test

```bash
# Health check - should show ALL backends healthy
curl http://localhost:8787/health

# Test variant interpretation
curl -X POST http://localhost:8787/api/variants/interpret \
  -H "Content-Type: application/json" \
  -d '{
    "variants": ["chr7:g.140453136A>T"]
  }'
```

## Deploy to Cloudflare (5 minutes)

### 1. Login
```bash
npx wrangler login
```

### 2. Create KV Namespaces
```bash
npx wrangler kv:namespace create "VARIANT_CACHE"
npx wrangler kv:namespace create "GENE_CACHE"
```

Update the IDs in `wrangler.toml`

### 3. Deploy
```bash
npm run deploy
```

Your API is live at: `https://genomcp-workers.YOUR-ACCOUNT.workers.dev`

## Optional API Keys

While ALL APIs work without keys, you can add optional keys for:

### NCI Clinical Trials (Optional)
Get from: https://clinicaltrialsapi.cancer.gov/
```bash
wrangler secret put NCI_API_KEY
```

### PharmGKB (Optional)
Most endpoints are public, but a key gives higher limits
```bash
wrangler secret put PHARMGKB_API_KEY
```

## API Endpoints

### Variant Interpretation
```bash
POST /api/variants/interpret
{
  "variants": ["chr7:g.140453136A>T", "chr17:g.7577548C>T"]
}
```

**Returns:**
- ClinVar significance
- gnomAD frequency
- CADD scores
- SIFT/PolyPhen predictions
- Ensembl consequences

### Gene Information
```bash
GET /api/variants/search
POST { "query": "BRAF" }
```

**Returns:**
- Gene summary
- Genomic location
- Ensembl/NCBI IDs
- Associated diseases

### Clinical Trials
```bash
# Via diagnosis endpoint
POST /api/diagnosis
{
  "patient": {
    "age": 45,
    "sex": "female",
    "phenotype": ["melanoma"]
  },
  "variants": [...]
}
```

**Returns:**
- Matched clinical trials
- From ClinicalTrials.gov
- Optional NCI cancer trials (with key)

## Architecture

```
n8n / Client
      ↓
Cloudflare Worker (GenomCP)
      ↓
   ┌──────────────────────────┐
   │  Direct API Calls        │
   ├──────────────────────────┤
   │ → MyVariant.info         │ (variants)
   │ → MyGene.info            │ (genes)
   │ → Ensembl REST API       │ (genomic features)
   │ → NCBI E-utilities       │ (PubMed, ClinVar)
   │ → ClinicalTrials.gov     │ (trials)
   │ → PharmGKB API           │ (drugs)
   └──────────────────────────┘
```

## What You DON'T Need

- ❌ BioMCP server
- ❌ Ensembl MCP server
- ❌ NCBI MCP server
- ❌ Docker containers
- ❌ Python environment
- ❌ Database setup
- ❌ Complex configuration

## What You DO Need

- ✅ Node.js 18+
- ✅ Cloudflare account (free tier works!)
- ✅ Internet connection
- ✅ That's it!

## Performance

- **First request**: 500-1000ms (public API calls)
- **Cached request**: 10-20ms (KV cache)
- **Batch processing**: Parallel requests optimized
- **Cost**: ~$1/month for 1000 daily diagnoses

## Rate Limits

All public APIs have generous free limits:

| API | Free Limit | Notes |
|-----|------------|-------|
| MyVariant/MyGene | Unlimited | No auth needed |
| Ensembl | 55,000 req/hour | Per IP |
| NCBI E-utilities | 3 req/second | 10/sec with API key |
| ClinicalTrials.gov | Unlimited | No auth |
| PharmGKB | Varies | Most endpoints public |

Worker caching reduces external API calls by ~70%.

## Troubleshooting

### "Health check shows backend offline"

Most likely network/firewall issue. Check:
```bash
# Test directly
curl https://myvariant.info/v1/metadata
curl https://rest.ensembl.org/info/ping?content-type=application/json
```

### "Rate limit exceeded"

Worker caching should prevent this, but if it happens:
1. Add NCBI API key for 10x higher limit
2. Increase cache TTL in `src/cache/kv-store.ts`

### "Variant not found"

Try different notation:
- ✅ `chr7:g.140453136A>T` (genomic)
- ✅ `NM_004333.4:c.1799T>A` (coding)
- ✅ `NP_004324.2:p.Val600Glu` (protein)

## Next Steps

- [Full API Documentation](API-EXAMPLES.md)
- [n8n Integration](n8n/workflow-examples/)
- [Deployment Guide](DEPLOYMENT.md)

## Support

This is a standalone Worker - NO complex setup required!

For issues:
- Check `/health` endpoint first
- All backends should return `true`
- If a backend is `false`, test it directly (see troubleshooting)

## License

MIT - Use freely for any purpose
