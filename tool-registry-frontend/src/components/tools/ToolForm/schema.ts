import { z } from 'zod';
import type { Tool, ToolRequest } from '@/api/types';

export const parameterSchema = z.object({
  name: z
    .string()
    .min(1, 'Required')
    .regex(/^[a-zA-Z][a-zA-Z0-9_]{0,63}$/, 'Letters, digits, underscores; start with a letter'),
  type: z.enum(['string', 'number', 'integer', 'boolean']),
  description: z.string().max(1000).optional(),
  required: z.boolean(),
  defaultValue: z.string().optional(),
  enumCsv: z.string().optional(),
});

export const headerSchema = z.object({
  name: z.string().min(1, 'Required').max(200),
  value: z.string().max(4000).optional(),
  description: z.string().max(1000).optional(),
  required: z.boolean(),
  sensitive: z.boolean(),
});

export const toolFormSchema = z.object({
  // Step 1 — Basic
  toolName: z
    .string()
    .regex(
      /^[a-z][a-z0-9_]{2,63}$/,
      'snake_case: lowercase letters, digits, underscores (3–64 chars)',
    ),
  displayName: z.string().min(1, 'Required').max(200),
  description: z.string().min(1, 'Required').max(5000),
  businessPurpose: z.string().max(5000).optional(),
  businessCapability: z.string().max(200).optional(),
  category: z.string().max(100).optional(),
  tags: z.array(z.string()).optional(),
  version: z.string().max(20).optional(),
  groupIds: z.array(z.string()).optional(),

  // Step 2 — Technical
  method: z.enum(['GET', 'POST']),
  uri: z
    .string()
    .min(1, 'Required')
    .regex(/^https?:\/\/.+/, 'Must be an absolute http(s) URI'),
  contentType: z.string().optional(),
  timeoutMs: z.coerce.number().min(100).max(120000),
  requestBodyTemplate: z.string().optional(),

  // Step 3 — Parameters
  headers: z.array(headerSchema),
  pathVariables: z.array(parameterSchema),
  queryParameters: z.array(parameterSchema),
  bodyParameters: z.array(parameterSchema),

  // Step 4 — Documentation
  docMarkdown: z.string().optional(),
  swaggerUrl: z.string().optional(),
  externalLinks: z.array(z.object({ title: z.string().min(1), url: z.string().min(1) })),
  notes: z.string().optional(),
  responseSchema: z.string().optional(),
  requestExampleJson: z.string().optional(),
  responseExampleJson: z.string().optional(),

  // Step 5 — AI context
  naturalLanguageDescription: z.string().optional(),
  useCases: z.array(z.string()).optional(),
  expectedInputs: z.string().optional(),
  expectedOutputs: z.string().optional(),
  examplePrompts: z.array(z.string()).optional(),
  keywords: z.array(z.string()).optional(),
  businessDomain: z.string().optional(),
  searchAliases: z.array(z.string()).optional(),
});

export type ToolFormValues = z.infer<typeof toolFormSchema>;

export const emptyToolForm: ToolFormValues = {
  toolName: '',
  displayName: '',
  description: '',
  businessPurpose: '',
  businessCapability: '',
  category: '',
  tags: [],
  version: '1.0.0',
  groupIds: [],
  method: 'GET',
  uri: '',
  contentType: 'application/json',
  timeoutMs: 10000,
  requestBodyTemplate: '',
  headers: [],
  pathVariables: [],
  queryParameters: [],
  bodyParameters: [],
  docMarkdown: '',
  swaggerUrl: '',
  externalLinks: [],
  notes: '',
  responseSchema: '',
  requestExampleJson: '',
  responseExampleJson: '',
  naturalLanguageDescription: '',
  useCases: [],
  expectedInputs: '',
  expectedOutputs: '',
  examplePrompts: [],
  keywords: [],
  businessDomain: '',
  searchAliases: [],
};

function toApiParams(params: ToolFormValues['pathVariables']) {
  return params.map((p) => ({
    name: p.name,
    type: p.type,
    description: p.description || undefined,
    required: p.required,
    defaultValue: p.defaultValue || null,
    enumValues: p.enumCsv
      ? p.enumCsv.split(',').map((s) => s.trim()).filter(Boolean)
      : null,
  }));
}

