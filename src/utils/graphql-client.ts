import { ApolloClient, InMemoryCache, ApolloLink, HttpLink } from '@apollo/client';
import { onError } from '@apollo/client/link/error';
import { RetryLink } from '@apollo/client/link/retry';
import { getProxyConfig, updateProxyHealth } from './proxy-config';

const MAX_RETRIES = 3;

async function customFetch(uri: string, options: RequestInit): Promise<Response> {
  const proxyConfig = getProxyConfig();
  if (!proxyConfig) {
    console.warn('No healthy proxy available for GraphQL request');
    throw new Error('No healthy proxy available');
  }

  const { url, options: transformedOptions } = proxyConfig.transformRequest?.(uri, options) || { url: uri, options };
  console.log('Using proxy:', proxyConfig.url, 'for URI:', url);

  const response = await fetch(url, transformedOptions);
  
  if (!response.ok) {
    const errorBody = await response.text();
    console.error('Proxy error:', {
      proxy: proxyConfig.url,
      status: response.status,
      statusText: response.statusText,
      body: errorBody
    });

    // Mark proxy as unhealthy for specific error conditions
    if (response.status === 530 || response.status === 403 || errorBody.includes('error code: 1016')) {
      updateProxyHealth(proxyConfig.url, false);
    }

    throw new Error(`Proxy request failed: ${response.status}`);
  }

  return response;
}

const errorLink = onError(({ networkError, operation, forward }) => {
  if (networkError) {
    console.error('[Network error]:', networkError);
    
    // If it's a proxy error, try with a different proxy
    if (networkError.message.includes('Proxy request failed') || 
        networkError.message.includes('Failed to fetch') ||
        networkError.message.includes('error code: 1016')) {
      const currentProxy = getProxyConfig();
      if (currentProxy) {
        updateProxyHealth(currentProxy.url, false);
      }
      
      // Retry the operation
      return forward(operation);
    }
  }
});

const retryLink = new RetryLink({
  delay: {
    initial: 300,
    max: 3000,
    jitter: true
  },
  attempts: {
    max: MAX_RETRIES,
    retryIf: (error, _operation) => {
      const shouldRetry = Boolean(
        error && 
        (error.message.includes('Proxy request failed') || 
         error.message.includes('Failed to fetch') ||
         error.message.includes('error code: 1016'))
      );
      
      // Only retry if we have a healthy proxy available
      return shouldRetry && Boolean(getProxyConfig());
    }
  }
});

const httpLink = new HttpLink({
  uri: '/gql',
  fetch: customFetch
});

export const client = new ApolloClient({
  link: ApolloLink.from([errorLink, retryLink, httpLink]),
  cache: new InMemoryCache()
}); 