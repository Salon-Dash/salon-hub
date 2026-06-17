// @ts-nocheck
// Vercel Serverless Function - API Proxy
// Handles ALL /api/* requests via rewrite rule

// GCP_API_BASE_URL should use HTTPS on port 8443 (api-gateway with SSL)
// We'll add /api prefix ourselves
const GCP_API_BASE = process.env.GCP_API_BASE_URL || 'https://34.44.232.95:8443';
// Remove /api suffix if present (in case env var includes it)
const GCP_API = GCP_API_BASE.replace(/\/api\/?$/, '');

export default async function handler(req: any, res: any) {
  console.log('[PROXY] Function called!', req.method, req.url, 'Query:', req.query);
  
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Get path from query parameter (set by rewrite rule)
    // /api/public/auth/login -> rewrite sends to /api/proxy?path=public/auth/login
    // Handle both string and array cases (Vercel may pass it as an array for path segments)
    let path: string;
    if (Array.isArray(req.query.path)) {
      path = req.query.path.join('/');
    } else {
      path = (req.query.path as string) || '';
    }
    
    // Decode URL-encoded path (auth%2Flogin -> auth/login)
    if (path) {
      try {
        path = decodeURIComponent(path);
      } catch (e) {
        console.warn('[PROXY] Failed to decode path:', path);
      }
    }
    
    if (!path) {
      console.error('[PROXY] No path in query:', req.query);
      return res.status(400).json({
        error: 'No path provided',
        query: req.query,
        url: req.url
      });
    }

    // Construct target URL
    // path from query is "appointments/business/2" (URL decoded)
    // Remove any leading /api or / from path
    let apiPath = path;
    if (apiPath.startsWith('/api/')) {
      apiPath = apiPath.substring(5);  // Remove "/api/"
    } else if (apiPath.startsWith('/')) {
      apiPath = apiPath.substring(1);  // Remove leading "/"
    }
    
    // Extract query parameters from the original request (excluding 'path' which is used by Vercel rewrite)
    const queryParams = new URLSearchParams();
    Object.keys(req.query).forEach(key => {
      if (key !== 'path') {  // Skip the 'path' parameter used by Vercel rewrite
        const value = req.query[key];
        if (Array.isArray(value)) {
          value.forEach(v => queryParams.append(key, v));
        } else if (value) {
          queryParams.append(key, value as string);
        }
      }
    });
    
    // Construct target URL with query parameters
    // GCP_API is now guaranteed to be "https://34.44.232.95" (no /api)
    // So we construct: https://34.44.232.95/api/appointments/business/2?startDate=2026-01-06&endDate=2026-01-06
    const queryString = queryParams.toString();
    const targetUrl = `${GCP_API}/api/${apiPath}${queryString ? `?${queryString}` : ''}`;

    console.log(`[PROXY] ${req.method} /api/${path} -> ${targetUrl}`, {
      originalPath: path,
      cleanedPath: apiPath,
      queryParams: queryString,
      GCP_API_BASE,
      GCP_API,
      targetUrl
    });

    // Headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (req.headers.authorization) {
      headers['Authorization'] = req.headers.authorization as string;
    }

    // Copy other relevant headers
    if (req.headers['accept']) {
      headers['Accept'] = req.headers['accept'] as string;
    }
    if (req.headers['accept-language']) {
      headers['Accept-Language'] = req.headers['accept-language'] as string;
    }

    // Fetch options
    const options: RequestInit = {
      method: req.method,
      headers,
    };

    // Body - Vercel may already parse JSON, so handle both cases
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method || '')) {
      if (req.body) {
        if (typeof req.body === 'string') {
          options.body = req.body;
        } else if (typeof req.body === 'object') {
          options.body = JSON.stringify(req.body);
        }
      }
    }

    // Forward to GCP
    console.log('[PROXY] Making request:', {
      method: req.method,
      url: targetUrl,
      hasBody: !!options.body,
      headers: Object.keys(headers)
    });

    const response = await fetch(targetUrl, options);
    
    // Handle response
    const contentType = response.headers.get('content-type');
    let data: any;
    
    if (contentType && contentType.includes('application/json')) {
      try {
        data = await response.json();
      } catch (e) {
        console.warn('[PROXY] Failed to parse JSON response:', e);
        data = await response.text();
      }
    } else {
      data = await response.text();
    }

    // Forward response status and headers
    res.status(response.status);
    
    // Copy response headers (excluding problematic ones)
    response.headers.forEach((value: string, key: string) => {
      const lower = key.toLowerCase();
      if (!['content-encoding', 'transfer-encoding', 'content-length', 'connection', 'keep-alive'].includes(lower)) {
        res.setHeader(key, value);
      }
    });

    // Send response
    if (typeof data === 'string') {
      res.setHeader('Content-Type', 'text/plain');
      return res.end(data);
    } else {
      return res.json(data);
    }
  } catch (error: any) {
    console.error('[PROXY ERROR]', error);
    console.error('[PROXY ERROR] Stack:', error.stack);
    return res.status(500).json({
      error: 'Proxy error',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}
