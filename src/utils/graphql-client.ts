import { ApolloClient, InMemoryCache, createHttpLink, from } from '@apollo/client';
import { onError } from '@apollo/client/link/error';
import { RetryLink } from '@apollo/client/link/retry';
import { getHealthyProxy, getGraphQLEndpoint, markProxyUnhealthy } from './proxy-config';

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
    
    // Check if it's a proxy error (status 530)
    if ('status' in networkError && networkError.status === 530) {
      const context = operation.getContext();
      const currentProxy = new URL(context.uri).origin + '/proxy';
      
      // Mark the current proxy as unhealthy
      markProxyUnhealthy(currentProxy);
      
      // Try to get a new healthy proxy
      return getHealthyProxy().then(proxyUrl => {
        if (proxyUrl) {
          // Update the operation with the new proxy
          operation.setContext({
            uri: getGraphQLEndpoint(proxyUrl)
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
    retryIf: (error, _operation) => !!error
  },
});

// Create a function that returns configured client with auth token
export const createApolloClient = async (token: string) => {
  // Get initial healthy proxy
  const proxyUrl = await getHealthyProxy();
  if (!proxyUrl) {
    throw new Error('No healthy proxy available');
  }

  return new ApolloClient({
    link: from([
      errorLink,
      retryLink,
      createHttpLink({
        uri: getGraphQLEndpoint(proxyUrl),
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        fetchOptions: {
          mode: 'cors'
        }
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