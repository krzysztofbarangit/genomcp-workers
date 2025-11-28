# Deployment Guide

Complete deployment guide for GenomCP Workers on Cloudflare.

## Prerequisites

1. **Cloudflare Account**
   - Sign up at https://dash.cloudflare.com/sign-up
   - Verify email address

2. **Wrangler CLI**
   ```bash
   npm install -g wrangler
   wrangler login
   ```

3. **MCP Servers Running**
   - BioMCP server accessible
   - Ensembl MCP server accessible
   - NCBI MCP server accessible
   - PharmGKB API access (or running server)

## Step-by-Step Deployment

### 1. Create KV Namespaces

```bash
# Create production KV namespaces
wrangler kv:namespace create "VARIANT_CACHE" --env production
wrangler kv:namespace create "GENE_CACHE" --env production

# Create preview namespaces for development
wrangler kv:namespace create "VARIANT_CACHE" --preview
wrangler kv:namespace create "GENE_CACHE" --preview
```

**Output example:**
```
✨  Created namespace with id "abc123def456"
✨  Add the following to your wrangler.toml:

[[kv_namespaces]]
binding = "VARIANT_CACHE"
id = "abc123def456"
```

### 2. Update wrangler.toml

Copy the IDs from step 1 into `wrangler.toml`:

```toml
[[kv_namespaces]]
binding = "VARIANT_CACHE"
id = "abc123def456"        # Your production ID
preview_id = "xyz789uvw012" # Your preview ID

[[kv_namespaces]]
binding = "GENE_CACHE"
id = "def456ghi789"        # Your production ID
preview_id = "uvw012abc345" # Your preview ID
```

### 3. Configure Environment Variables

Update `wrangler.toml` with your MCP server URLs:

```toml
[env.production.vars]
ENVIRONMENT = "production"
BIOMCP_URL = "https://biomcp.your-domain.com"
ENSEMBL_URL = "https://ensembl.your-domain.com"
NCBI_URL = "https://ncbi.your-domain.com"
PHARMGKB_URL = "https://api.pharmgkb.org/v1"
```

### 4. Set API Keys (Secrets)

```bash
# Set secrets for production
wrangler secret put BIOMCP_API_KEY --env production
# Enter your BioMCP API key when prompted

wrangler secret put ENSEMBL_API_KEY --env production
# Enter your Ensembl API key when prompted

wrangler secret put NCBI_API_KEY --env production
# Enter your NCBI API key when prompted

wrangler secret put PHARMGKB_API_KEY --env production
# Enter your PharmGKB API key when prompted
```

### 5. Test Locally

```bash
# Install dependencies
npm install

# Start local development server
npm run dev

# Test health endpoint
curl http://localhost:8787/health

# Test diagnosis endpoint
curl -X POST http://localhost:8787/api/diagnosis \
  -H "Content-Type: application/json" \
  -d '{
    "patient": {
      "age": 45,
      "sex": "female",
      "phenotype": ["test"]
    },
    "variants": [{
      "hgvs": "BRAF:c.1799T>A",
      "gene": "BRAF"
    }]
  }'
```

### 6. Deploy to Production

```bash
# Deploy to production
npm run deploy

# Or with environment flag
wrangler deploy --env production
```

**Expected output:**
```
✨ Built successfully, built project size is 145 KiB.
✨ Uploading...
✨ Uploaded genomcp-workers (4.32 sec)
✨ Published genomcp-workers (0.34 sec)
   https://genomcp-workers.your-account.workers.dev
```

### 7. Verify Deployment

```bash
# Test production health endpoint
curl https://genomcp-workers.your-account.workers.dev/health

# Test diagnosis endpoint
curl -X POST https://genomcp-workers.your-account.workers.dev/api/diagnosis \
  -H "Content-Type: application/json" \
  -d @test-data/sample-diagnosis.json
```

## Custom Domain Setup (Optional)

### Add Custom Domain

