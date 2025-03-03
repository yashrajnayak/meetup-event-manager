import React from 'react';
import ReactDOM from 'react-dom/client';
import { ApolloProvider } from '@apollo/client';
import { createApolloClient } from './utils/graphql-client';
import App from './App';
import './index.css';

// Create initial Apollo Client with no token
const client = createApolloClient('');

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ApolloProvider client={client}>
      <App />
    </ApolloProvider>
  </React.StrictMode>
);
