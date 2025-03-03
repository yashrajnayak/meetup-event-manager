interface ProxyConfig {
  url: string;
  priority: number;
  isHealthy: boolean;
  lastCheck: number;
  requiresCredentials: boolean;
  transformRequest?: (url: string, options: RequestInit) => { url: string; options: RequestInit };
}

// List of proxy servers in order of priority
const proxyServers: ProxyConfig[] = [
  {
    url: 'https://meetup-proxy.oneyashraj.workers.dev',
    priority: 1,
    isHealthy: true,
    lastCheck: 0,
    requiresCredentials: true
  },
  {
    url: 'https://api.allorigins.win/raw',
    priority: 2,
    isHealthy: true,
    lastCheck: 0,
    requiresCredentials: false,
    transformRequest: (url: string, options: RequestInit) => {
      // Extract the actual endpoint from the proxy URL
      let endpoint: string;
      if (url.includes('/gql')) {
        endpoint = 'https://api.meetup.com/gql';
      } else {
        const match = url.match(/\/proxy\/(.*?)(?:\?|$)/);
        endpoint = match 
          ? `https://api.meetup.com/${match[1]}`
          : url.replace(/^.*?\/proxy\//, 'https://api.meetup.com/');
      }

      // Get auth token from headers
      const authHeader = options.headers?.['Authorization'] as string;
      const token = authHeader?.split(' ')[1] || '';

      // Add token to URL for AllOrigins
      const targetUrl = `${endpoint}${endpoint.includes('?') ? '&' : '?'}access_token=${token}`;
      
      console.log('AllOrigins target URL:', targetUrl);

      // Create new headers without auth
      const newHeaders = new Headers(options.headers);
      newHeaders.delete('Authorization');

      // For GraphQL, we need to handle the body differently
      let newBody = options.body;
      if (url.includes('/gql') && typeof options.body === 'string') {
        try {
          const parsedBody = JSON.parse(options.body);
          // Add token to variables if they exist
          if (parsedBody.variables) {
            parsedBody.variables.access_token = token;
          } else {
            parsedBody.variables = { access_token: token };
          }
          newBody = JSON.stringify(parsedBody);
          console.log('Transformed GraphQL body:', newBody);
        } catch (e) {
          console.warn('Failed to parse GraphQL body:', e);
        }
      }

      const transformedUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`;
      console.log('Final AllOrigins URL:', transformedUrl);

      return {
        url: transformedUrl,
        options: {
          ...options,
          headers: newHeaders,
          body: newBody,
          credentials: 'omit'
        }
      };
    }
  }
];

const HEALTH_CHECK_INTERVAL = 60000; // 1 minute

// Check proxy health
async function checkProxyHealth(proxy: ProxyConfig): Promise<boolean> {
  try {
    if (proxy.url.includes('allorigins')) {
      const testUrl = encodeURIComponent('https://api.meetup.com/status');
      const response = await fetch(`${proxy.url}?url=${testUrl}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/json'
        }
      });
      
      if (!response.ok) {
        console.warn('AllOrigins health check failed:', {
          status: response.status,
          statusText: response.statusText
        });
        return false;
      }
      
      return true;
    }

    const response = await fetch(`${proxy.url}/proxy/ping`, {
      method: 'OPTIONS',
      headers: {
        'Accept': 'application/json'
      },
      credentials: proxy.requiresCredentials ? 'include' : 'omit',
      mode: 'cors'
    });

    if (!response.ok) {
      console.warn('Cloudflare Worker health check failed:', {
        status: response.status,
        statusText: response.statusText
      });
      return false;
    }

    return true;
  } catch (error) {
    console.warn(`Proxy health check failed for ${proxy.url}:`, error);
    return false;
  }
}

// Update proxy health status
async function updateProxyHealth(proxy: ProxyConfig): Promise<void> {
  const now = Date.now();
  if (now - proxy.lastCheck > HEALTH_CHECK_INTERVAL) {
    proxy.isHealthy = await checkProxyHealth(proxy);
    proxy.lastCheck = now;
    console.log('Updated proxy health:', {
      url: proxy.url,
      isHealthy: proxy.isHealthy,
      lastCheck: new Date(proxy.lastCheck).toISOString()
    });
  }
}

// Get the next available healthy proxy
export async function getHealthyProxy(): Promise<string | null> {
  // Update health status for all proxies
  await Promise.all(proxyServers.map(updateProxyHealth));
  
  // Sort by priority and find the first healthy proxy
  const healthyProxy = proxyServers
    .sort((a, b) => a.priority - b.priority)
    .find(proxy => proxy.isHealthy);

  console.log('Selected healthy proxy:', healthyProxy?.url || 'none available');
  return healthyProxy?.url || null;
}

// Get proxy configuration by URL
export function getProxyConfig(proxyUrl: string): ProxyConfig | null {
  const config = proxyServers.find(p => proxyUrl.startsWith(p.url));
  console.log('Found proxy config for URL:', proxyUrl, 'Config:', config);
  return config || null;
}

// Transform request based on proxy configuration
export function transformRequest(proxyUrl: string, url: string, options: RequestInit): { url: string; options: RequestInit } {
  const proxyConfig = getProxyConfig(proxyUrl);
  if (proxyConfig?.transformRequest) {
    return proxyConfig.transformRequest(url, options);
  }
  return { url, options };
}

// Get GraphQL endpoint for the given proxy
export function getGraphQLEndpoint(proxyUrl: string): string {
  const proxyConfig = getProxyConfig(proxyUrl);
  if (!proxyConfig) return `${proxyUrl}/gql`;

  if (proxyConfig.url.includes('allorigins')) {
    return proxyConfig.url;
  }
  return `${proxyUrl}/proxy/gql`;
}

// Mark a proxy as unhealthy
export function markProxyUnhealthy(proxyUrl: string): void {
  const proxy = proxyServers.find(p => proxyUrl.startsWith(p.url));
  if (proxy) {
    proxy.isHealthy = false;
    proxy.lastCheck = Date.now();
    console.log('Marked proxy as unhealthy:', proxy.url);
  }
}

// Reset all proxy health statuses
export function resetProxyHealth(): void {
  proxyServers.forEach(proxy => {
    proxy.isHealthy = true;
    proxy.lastCheck = 0;
  });
  console.log('Reset all proxy health statuses');
} 