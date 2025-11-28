# API Examples

Complete examples for testing GenomCP Workers API.

## Base URLs

- **Local Development**: `http://localhost:8787`
- **Production**: `https://genomcp-workers.YOUR-ACCOUNT.workers.dev`

## Health Check

```bash
curl http://localhost:8787/health
```

Response:
```json
{
  "status": "healthy",
  "environment": "development",
  "timestamp": "2025-11-28T10:30:00.000Z",
  "backends": {
    "biomcp": true,
    "ensembl": true,
    "ncbi": true,
    "pharmgkb": true
  }
}
```

## Diagnosis API

### Complete Diagnosis

```bash
curl -X POST http://localhost:8787/api/diagnosis \
  -H "Content-Type: application/json" \
  -d '{
    "patient": {
      "age": 45,
      "sex": "female",
      "ethnicity": "european",
      "phenotype": ["hyperpigmentation", "family_history_melanoma"],
      "family_history": {
        "cancer_type": "melanoma",
        "affected_relatives": 2,
        "inheritance_pattern": "autosomal_dominant"
      }
    },
    "variants": [
      {
        "hgvs": "BRAF:c.1799T>A",
        "gene": "BRAF",
        "significance": "pathogenic",
        "zygosity": "heterozygous"
      },
      {
        "hgvs": "TP53:p.R248Q",
        "gene": "TP53",
        "significance": "pathogenic",
        "zygosity": "heterozygous"
      }
    ]
  }'
```

### Get Cached Diagnosis

```bash
curl http://localhost:8787/api/diagnosis/dx_1234567890_abc123
```

## Variants API

### Interpret Single Variant

```bash
curl http://localhost:8787/api/variants/BRAF%3Ac.1799T%3EA
```

### Batch Variant Interpretation

```bash
curl -X POST http://localhost:8787/api/variants/interpret \
  -H "Content-Type: application/json" \
  -d '{
    "variants": [
      "BRAF:c.1799T>A",
      "TP53:p.R248Q",
      "CDKN2A:c.301G>T"
    ],
    "context": "cancer_predisposition"
  }'
```

### Get Registry Statistics

```bash
curl http://localhost:8787/api/variants/registry/stats
```

## Drug Response API

### Get Drug Response

```bash
curl -X POST http://localhost:8787/api/drugs/response \
  -H "Content-Type: application/json" \
  -d '{
    "genes": ["BRAF", "TP53", "CDKN2A"],
    "variants": ["BRAF:c.1799T>A"]
  }'
```

### Get Drug Information

```bash
curl http://localhost:8787/api/drugs/vemurafenib
```

### Get Clinical Guidelines

```bash
curl http://localhost:8787/api/drugs/guidelines/vemurafenib
```

### Get Metabolizer Status

```bash
curl -X POST http://localhost:8787/api/drugs/metabolizer \
  -H "Content-Type: application/json" \
  -d '{
    "gene": "CYP2D6",
    "variants": ["CYP2D6*2", "CYP2D6*4"]
  }'
```

## JavaScript/TypeScript Examples

### Fetch API

```javascript
async function getDiagnosis(patient, variants) {
  const response = await fetch('http://localhost:8787/api/diagnosis', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ patient, variants })
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return await response.json();
}

// Usage
const patient = {
  age: 45,
  sex: 'female',
  phenotype: ['hyperpigmentation']
};

const variants = [
  { hgvs: 'BRAF:c.1799T>A', gene: 'BRAF' }
];

getDiagnosis(patient, variants)
  .then(diagnosis => console.log(diagnosis))
  .catch(error => console.error('Error:', error));
```

### Axios

```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8787',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Diagnosis
const diagnosis = await api.post('/api/diagnosis', {
  patient: { age: 45, sex: 'female', phenotype: ['test'] },
  variants: [{ hgvs: 'BRAF:c.1799T>A', gene: 'BRAF' }]
});

// Variants
const variants = await api.post('/api/variants/interpret', {
  variants: ['BRAF:c.1799T>A'],
  context: 'clinical'
});

// Drugs
const drugs = await api.post('/api/drugs/response', {
  genes: ['BRAF', 'TP53']
});
```

## Python Examples

### requests Library

```python
import requests
import json

BASE_URL = "http://localhost:8787"

def get_diagnosis(patient, variants):
    response = requests.post(
        f"{BASE_URL}/api/diagnosis",
        json={
            "patient": patient,
            "variants": variants
        }
    )
    response.raise_for_status()
    return response.json()

# Usage
patient = {
    "age": 45,
    "sex": "female",
    "phenotype": ["hyperpigmentation"]
}

variants = [
    {
        "hgvs": "BRAF:c.1799T>A",
        "gene": "BRAF",
        "significance": "pathogenic"
    }
]

diagnosis = get_diagnosis(patient, variants)
print(json.dumps(diagnosis, indent=2))
```

### httpx (async)

```python
import httpx
import asyncio

async def get_diagnosis(patient, variants):
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "http://localhost:8787/api/diagnosis",
            json={"patient": patient, "variants": variants}
        )
        response.raise_for_status()
        return response.json()

# Usage
asyncio.run(get_diagnosis(patient, variants))
```

## Error Handling

### Validation Error (400)

Request:
```bash
curl -X POST http://localhost:8787/api/diagnosis \
  -H "Content-Type: application/json" \
  -d '{
    "patient": {
      "age": 45
    }
  }'
```

Response:
```json
{
  "error": "Missing required fields: patient.sex, patient.phenotype, variants",
  "status": 400
}
```

### Not Found (404)

Request:
```bash
curl http://localhost:8787/api/diagnosis/invalid-id
```

Response:
```json
{
  "error": "Diagnosis not found",
  "status": 404
}
```

### Internal Error (500)

Response:
```json
{
  "error": "Failed to generate diagnosis",
  "message": "Backend timeout",
  "status": 500
}
```

## Rate Limiting

Configure in Cloudflare Dashboard:
- 100 requests per minute per IP (recommended)
- 429 response when exceeded

## Best Practices

1. **Use Batch Endpoints** - Interpret multiple variants in one request
2. **Cache Results** - Store diagnosis IDs for later retrieval
3. **Handle Errors** - Implement retry logic with exponential backoff
4. **Validate Input** - Check data before sending
5. **Monitor Usage** - Track cache hit rates for optimization

## Performance Tips

- First request: ~2-3 seconds (cold start + MCP calls)
- Cached request: ~10-20ms
- Batch processing: More efficient than individual requests
- Use `context` parameter to improve variant interpretation accuracy
