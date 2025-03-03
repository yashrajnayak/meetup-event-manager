export interface ProxyConfig {
  url: string;
  priority: number;
  isHealthy: boolean;
  lastCheck: number;
  requiresCredentials: boolean;
  transformRequest?: (url: string, options?: RequestInit) => { url: string; options: RequestInit };
}

// List of proxy servers in order of priority
const proxyServers: ProxyConfig[] = [
  {
    url: 'https://meetup-proxy.oneyashraj.workers.dev',
    priority: 1,
    isHealthy: true,
    lastCheck: 0,
    requiresCredentials: true,
    transformRequest: (url: string, options?: RequestInit) => {
      return {
        url: `${url.includes('/proxy/') ? url : url.replace('api.meetup.com', 'proxy')}`,
        options: options || { method: 'GET' }
      };
    }
  },
  {
    url: 'https://api.allorigins.win/raw',
    priority: 2,
    isHealthy: true,
    lastCheck: 0,
    requiresCredentials: false,
    transformRequest: (url: string, options?: RequestInit) => {
      // Remove any existing proxy prefixes
      const targetUrl = url.replace('https://api.allorigins.win/raw/', '');
      
      // For GraphQL endpoint
      if (url.includes('/gql')) {
        return {
          url: `https://api.allorigins.win/raw?url=${encodeURIComponent('https://api.meetup.com/gql')}`,
          options: {
            ...(options || { method: 'POST' }),
            headers: {
              ...(options?.headers || {}),
              'Content-Type': 'application/json'
            }
          }
        };
      }
      
      // For REST endpoints
      const finalUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(`https://api.meetup.com/${targetUrl}`)}`;
      return { 
        url: finalUrl, 
        options: options || { method: 'GET' }
      };
    }
  }
];

const HEALTH_CHECK_INTERVAL = 60000; // 1 minute

// Check proxy health
export async function checkProxyHealth(proxy: ProxyConfig): Promise<boolean> {
  try {
    const testUrl = proxy.url === 'https://api.allorigins.win/raw' 
      ? `${proxy.url}?url=${encodeURIComponent('https://api.meetup.com/status')}`
      : `${proxy.url}/proxy/status`;

    const response = await fetch(testUrl, {
      method: 'GET',
      headers: {
        'Accept': 'application/json'
      }
    });

    if (!response.ok) {
      console.warn(`Health check failed for proxy ${proxy.url}: ${response.status}`);
      return false;
    }

    const contentType = response.headers.get('content-type');
    return Boolean(contentType?.includes('application/json') || contentType?.includes('text/plain'));
  } catch (error) {
    console.warn(`Health check error for proxy ${proxy.url}:`, error);
    return false;
  }
}

// Update proxy health status
export function updateProxyHealth(proxyUrl: string, isHealthy: boolean): void {
  const proxy = proxyServers.find(p => proxyUrl.startsWith(p.url));
  if (proxy) {
    proxy.isHealthy = isHealthy;
    proxy.lastCheck = Date.now();
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
  await Promise.all(proxyServers.map(proxy => updateProxyHealth(proxy.url, proxy.isHealthy)));
  
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
    proxy.lastCheck = Date.now();
  });
  console.log('Reset all proxy health statuses');
} 