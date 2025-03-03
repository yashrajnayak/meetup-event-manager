import { ApolloClient, InMemoryCache, createHttpLink, from } from '@apollo/client';
import { onError } from '@apollo/client/link/error';
import { RetryLink } from '@apollo/client/link/retry';

const PROXY_URL = 'https://meetup-proxy.oneyashraj.workers.dev/proxy/gql';

// Error handling link
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
    console.error(`[Network error]: ${networkError}`);
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

// HTTP link with auth header
const httpLink = createHttpLink({
  uri: PROXY_URL,
  credentials: 'include',
});

// Create a function that returns configured client with auth token
export const createApolloClient = (token: string) => {
  return new ApolloClient({
    link: from([
      errorLink,
      retryLink,
      createHttpLink({
        uri: PROXY_URL,
        credentials: 'include',
        headers: {
          authorization: `Bearer ${token}`,
        },
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