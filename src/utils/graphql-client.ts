import { ApolloClient, InMemoryCache, ApolloLink, HttpLink, Observable } from '@apollo/client';
import { onError } from '@apollo/client/link/error';
import { RetryLink } from '@apollo/client/link/retry';
import { getProxyConfig, updateProxyHealth } from './proxy-config';

const MAX_RETRIES = 3;
const RATE_LIMIT_DELAY = 60000; // 60 seconds as per API docs

async function customFetch(input: string | URL | Request, init?: RequestInit): Promise<Response> {
  const uri = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
  const options = init || {};

  const proxyConfig = getProxyConfig();
  if (!proxyConfig) {
    console.error('No healthy proxy available for GraphQL request');
    throw new Error('No healthy proxy available');
  }

  if (!proxyConfig.transformRequest) {
    console.error('Proxy configuration is missing transformRequest function');
    throw new Error('Invalid proxy configuration');
  }

  // Ensure we have a proper GraphQL request
  if (options.body) {
    try {
      const body = typeof options.body === 'string' ? JSON.parse(options.body) : options.body;
      if (!body.query) {
        throw new Error('Missing GraphQL query');
      }
      // Re-stringify to ensure proper format
      options.body = JSON.stringify(body);
    } catch (error) {
      console.error('Invalid GraphQL request body:', error);
      throw new Error('Invalid GraphQL request');
    }
  }

  const { url, options: transformedOptions } = proxyConfig.transformRequest(uri, options);
  console.log('Using proxy:', proxyConfig.url, 'for URI:', url, 'with options:', {
    method: transformedOptions.method,
    headers: transformedOptions.headers,
    body: transformedOptions.body ? JSON.parse(transformedOptions.body as string) : undefined
  });

  try {
    const response = await fetch(url, transformedOptions);
    
    if (!response.ok) {
      let errorMessage = `Proxy request failed: ${response.status}`;
      try {
        const errorBody = await response.text();
        console.error('Proxy error:', {
          proxy: proxyConfig.url,
          status: response.status,
          statusText: response.statusText,
          body: errorBody,
          url,
          options: transformedOptions
        });

        // Try to parse error body as JSON
        try {
          const errorJson = JSON.parse(errorBody);
          if (errorJson.errors) {
            // Handle rate limiting
            const rateLimitError = errorJson.errors.find((e: any) => 
              e.extensions?.code === 'RATE_LIMITED'
            );
            if (rateLimitError) {
              const resetAt = new Date(rateLimitError.extensions.resetAt);
              const now = new Date();
              const waitTime = Math.max(resetAt.getTime() - now.getTime(), RATE_LIMIT_DELAY);
              console.log(`Rate limited. Waiting ${waitTime}ms before retrying...`);
              await new Promise(resolve => setTimeout(resolve, waitTime));
              return customFetch(input, init);
            }
            errorMessage = `GraphQL errors: ${JSON.stringify(errorJson.errors)}`;
          } else if (errorJson.message) {
            errorMessage = errorJson.message;
          }
        } catch {
          // If not JSON, use the error body as is
          errorMessage = errorBody;
        }
      } catch (error) {
        console.error('Error reading error response:', error);
      }

      // Mark proxy as unhealthy for specific error conditions
      if (response.status === 530 || response.status === 403 || response.status === 400) {
        updateProxyHealth(proxyConfig.url, false);
      }

      throw new Error(errorMessage);
    }

    // Validate JSON response
    const contentType = response.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      console.error('Invalid response content type:', contentType);
      throw new Error('Invalid response format');
    }

    return response;
  } catch (error) {
    console.error('Fetch error:', error);
    updateProxyHealth(proxyConfig.url, false);
    throw error;
  }
}

const errorLink = onError(({ networkError, operation, forward }) => {
  if (networkError) {
    console.error('[Network error]:', networkError);
    
    // Handle rate limiting errors
    if (networkError.message.includes('RATE_LIMITED')) {
      return new Observable(observer => {
        setTimeout(() => {
          forward(operation).subscribe(observer);
        }, RATE_LIMIT_DELAY);
      });
    }
    
    // If it's a proxy error, try with a different proxy
    if (networkError.message.includes('Proxy request failed') || 
        networkError.message.includes('Failed to fetch')) {
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
    initial: 1000,
    max: RATE_LIMIT_DELAY,
    jitter: true
  },
  attempts: {
    max: MAX_RETRIES,
    retryIf: (error, _operation) => {
      const shouldRetry = Boolean(
        error && 
        (error.message.includes('Proxy request failed') || 
         error.message.includes('Failed to fetch') ||
         error.message.includes('RATE_LIMITED'))
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