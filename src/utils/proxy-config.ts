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
    url: 'https://api.allorigins.win/raw?url=',
    priority: 2,
    isHealthy: true,
    lastCheck: 0,
    requiresCredentials: false,
    transformRequest: (url: string, options: RequestInit) => {
      // For AllOrigins, we need to encode the target URL and move auth header to URL
      const targetUrl = url.replace(/^https:\/\/[^/]+\//, 'https://api.meetup.com/');
      const authHeader = options.headers?.['Authorization'];
      const finalUrl = `${targetUrl}${targetUrl.includes('?') ? '&' : '?'}access_token=${authHeader?.split(' ')[1] || ''}`;
      const encodedUrl = encodeURIComponent(finalUrl);
      
      // Remove the auth header as it's now in the URL
      const newHeaders = { ...options.headers };
      delete newHeaders['Authorization'];
      
      return {
        url: `https://api.allorigins.win/raw?url=${encodedUrl}`,
        options: {
          ...options,
          headers: newHeaders
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
      const response = await fetch(`${proxy.url}${encodeURIComponent('https://api.meetup.com/status')}`, {
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
  return proxyServers.find(p => p.url === proxyUrl) || null;
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
  if (proxyUrl.includes('allorigins')) {
    return `${proxyUrl}${encodeURIComponent('https://api.meetup.com/gql')}`;
  }
  return `${proxyUrl}/gql`;
}

// Mark a proxy as unhealthy
export function markProxyUnhealthy(proxyUrl: string): void {
  const proxy = proxyServers.find(p => p.url === proxyUrl);
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