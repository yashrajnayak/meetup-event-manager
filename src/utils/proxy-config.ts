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
    lastCheck: Date.now(),
    requiresCredentials: true
  },
  {
    url: 'https://api.allorigins.win/raw',
    priority: 2,
    isHealthy: true,
    lastCheck: Date.now(),
    requiresCredentials: false,
    transformRequest: (url: string, options: RequestInit) => {
      // Remove /proxy from the URL for AllOrigins
      const endpoint = url.replace('/proxy/', '');
      const targetUrl = new URL(endpoint);
      
      // Handle auth token
      if (options.headers?.['Authorization']) {
        const token = options.headers['Authorization'].replace('Bearer ', '');
        targetUrl.searchParams.append('access_token', token);
      }
      
      // Construct final URL
      const finalUrl = `${proxyServers[1].url}?url=${encodeURIComponent(targetUrl.toString())}`;
      
      // Remove Authorization header as it's now in URL
      const newOptions = { ...options };
      delete newOptions.headers?.['Authorization'];
      
      return { url: finalUrl, options: newOptions };
    }
  }
];

const HEALTH_CHECK_INTERVAL = 60000; // 1 minute

// Check proxy health
export function checkProxyHealth(proxy: ProxyConfig): Promise<boolean> {
  const testUrl = proxy.url === proxyServers[1].url 
    ? `${proxy.url}?url=${encodeURIComponent('https://api.meetup.com/status')}`
    : `${proxy.url}/status`;

  return fetch(testUrl)
    .then(response => {
      const isHealthy = response.ok;
      console.log(`Health check for ${proxy.url}: ${isHealthy}`);
      return isHealthy;
    })
    .catch(error => {
      console.error(`Health check failed for ${proxy.url}:`, error);
      return false;
    });
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
    proxy.lastCheck = Date.now();
  });
  console.log('Reset all proxy health statuses');
} 