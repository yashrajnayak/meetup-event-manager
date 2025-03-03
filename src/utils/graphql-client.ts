import { ApolloClient, InMemoryCache, createHttpLink, from } from '@apollo/client';
import { onError } from '@apollo/client/link/error';
import { RetryLink } from '@apollo/client/link/retry';
import { getHealthyProxy, getGraphQLEndpoint, markProxyUnhealthy, getProxyConfig, transformRequest } from './proxy-config';

// Custom fetch function that applies proxy transformations
const customFetch = async (uri: string, options: RequestInit) => {
  const proxyConfig = getProxyConfig(uri);
  if (!proxyConfig) {
    console.warn('No proxy configuration found');
    throw new Error('No proxy configuration available');
  }

  let url = uri;
  let fetchOptions = { ...options };

  if (proxyConfig.transformRequest) {
    const transformed = proxyConfig.transformRequest(uri, options);
    url = transformed.url;
    fetchOptions = transformed.options;
  }

  console.log(`Using proxy: ${proxyConfig.url} for request`);
  
  try {
    const response = await fetch(url, fetchOptions);
    
    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`Proxy error: ${proxyConfig.url} returned ${response.status}`, errorBody);
      markProxyUnhealthy(proxyConfig.url);
      throw new Error(`Proxy request failed: ${response.status}`);
    }

    return response;
  } catch (error) {
    console.error(`Fetch error for ${proxyConfig.url}:`, error);
    markProxyUnhealthy(proxyConfig.url);
    throw error;
  }
};

// Error handling link with proxy fallback
const errorLink = onError(({ networkError, operation, forward }) => {
  if (networkError) {
    console.error('[Network error]:', networkError);
    
    // Get a new healthy proxy
    const newProxy = getHealthyProxy();
    if (!newProxy) {
      console.error('No healthy proxies available');
      return;
    }

    // Retry with new proxy
    operation.setContext({
      uri: `${newProxy.url}/proxy/gql`
    });

    return forward(operation);
  }
});

// Retry link with exponential backoff
const retryLink = new RetryLink({
  delay: {
    initial: 300,
    max: 10000,
    jitter: true,
  },
  attempts: {
    max: 5,
    retryIf: (error, _operation) => {
      // Don't retry if all proxies have failed
      if (error.message === 'All proxies failed') return false;
      // Don't retry if it's an invalid configuration
      if (error.message === 'Invalid proxy configuration') return false;
      return true;
    }
  },
});

// Create a function that returns configured client with auth token
export const createApolloClient = async (token: string) => {
  // Get initial healthy proxy
  const proxyUrl = await getHealthyProxy();
  if (!proxyUrl) {
    throw new Error('No healthy proxy available');
  }

  const proxyConfig = getProxyConfig(proxyUrl);
  if (!proxyConfig) {
    throw new Error('Invalid proxy configuration');
  }

  console.log('Creating Apollo client with proxy:', proxyUrl);

  return new ApolloClient({
    link: from([
      errorLink,
      retryLink,
      createHttpLink({
        uri: getGraphQLEndpoint(proxyUrl),
        credentials: proxyConfig.requiresCredentials ? 'include' : 'omit',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        fetchOptions: {
          mode: 'cors'
        },
        fetch: customFetch
      }),
    ]),
    cache: new InMemoryCache(),
    defaultOptions: {
      watchQuery: {
        fetchPolicy: 'network-only',
      },
      query: {
        fetchPolicy: 'network-only',
      },
    },
  });
}; 