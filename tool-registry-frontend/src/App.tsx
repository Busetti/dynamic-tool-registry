import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SnackbarProvider } from 'notistack';
import { ThemeModeProvider } from '@/theme/ThemeModeContext';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import AppShell from '@/components/layout/AppShell';
import DashboardPage from '@/pages/DashboardPage';
import ToolListPage from '@/pages/tools/ToolListPage';
import ToolDetailPage from '@/pages/tools/ToolDetailPage';
import ToolCreatePage from '@/pages/tools/ToolCreatePage';
import ToolEditPage from '@/pages/tools/ToolEditPage';
import TestConsolePage from '@/pages/test/TestConsolePage';
import GroupListPage from '@/pages/groups/GroupListPage';
import GroupDetailPage from '@/pages/groups/GroupDetailPage';
import McpRegistryPage from '@/pages/mcp/McpRegistryPage';
import PlaygroundPage from '@/pages/playground/PlaygroundPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 15_000, retry: 1, refetchOnWindowFocus: false },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeModeProvider>
        <SnackbarProvider maxSnack={3} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
          <BrowserRouter>
            <ErrorBoundary>
              <Routes>
                <Route element={<AppShell />}>
                  <Route path="/" element={<DashboardPage />} />
                  <Route path="/tools" element={<ToolListPage />} />
                  <Route path="/tools/new" element={<ToolCreatePage />} />
                  <Route path="/tools/:id" element={<ToolDetailPage />} />
                  <Route path="/tools/:id/edit" element={<ToolEditPage />} />
                  <Route path="/tools/:id/test" element={<TestConsolePage />} />
                  <Route path="/groups" element={<GroupListPage />} />
                  <Route path="/groups/:id" element={<GroupDetailPage />} />
                  <Route path="/playground" element={<PlaygroundPage />} />
                  <Route path="/mcp" element={<McpRegistryPage />} />
                </Route>
              </Routes>
            </ErrorBoundary>
          </BrowserRouter>
        </SnackbarProvider>
      </ThemeModeProvider>
    </QueryClientProvider>
  );
}
