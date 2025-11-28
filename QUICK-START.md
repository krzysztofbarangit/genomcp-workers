# Quick Start Guide

Get up and running with GenomCP Workers in 5 minutes.

## Prerequisites

- Node.js 18+ installed
- Cloudflare account (free tier works)
- MCP servers running (BioMCP, Ensembl, NCBI) or accessible URLs

## Installation

```bash
cd genomcp-workers
npm install
```

## Local Development Setup

### 1. Create Development Config

```bash
cp .dev.vars.example .dev.vars
```

Edit `.dev.vars` with your MCP server URLs:

```bash
BIOMCP_URL=http://localhost:8000
ENSEMBL_URL=http://localhost:8001
NCBI_URL=http://localhost:8002
PHARMGKB_URL=https://api.pharmgkb.org/v1
```

### 2. Start Development Server

```bash
npm run dev
```

Server will start at `http://localhost:8787`

### 3. Test the API

#### Health Check

```bash
curl http://localhost:8787/health
```

Expected response:
```json
{
  "status": "healthy",
  "environment": "development",
  "backends": {
    "biomcp": true,
    "ensembl": true,
    "ncbi": true,
    "pharmgkb": true
  }
}
```

#### Test Diagnosis

```bash
curl -X POST http://localhost:8787/api/diagnosis \
  -H "Content-Type: application/json" \
  -d @test-data/sample-diagnosis.json
```

Expected response: Full diagnosis object with predictions

#### Test Variant Interpretation

```bash
curl -X POST http://localhost:8787/api/variants/interpret \
  -H "Content-Type: application/json" \
  -d '{
    "variants": ["BRAF:c.1799T>A", "TP53:p.R248Q"],
    "context": "cancer_predisposition"
  }'
```

#### Test Drug Response

```bash
curl -X POST http://localhost:8787/api/drugs/response \
  -H "Content-Type: application/json" \
  -d '{
    "genes": ["BRAF", "TP53", "CDKN2A"]
  }'
```

## Deploy to Cloudflare

### 1. Login to Cloudflare

```bash
npx wrangler login
```

### 2. Create KV Namespaces

```bash
npx wrangler kv:namespace create "VARIANT_CACHE"
npx wrangler kv:namespace create "GENE_CACHE"
```

Copy the IDs and update `wrangler.toml`

### 3. Set Production Secrets

```bash
npx wrangler secret put BIOMCP_API_KEY
npx wrangler secret put ENSEMBL_API_KEY
npx wrangler secret put NCBI_API_KEY
npx wrangler secret put PHARMGKB_API_KEY
```

### 4. Deploy

```bash
npm run deploy
```

Your API will be live at: `https://genomcp-workers.YOUR-ACCOUNT.workers.dev`

## n8n Integration

### Import Workflow

1. Open n8n
2. Go to Workflows → Import from File
3. Select `n8n/workflow-examples/genomic-diagnosis.json`
4. Update Worker URL in HTTP Request nodes
5. Activate workflow

### Test n8n Workflow

1. Trigger workflow manually
2. Check execution log
3. Verify diagnosis result

## Next Steps

- [Full Documentation](README.md)
- [Deployment Guide](DEPLOYMENT.md)
- [n8n Examples](n8n/workflow-examples/)
- [API Schemas](n8n/schemas/)

## Troubleshooting

### "Cannot find module"
```bash
rm -rf node_modules package-lock.json
npm install
```

### "KV namespace not found"
Verify namespace IDs in `wrangler.toml` match created namespaces

### "Backend connection failed"
Check MCP server URLs in `.dev.vars` or wrangler.toml

### "Unauthorized" from PharmGKB
PharmGKB API is public - no key needed for basic access

## Support

- GitHub Issues: [Your GitHub URL]
- Discord: [Your Discord]
- Email: [Your Email]
