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
    url: 'https://meetup-proxy.oneyashraj.workers.dev/proxy',
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
      const endpoint = url.includes('/gql') 
        ? 'https://api.meetup.com/gql'
        : url.replace(/^.*?\/proxy\//, 'https://api.meetup.com/');

      // Get auth token from headers
      const authHeader = options.headers?.['Authorization'] as string;
      const token = authHeader?.split(' ')[1] || '';

      // Add token to URL for AllOrigins
      const targetUrl = `${endpoint}${endpoint.includes('?') ? '&' : '?'}access_token=${token}`;
      
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
        } catch (e) {
          console.warn('Failed to parse GraphQL body:', e);
        }
      }

      return {
        url: `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`,
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
      return response.ok;
    }

    const response = await fetch(`${proxy.url}/ping`, {
      method: 'OPTIONS',
      headers: {
        'Accept': 'application/json'
      },
      credentials: proxy.requiresCredentials ? 'include' : 'omit',
      mode: 'cors'
    });

    return response.ok;
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

  return healthyProxy?.url || null;
}

// Get proxy configuration by URL
export function getProxyConfig(proxyUrl: string): ProxyConfig | null {
  return proxyServers.find(p => p.url === proxyUrl || proxyUrl.startsWith(p.url)) || null;
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
  return `${proxyUrl}/gql`;
}

// Mark a proxy as unhealthy
export function markProxyUnhealthy(proxyUrl: string): void {
  const proxy = proxyServers.find(p => p.url === proxyUrl || proxyUrl.startsWith(p.url));
  if (proxy) {
    proxy.isHealthy = false;
    proxy.lastCheck = Date.now();
  }
}

// Reset all proxy health statuses
export function resetProxyHealth(): void {
  proxyServers.forEach(proxy => {
    proxy.isHealthy = true;
    proxy.lastCheck = 0;
  });
} 