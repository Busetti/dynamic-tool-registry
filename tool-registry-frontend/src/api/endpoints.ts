import { apiClient } from './client';
import type {
  ConnectionTestResult,
  Group,
  GroupRequest,
  ParsedCurl,
  QuickRegisterRequest,
  HealthCheckResult,
  InvocationResult,
  McpStatus,
  PageResponse,
  RegisteredMcpTool,
  Tool,
  ToolListFilters,
  ToolRequest,
  ToolStatus,
  ToolSummary,
} from './types';

// Groups
export const groupsApi = {
  list: (params?: { tag?: string; businessArea?: string; search?: string }) =>
    apiClient.get<Group[]>('/groups', { params }).then((r) => r.data),
  get: (id: string) => apiClient.get<Group>(`/groups/${id}`).then((r) => r.data),
  create: (body: GroupRequest) => apiClient.post<Group>('/groups', body).then((r) => r.data),
  update: (id: string, body: GroupRequest) =>
    apiClient.put<Group>(`/groups/${id}`, body).then((r) => r.data),
  remove: (id: string, force = false) =>
    apiClient.delete(`/groups/${id}`, { params: { force } }).then((r) => r.data),
  tools: (id: string) => apiClient.get<ToolSummary[]>(`/groups/${id}/tools`).then((r) => r.data),
  regenerateMcpKey: (id: string) =>
    apiClient.post<Group>(`/groups/${id}/regenerate-mcp-key`).then((r) => r.data),
  attachTool: (id: string, toolId: string) =>
    apiClient.put<Tool>(`/groups/${id}/tools/${toolId}`).then((r) => r.data),
  detachTool: (id: string, toolId: string) =>
    apiClient.delete<Tool>(`/groups/${id}/tools/${toolId}`).then((r) => r.data),
};

// Tools
export const toolsApi = {
  list: (filters?: ToolListFilters) =>
    apiClient.get<PageResponse<ToolSummary>>('/tools', { params: filters }).then((r) => r.data),
  get: (id: string) => apiClient.get<Tool>(`/tools/${id}`).then((r) => r.data),
  create: (body: ToolRequest) => apiClient.post<Tool>('/tools', body).then((r) => r.data),
  update: (id: string, body: ToolRequest) =>
    apiClient.put<Tool>(`/tools/${id}`, body).then((r) => r.data),
  changeStatus: (id: string, status: ToolStatus) =>
    apiClient.patch<Tool>(`/tools/${id}/status`, { status }).then((r) => r.data),
  remove: (id: string) => apiClient.delete(`/tools/${id}`).then((r) => r.data),
  statusCounts: () =>
    apiClient.get<Record<string, number>>('/tools/stats/status-counts').then((r) => r.data),
  parseCurl: (curl: string) =>
    apiClient.post<ParsedCurl>('/tools/parse-curl', { curl }).then((r) => r.data),
  quickRegister: (body: QuickRegisterRequest) =>
    apiClient.post<Tool>('/tools/quick-register', body).then((r) => r.data),
};

// Testing
export const testingApi = {
  execute: (id: string, args: Record<string, unknown>) =>
    apiClient
      .post<InvocationResult>(`/tools/${id}/execute`, { arguments: args })
      .then((r) => r.data),
  testConnection: (id: string) =>
    apiClient.post<ConnectionTestResult>(`/tools/${id}/test-connection`).then((r) => r.data),
  health: (id: string) => apiClient.get<HealthCheckResult>(`/tools/${id}/health`).then((r) => r.data),
};

// MCP registry
export const mcpApi = {
  status: () => apiClient.get<McpStatus>('/mcp/status').then((r) => r.data),
  tools: () => apiClient.get<RegisteredMcpTool[]>('/mcp/tools').then((r) => r.data),
  search: (q: string) =>
    apiClient.get<ToolSummary[]>('/mcp/tools/search', { params: { q } }).then((r) => r.data),
  refresh: () => apiClient.post<{ registeredTools: number }>('/mcp/refresh').then((r) => r.data),
  groupTools: (groupId: string) =>
    apiClient.get<ToolSummary[]>(`/mcp/groups/${groupId}/tools`).then((r) => r.data),
};
