import { ApolloClient, InMemoryCache, createHttpLink, from } from '@apollo/client';
import { onError } from '@apollo/client/link/error';
import { RetryLink } from '@apollo/client/link/retry';
import { getHealthyProxy, getGraphQLEndpoint, markProxyUnhealthy, getProxyConfig, transformRequest } from './proxy-config';

// Custom fetch function that applies proxy transformations
const customFetch = async (uri: string, options: RequestInit) => {
  try {
    const proxyUrl = new URL(uri).origin;
    const proxyConfig = getProxyConfig(proxyUrl);
    
    if (!proxyConfig) {
      console.warn('No proxy config found for:', proxyUrl);
      return fetch(uri, options);
    }

    console.log('Using proxy:', proxyConfig.url, 'for URI:', uri);

    const { url, options: transformedOptions } = transformRequest(proxyConfig.url, uri, options);
    console.log('Transformed request:', { url, options: transformedOptions });

    const response = await fetch(url, transformedOptions);

    // Handle error responses
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Proxy error:', {
        proxy: proxyConfig.url,
        status: response.status,
        statusText: response.statusText,
        body: errorText
      });
      markProxyUnhealthy(proxyConfig.url);
      throw new Error(`Proxy request failed: ${response.status} ${response.statusText}`);
    }

    return response;
  } catch (error) {
    console.error('Fetch error:', error);
    throw error;
  }
};

// Error handling link with proxy fallback
const errorLink = onError(({ graphQLErrors, networkError, operation, forward }) => {
  if (graphQLErrors) {
    for (const err of graphQLErrors) {
      // Handle rate limiting
      if (err.extensions?.code === 'RATE_LIMITED') {
        const resetAt = err.extensions?.resetAt as string;
        console.warn(`Rate limited until ${resetAt}`);
        // Retry after the reset time
        const waitTime = new Date(resetAt).getTime() - Date.now();
        return new Promise(resolve => 
          setTimeout(() => resolve(forward(operation)), waitTime)
        );
      }
      
      console.error(
        `[GraphQL error]: Message: ${err.message}, Location: ${err.locations}, Path: ${err.path}`
      );
    }
  }
  if (networkError) {
    console.error(`[Network error]:`, networkError);
    
    // Check if it's a proxy error
    if ('status' in networkError && (
      networkError.status === 530 || 
      networkError.status === 403 || 
      networkError.message?.includes('Proxy request failed')
    )) {
      const context = operation.getContext();
      const currentProxy = new URL(context.uri).origin;
      
      console.log('Marking proxy as unhealthy:', currentProxy);
      markProxyUnhealthy(currentProxy);
      
      // Try to get a new healthy proxy
      return getHealthyProxy().then(proxyUrl => {
        if (proxyUrl) {
          const proxyConfig = getProxyConfig(proxyUrl);
          if (!proxyConfig) {
            throw new Error('Invalid proxy configuration');
          }

          console.log('Switching to proxy:', proxyUrl);
          
          // Update the operation with the new proxy
          operation.setContext({
            uri: getGraphQLEndpoint(proxyUrl),
            credentials: proxyConfig.requiresCredentials ? 'include' : 'omit',
            fetch: customFetch
          });
          
          // Retry the operation
          return forward(operation);
        }
        throw new Error('All proxies failed');
      });
    }
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