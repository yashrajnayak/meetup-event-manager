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
      const baseUrl = 'https://api.meetup.com';
      const path = url.includes('/gql') ? '/gql' : url.replace(baseUrl, '');
      const finalUrl = `${proxyServers[0].url}/proxy${path}`;
      
      // For GraphQL requests
      if (url.includes('/gql')) {
        return {
          url: finalUrl,
          options: {
            ...(options || {}),
            method: 'POST',
            headers: {
              ...options?.headers,
              'Accept': 'application/json',
              'Content-Type': 'application/json'
            }
          }
        };
      }
      
      // For REST requests
      return {
        url: finalUrl,
        options: {
          ...(options || {}),
          method: options?.method || 'GET',
          headers: {
            ...options?.headers,
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        }
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
      const baseUrl = 'https://api.meetup.com';
      const path = url.includes('/gql') ? '/gql' : url.replace(baseUrl, '');
      const targetUrl = `${baseUrl}${path}`;
      
      // Extract authorization header
      const headers = options?.headers as Record<string, string>;
      const auth = headers?.['Authorization'];
      
      // For GraphQL endpoint
      if (url.includes('/gql')) {
        // Include auth in the body for GraphQL requests
        const body = options?.body ? JSON.parse(options.body as string) : {};
        const newBody = {
          ...body,
          extensions: {
            ...body.extensions,
            authorization: auth?.replace('Bearer ', '') // Remove 'Bearer ' prefix
          }
        };

        return {
          url: `${proxyServers[1].url}?url=${encodeURIComponent(targetUrl)}`,
          options: {
            method: 'POST',
            body: JSON.stringify(newBody),
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            }
          }
        };
      }
      
      // For REST endpoints, include auth in the URL
      const authParam = auth ? `&authorization=${encodeURIComponent(auth.replace('Bearer ', ''))}` : '';
      return { 
        url: `${proxyServers[1].url}?url=${encodeURIComponent(targetUrl)}${authParam}`,
        options: {
          method: options?.method || 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          }
        }
      };
    }
  }
];

const HEALTH_CHECK_INTERVAL = 60000; // 1 minute

// Check proxy health
export async function checkProxyHealth(proxy: ProxyConfig): Promise<boolean> {
  try {
    let testUrl: string;
    let headers: Record<string, string> = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'authorization,content-type'
    };
    
    let options: RequestInit = {
      method: 'OPTIONS',
      headers
    };

    if (proxy.url === 'https://api.allorigins.win/raw') {
      testUrl = `${proxy.url}?url=${encodeURIComponent('https://api.meetup.com/status')}`;
      // AllOrigins doesn't support OPTIONS, use GET instead
      options.method = 'GET';
      headers = {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      };
      options.headers = headers;
    } else {
      testUrl = `${proxy.url}/proxy/status`;
    }

    console.log('Checking health for proxy:', proxy.url, 'with options:', options);
    const response = await fetch(testUrl, options);

    // For OPTIONS request, 204 or 200 is success
    if (options.method === 'OPTIONS' && (response.status === 204 || response.status === 200)) {
      console.log('OPTIONS request successful for proxy:', proxy.url);
      return true;
    }

    if (!response.ok) {
      console.warn(`Health check failed for proxy ${proxy.url}:`, {
        status: response.status,
        statusText: response.statusText
      });
      return false;
    }

    try {
      const contentType = response.headers.get('content-type');
      const isValidResponse = contentType?.includes('application/json') || 
                            contentType?.includes('text/plain') ||
                            contentType?.includes('text/html');

      if (!isValidResponse) {
        console.warn(`Invalid content type from proxy ${proxy.url}:`, contentType);
        return false;
      }

      const text = await response.text();
      
      // For AllOrigins, any valid response is good
      if (proxy.url === 'https://api.allorigins.win/raw') {
        return true;
      }

      // Try to parse as JSON if possible
      try {
        JSON.parse(text);
        return true;
      } catch {
        // If not JSON, check if it's a valid response
        return text.includes('status') || text.includes('ok');
      }
    } catch (parseError) {
      console.warn(`Error parsing response from proxy ${proxy.url}:`, parseError);
      return false;
    }
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

// Get default proxy configuration
export function getDefaultProxy(): ProxyConfig | null {
  // Get the first healthy proxy by priority
  return proxyServers
    .sort((a, b) => a.priority - b.priority)
    .find(p => p.isHealthy) || null;
}

// Get proxy configuration by URL
export function getProxyConfig(proxyUrl?: string): ProxyConfig | null {
  if (!proxyUrl) {
    return getDefaultProxy();
  }
  const config = proxyServers.find(p => proxyUrl.startsWith(p.url));
  console.log('Found proxy config for URL:', proxyUrl, 'Config:', config);
  return config || getDefaultProxy();
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