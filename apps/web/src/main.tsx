import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { App } from './app';
import {PrivacyRoot} from './api/privacy-root';
import './styles.css';

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, refetchOnWindowFocus:false } } });
queryClient.setQueryDefaults(['private'],{gcTime:0,staleTime:0});
queryClient.setQueryDefaults(['public'],{staleTime:30000});
const root = document.getElementById('root');
if (!root) throw new Error('Missing application root');

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter><PrivacyRoot><App /></PrivacyRoot></BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
