import React from 'react';
import ReactDOM from 'react-dom/client';
import { ApolloProvider } from '@apollo/client';
import { client } from './utils/graphql-client';
import App from './App';
import './index.css';

// Log environment info
console.log('Environment:', {
  mode: import.meta.env.MODE,
  base: import.meta.env.BASE_URL,
  hasClientId: !!import.meta.env.VITE_MEETUP_CLIENT_ID,
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ApolloProvider client={client}>
      <App />
    </ApolloProvider>
  </React.StrictMode>
);
