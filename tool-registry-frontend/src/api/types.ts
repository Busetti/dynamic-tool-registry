// TypeScript mirrors of the backend DTOs.

export type ToolStatus = 'DRAFT' | 'ACTIVE' | 'DEPRECATED' | 'DISABLED';
export type ToolType =
  | 'HTTP'
  | 'GRAPHQL'
  | 'SOAP'
  | 'GRPC'
  | 'DB_QUERY'
  | 'KAFKA'
  | 'JAVA_FUNCTION'
  | 'REMOTE_MCP';
export type HttpMethod = 'GET' | 'POST';

export interface Group {
  id: string;
  name: string;
  mcpKey?: string | null;
  mcpSseUrl?: string | null;
  mcpToolPrefix?: string | null;
  displayName: string;
  description?: string;
  businessArea?: string;
  teamName?: string;
  owner?: string;
  tags: string[];
  documentation?: string;
  toolCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface GroupRequest {
  name: string;
  displayName: string;
  description?: string;
  businessArea?: string;
  teamName?: string;
  owner?: string;
  tags?: string[];
  documentation?: string;
  mcpToolPrefix?: string | null;
}

export interface ToolParameter {
  name: string;
  type?: 'string' | 'number' | 'integer' | 'boolean';
  description?: string;
  required?: boolean;
  defaultValue?: string | null;
  enumValues?: string[] | null;
}

export interface ToolHeader {
  name: string;
  value?: string;
  description?: string;
  required?: boolean;
  sensitive?: boolean;
}

export interface HttpConfig {
  method: HttpMethod;
  uri: string;
  contentType?: string;
  timeoutMs?: number;
  headers?: ToolHeader[];
  queryParameters?: ToolParameter[];
  pathVariables?: ToolParameter[];
  bodyParameters?: ToolParameter[];
  requestBodyTemplate?: string | null;
}

export interface ExternalLink {
  title: string;
  url: string;
}

export interface Documentation {
  markdown?: string;
  swaggerUrl?: string;
  externalLinks?: ExternalLink[];
  notes?: string;
}

export interface RequestExample {
  name: string;
  description?: string;
  arguments?: Record<string, unknown>;
}

export interface ResponseExample {
  name: string;
  statusCode?: number;
  body?: string;
}

export interface ToolExamples {
  requestExamples?: RequestExample[];
  responseExamples?: ResponseExample[];
  responseSchema?: string | null;
}

export interface AiContext {
  naturalLanguageDescription?: string;
  useCases?: string[];
  expectedInputs?: string;
  expectedOutputs?: string;
  examplePrompts?: string[];
  keywords?: string[];
  businessDomain?: string;
  searchAliases?: string[];
}

export interface Tool {
  id: string;
  toolName: string;
  displayName: string;
  description: string;
  businessPurpose?: string;
  businessCapability?: string;
  category?: string;
  tags: string[];
  version?: string;
  status: ToolStatus;
  groupIds: string[];
  toolType: ToolType;
  httpConfig?: HttpConfig;
  responseControl?: ResponseControl | null;
  documentation?: Documentation;
  examples?: ToolExamples;
  aiContext?: AiContext;
  createdAt: string;
  updatedAt: string;
}

export interface ToolRequest {
  toolName: string;
  displayName: string;
  description: string;
  businessPurpose?: string;
  businessCapability?: string;
  category?: string;
  tags?: string[];
  version?: string;
  groupIds?: string[];
  toolType?: ToolType;
  httpConfig: HttpConfig;
  responseControl?: ResponseControl | null;
  documentation?: Documentation;
  examples?: ToolExamples;
  aiContext?: AiContext;
}

export interface ToolSummary {
  id: string;
  toolName: string;
  displayName: string;
  description: string;
  category?: string;
  tags: string[];
  version?: string;
  status: ToolStatus;
  groupIds: string[];
  toolType: ToolType;
  method?: HttpMethod;
  uri?: string;
  responseFormat?: ResponseFormat;
  limitEnabled?: boolean;
  updatedAt: string;
}

export interface PageResponse<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface ToolListFilters {
  status?: string;
  groupId?: string;
  category?: string;
  tag?: string;
  toolType?: string;
  search?: string;
  page?: number;
  size?: number;
  sort?: string;
}

export interface InvocationResult {
  success: boolean;
  statusCode?: number | null;
  durationMs: number;
  resolvedUri?: string | null;
  method?: string | null;
  requestHeaders?: Record<string, string> | null;
  requestBody?: string | null;
  responseHeaders?: Record<string, string> | null;
  responseBody?: string | null;
  error?: string | null;
}

export interface ConnectionTestResult {
  reachable: boolean;
  statusCode?: number | null;
  latencyMs: number;
  message?: string;
}

export interface HealthCheckResult {
  toolId: string;
  toolName: string;
  healthy: boolean;
  statusCode?: number | null;
  latencyMs: number;
  message?: string;
  checkedAt: string;
}

export interface McpStatus {
  serverName: string;
  serverVersion: string;
  transport: string;
  sseEndpoint: string;
  registeredToolCount: number;
  lastSyncAt?: string | null;
}

export interface RegisteredMcpTool {
  name: string;
  description?: string;
  inputSchema?: string | null;
}

export type ResponseFormat = 'JSON' | 'TOON';

export interface ResponseControl {
  format?: ResponseFormat;
  limitEnabled?: boolean;
  maxItems?: number | null;
  paginated?: boolean;
  limitParamName?: string | null;
  offsetParamName?: string | null;
  defaultLimit?: number | null;
}

export interface PlaygroundRunReport {
  toolId: string;
  toolName: string;
  success: boolean;
  statusCode?: number | null;
  durationMs: number;
  deliveredFormat?: ResponseFormat;
  responseJson?: string;
  responseToon?: string;
  tokensJson: number;
  tokensToon: number;
  tokensSaved: number;
  savedPct: number;
  definitionTokens: number;
  sizeBytes: number;
  originalItems: number;
  deliveredItems: number;
  truncated: boolean;
  warning: boolean;
  warningReason?: string | null;
  tokenEncoding: string;
  error?: string | null;
}

export interface ToolDefinitionCost {
  toolId: string;
  toolName: string;
  displayName: string;
  status: string;
  descriptionTokens: number;
  schemaTokens: number;
  definitionTokens: number;
}

export interface BatchToolResult {
  toolId: string;
  toolName: string;
  displayName: string;
  executed: boolean;
  skipReason?: string | null;
  statusCode?: number | null;
  durationMs: number;
  deliveredFormat?: ResponseFormat | null;
  responseTokens: number;
  tokensJson: number;
  tokensToon: number;
  definitionTokens: number;
  truncated: boolean;
  warning: boolean;
  warningReason?: string | null;
}

export interface BatchRunReport {
  results: BatchToolResult[];
  totalDefinitionTokens: number;
  totalResponseTokens: number;
  totalTokens: number;
  toolCount: number;
  executedCount: number;
  tokenEncoding: string;
}

export interface ContextTaxReport {
  tools: ToolDefinitionCost[];
  totalDefinitionTokens: number;
  toolCount: number;
  tokenEncoding: string;
}

export interface ParsedCurl {
  method: HttpMethod;
  uri: string;
  contentType?: string | null;
  headers: { name: string; value: string; sensitive: boolean }[];
  pathVariables: { name: string; type: string; defaultValue?: string | null; required: boolean }[];
  queryParameters: { name: string; type: string; defaultValue?: string | null; required: boolean }[];
  bodyParameters: { name: string; type: string; defaultValue?: string | null; required: boolean }[];
  requestBodyTemplate?: string | null;
  warnings: string[];
}

export interface QuickRegisterRequest {
  curl: string;
  toolName: string;
  displayName: string;
  description: string;
  businessPurpose?: string;
  category?: string;
  tags?: string[];
  groupIds?: string[];
}

export interface ProblemDetail {
  title?: string;
  status?: number;
  detail?: string;
  violations?: string[];
}