/** Maps flat wizard values to the backend ToolRequest shape. */
export function toToolRequest(values: ToolFormValues): ToolRequest {
  let requestExamples;
  let responseExamples;
  try {
    requestExamples = values.requestExampleJson
      ? [{ name: 'example', arguments: JSON.parse(values.requestExampleJson) }]
      : undefined;
  } catch {
    requestExamples = undefined;
  }
  if (values.responseExampleJson) {
    responseExamples = [{ name: 'example', statusCode: 200, body: values.responseExampleJson }];
  }

  return {
    toolName: values.toolName,
    displayName: values.displayName,
    description: values.description,
    businessPurpose: values.businessPurpose || undefined,
    businessCapability: values.businessCapability || undefined,
    category: values.category || undefined,
    tags: values.tags,
    version: values.version || undefined,
    groupIds: values.groupIds,
    toolType: 'HTTP',
    httpConfig: {
      method: values.method,
      uri: values.uri,
      contentType: values.contentType || 'application/json',
      timeoutMs: values.timeoutMs,
      headers: values.headers,
      pathVariables: toApiParams(values.pathVariables),
      queryParameters: toApiParams(values.queryParameters),
      bodyParameters: toApiParams(values.bodyParameters),
      requestBodyTemplate:
        values.method === 'POST' && values.requestBodyTemplate ? values.requestBodyTemplate : null,
    },
    documentation: {
      markdown: values.docMarkdown || undefined,
      swaggerUrl: values.swaggerUrl || undefined,
      externalLinks: values.externalLinks,
      notes: values.notes || undefined,
    },
    examples: {
      requestExamples,
      responseExamples,
      responseSchema: values.responseSchema || null,
    },
    aiContext: {
      naturalLanguageDescription: values.naturalLanguageDescription || undefined,
      useCases: values.useCases,
      expectedInputs: values.expectedInputs || undefined,
      expectedOutputs: values.expectedOutputs || undefined,
      examplePrompts: values.examplePrompts,
      keywords: values.keywords,
      businessDomain: values.businessDomain || undefined,
      searchAliases: values.searchAliases,
    },
  };
}

/** Maps an existing tool back into wizard form values for editing. */
export function fromTool(tool: Tool): ToolFormValues {
  const http = tool.httpConfig;
  const fromApiParams = (params?: { name: string; type?: string; description?: string; required?: boolean; defaultValue?: string | null; enumValues?: string[] | null }[]) =>
    (params ?? []).map((p) => ({
      name: p.name,
      type: (p.type ?? 'string') as 'string' | 'number' | 'integer' | 'boolean',
      description: p.description ?? '',
      required: p.required ?? true,
      defaultValue: p.defaultValue ?? '',
      enumCsv: p.enumValues?.join(', ') ?? '',
    }));

  return {
    toolName: tool.toolName,
    displayName: tool.displayName,
    description: tool.description,
    businessPurpose: tool.businessPurpose ?? '',
    businessCapability: tool.businessCapability ?? '',
    category: tool.category ?? '',
    tags: tool.tags ?? [],
    version: tool.version ?? '1.0.0',
    groupIds: tool.groupIds ?? [],
    method: (http?.method ?? 'GET') as 'GET' | 'POST',
    uri: http?.uri ?? '',
    contentType: http?.contentType ?? 'application/json',
    timeoutMs: http?.timeoutMs ?? 10000,
    requestBodyTemplate: http?.requestBodyTemplate ?? '',
    headers: (http?.headers ?? []).map((h) => ({
      name: h.name,
      value: h.value ?? '',
      description: h.description ?? '',
      required: h.required ?? false,
      sensitive: h.sensitive ?? false,
    })),
    pathVariables: fromApiParams(http?.pathVariables),
    queryParameters: fromApiParams(http?.queryParameters),
    bodyParameters: fromApiParams(http?.bodyParameters),
    docMarkdown: tool.documentation?.markdown ?? '',
    swaggerUrl: tool.documentation?.swaggerUrl ?? '',
    externalLinks: tool.documentation?.externalLinks ?? [],
    notes: tool.documentation?.notes ?? '',
    responseSchema: tool.examples?.responseSchema ?? '',
    requestExampleJson: tool.examples?.requestExamples?.[0]?.arguments
      ? JSON.stringify(tool.examples.requestExamples[0].arguments, null, 2)
      : '',
    responseExampleJson: tool.examples?.responseExamples?.[0]?.body ?? '',
    naturalLanguageDescription: tool.aiContext?.naturalLanguageDescription ?? '',
    useCases: tool.aiContext?.useCases ?? [],
    expectedInputs: tool.aiContext?.expectedInputs ?? '',
    expectedOutputs: tool.aiContext?.expectedOutputs ?? '',
    examplePrompts: tool.aiContext?.examplePrompts ?? [],
    keywords: tool.aiContext?.keywords ?? [],
    businessDomain: tool.aiContext?.businessDomain ?? '',
    searchAliases: tool.aiContext?.searchAliases ?? [],
  };
}
