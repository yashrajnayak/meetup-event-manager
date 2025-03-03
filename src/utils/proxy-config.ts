interface ProxyConfig {
  url: string;
  priority: number;
  isHealthy: boolean;
  lastCheck: number;
}

// List of proxy servers in order of priority
const proxyServers: ProxyConfig[] = [
  {
    url: 'https://meetup-proxy.oneyashraj.workers.dev/proxy',
    priority: 1,
    isHealthy: true,
    lastCheck: 0
  },
  {
    url: 'https://meetup-cors.herokuapp.com/proxy',
    priority: 2,
    isHealthy: true,
    lastCheck: 0
  },
  {
    url: 'https://cors-anywhere.herokuapp.com/https://api.meetup.com',
    priority: 3,
    isHealthy: true,
    lastCheck: 0
  }
];

const HEALTH_CHECK_INTERVAL = 60000; // 1 minute

// Check proxy health
async function checkProxyHealth(proxy: ProxyConfig): Promise<boolean> {
  try {
    const response = await fetch(`${proxy.url}/ping`, {
      method: 'OPTIONS',
      headers: {
        'Accept': 'application/json'
      }
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

// Get GraphQL endpoint for the given proxy
export function getGraphQLEndpoint(proxyUrl: string): string {
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