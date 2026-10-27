import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { App } from './app';
import {PrivacyRoot} from './api/privacy-root';
import { createAppQueryClient } from './api/query-client';
import './styles.css';

const queryClient = createAppQueryClient();
const root = document.getElementById('root');
if (!root) throw new Error('Missing application root');

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter><PrivacyRoot><App /></PrivacyRoot></BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
