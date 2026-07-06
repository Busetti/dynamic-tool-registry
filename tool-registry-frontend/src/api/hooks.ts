import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { groupsApi, mcpApi, playgroundApi, testingApi, toolsApi } from './endpoints';
import type { GroupRequest, ToolListFilters, ToolRequest, ToolStatus } from './types';

// ---- Groups ----

export function useGroups(params?: { tag?: string; businessArea?: string; search?: string }) {
  return useQuery({ queryKey: ['groups', params], queryFn: () => groupsApi.list(params) });
}

export function useGroup(id: string | undefined) {
  return useQuery({
    queryKey: ['groups', id],
    queryFn: () => groupsApi.get(id!),
    enabled: !!id,
  });
}

export function useGroupTools(id: string | undefined) {
  return useQuery({
    queryKey: ['groups', id, 'tools'],
    queryFn: () => groupsApi.tools(id!),
    enabled: !!id,
  });
}

export function useCreateGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: GroupRequest) => groupsApi.create(body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['groups'] }),
  });
}

export function useUpdateGroup(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: GroupRequest) => groupsApi.update(id, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['groups'] }),
  });
}

export function useRegenerateMcpKey() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => groupsApi.regenerateMcpKey(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      queryClient.invalidateQueries({ queryKey: ['mcp'] });
    },
  });
}

export function useAttachTool(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (toolId: string) => groupsApi.attachTool(groupId, toolId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      queryClient.invalidateQueries({ queryKey: ['tools'] });
      queryClient.invalidateQueries({ queryKey: ['mcp'] });
    },
  });
}

export function useDetachTool(groupId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (toolId: string) => groupsApi.detachTool(groupId, toolId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      queryClient.invalidateQueries({ queryKey: ['tools'] });
      queryClient.invalidateQueries({ queryKey: ['mcp'] });
    },
  });
}

export function useDeleteGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, force }: { id: string; force?: boolean }) => groupsApi.remove(id, force),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['groups'] }),
  });
}

// ---- Tools ----

export function useTools(filters?: ToolListFilters) {
  return useQuery({ queryKey: ['tools', filters], queryFn: () => toolsApi.list(filters) });
}

export function useTool(id: string | undefined) {
  return useQuery({
    queryKey: ['tools', id],
    queryFn: () => toolsApi.get(id!),
    enabled: !!id,
  });
}

export function useStatusCounts() {
  return useQuery({ queryKey: ['tools', 'status-counts'], queryFn: toolsApi.statusCounts });
}

function useInvalidateToolQueries() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ['tools'] });
    queryClient.invalidateQueries({ queryKey: ['groups'] });
    queryClient.invalidateQueries({ queryKey: ['mcp'] });
  };
}

export function useCreateTool() {
  const invalidate = useInvalidateToolQueries();
  return useMutation({
    mutationFn: (body: ToolRequest) => toolsApi.create(body),
    onSuccess: invalidate,
  });
}

export function useUpdateTool(id: string) {
  const invalidate = useInvalidateToolQueries();
  return useMutation({
    mutationFn: (body: ToolRequest) => toolsApi.update(id, body),
    onSuccess: invalidate,
  });
}

export function useChangeToolStatus() {
  const invalidate = useInvalidateToolQueries();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: ToolStatus }) =>
      toolsApi.changeStatus(id, status),
    onSuccess: invalidate,
  });
}

export function useDeleteTool() {
  const invalidate = useInvalidateToolQueries();
  return useMutation({
    mutationFn: (id: string) => toolsApi.remove(id),
    onSuccess: invalidate,
  });
}

export function useParseCurl() {
  return useMutation({ mutationFn: (curl: string) => toolsApi.parseCurl(curl) });
}

export function useQuickRegister() {
  const invalidate = useInvalidateToolQueries();
  return useMutation({
    mutationFn: (body: import('./types').QuickRegisterRequest) => toolsApi.quickRegister(body),
    onSuccess: invalidate,
  });
}

// ---- Testing ----

export function useExecuteTool(id: string) {
  return useMutation({
    mutationFn: (args: Record<string, unknown>) => testingApi.execute(id, args),
  });
}

export function useTestConnection(id: string) {
  return useMutation({ mutationFn: () => testingApi.testConnection(id) });
}

export function useToolHealth(id: string | undefined, enabled = false) {
  return useQuery({
    queryKey: ['tools', id, 'health'],
    queryFn: () => testingApi.health(id!),
    enabled: !!id && enabled,
    staleTime: 30_000,
  });
}

// ---- Playground ----

export function usePlaygroundRun() {
  return useMutation({
    mutationFn: (body: { toolId: string; arguments?: Record<string, unknown>; formatOverride?: string }) =>
      playgroundApi.run(body),
  });
}

export function usePlaygroundAnalyze() {
  return useMutation({ mutationFn: (toolIds: string[]) => playgroundApi.analyze(toolIds) });
}

export function usePlaygroundAnalyzeGroup() {
  return useMutation({ mutationFn: (groupId: string) => playgroundApi.analyzeGroup(groupId) });
}

export function usePlaygroundRunBatch() {
  return useMutation({ mutationFn: (toolIds: string[]) => playgroundApi.runBatch(toolIds) });
}

export function usePlaygroundRunBatchGroup() {
  return useMutation({ mutationFn: (groupId: string) => playgroundApi.runBatchGroup(groupId) });
}

// ---- MCP ----

export function useMcpStatus() {
  return useQuery({ queryKey: ['mcp', 'status'], queryFn: mcpApi.status, refetchInterval: 30_000 });
}

export function useMcpTools() {
  return useQuery({ queryKey: ['mcp', 'tools'], queryFn: mcpApi.tools });
}

export function useMcpSearch(q: string) {
  return useQuery({
    queryKey: ['mcp', 'search', q],
    queryFn: () => mcpApi.search(q),
    enabled: q.trim().length > 1,
  });
}

export function useMcpRefresh() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: mcpApi.refresh,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['mcp'] }),
  });
}