1. Go to Cloudflare Dashboard → Workers & Pages
2. Select your worker (`genomcp-workers`)
3. Click "Add Custom Domain"
4. Enter your domain (e.g., `api.genomcp.com`)
5. Cloudflare will automatically configure DNS

### Update CORS Settings

Edit `src/index.ts` to restrict CORS to your domain:

```typescript
app.use("/*", cors({
  origin: "https://your-frontend-domain.com",
  allowMethods: ["GET", "POST", "PUT", "DELETE"],
  allowHeaders: ["Content-Type", "Authorization"],
}));
```

## Monitoring & Analytics

### Enable Workers Analytics

1. Dashboard → Workers & Pages → Your Worker
2. Click "Metrics" tab
3. View:
   - Request volume
   - Error rates
   - CPU time
   - Duration

### Enable Logpush (Optional)

For advanced logging:

```bash
wrangler tail genomcp-workers --env production
```

Or configure Logpush to send logs to:
- Cloudflare Logs
- S3
- Google Cloud Storage
- Azure Blob Storage

## CI/CD with GitHub Actions

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Cloudflare Workers

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Deploy to Cloudflare
        uses: cloudflare/wrangler-action@v3
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          environment: 'production'
```

### Setup GitHub Secrets

1. Get Cloudflare API Token:
   - Dashboard → My Profile → API Tokens
   - Create Token → Use template "Edit Cloudflare Workers"

2. Add to GitHub:
   - Repo → Settings → Secrets → Actions
   - New repository secret: `CLOUDFLARE_API_TOKEN`

## Scaling Considerations

### Performance Tuning

1. **Adjust Cache TTLs** in `src/cache/kv-store.ts`:
   ```typescript
   export const CACHE_TTL = {
     VARIANT: 24 * 60 * 60,  // Increase for more caching
     GENE: 30 * 24 * 60 * 60,
     // ...
   };
   ```

2. **Batch API Calls** - Already optimized with `Promise.all()`

3. **Enable Argo Smart Routing** (Cloudflare dashboard)

### Cost Optimization

1. **Increase Cache TTLs** to reduce MCP backend calls
2. **Use Durable Objects** for frequently accessed data
3. **Monitor KV Usage** and adjust accordingly

### Rate Limiting

Add rate limiting in Cloudflare Dashboard:
1. Workers & Pages → Your Worker
2. Settings → Rate Limiting
3. Configure rules (e.g., 100 requests per minute per IP)

## Rollback

If deployment fails:

```bash
# List deployments
wrangler deployments list

# Rollback to previous version
wrangler rollback --env production
```

## Troubleshooting

### Error: "Cannot find module 'hono'"

```bash
npm install
wrangler deploy
```

### Error: "KV namespace not found"

Verify namespace IDs in `wrangler.toml` match the ones created.

### Error: "Too Many Requests" from MCP backends

Increase cache TTLs or implement request queuing.

### Backend Timeout

Increase timeout in client configuration:

```typescript
new BioMCPClient({
  url: env.BIOMCP_URL,
  timeout: 60000 // 60 seconds
})
```

## Security Checklist

- [ ] API keys stored as Wrangler secrets
- [ ] CORS configured for production domains only
- [ ] Rate limiting enabled
- [ ] Custom domain with HTTPS
- [ ] Regular dependency updates (`npm audit`)
- [ ] Monitor error rates

## Production Checklist

- [ ] All MCP servers accessible from Cloudflare edge
- [ ] KV namespaces created and configured
- [ ] Secrets set for all API keys
- [ ] Health endpoint returns 200
- [ ] Test diagnosis request succeeds
- [ ] Custom domain configured (if using)
- [ ] Monitoring enabled
- [ ] CI/CD pipeline configured (optional)
- [ ] Rate limiting configured

## Support

For deployment issues:
- Cloudflare Workers Docs: https://developers.cloudflare.com/workers/
- Wrangler Docs: https://developers.cloudflare.com/workers/wrangler/
- Community Discord: https://discord.gg/cloudflaredev
