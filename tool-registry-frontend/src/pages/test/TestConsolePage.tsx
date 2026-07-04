import { useMemo, useState } from 'react';
import { Link as RouterLink, useParams } from 'react-router-dom';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid2';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import WifiTetheringIcon from '@mui/icons-material/WifiTethering';
import FavoriteIcon from '@mui/icons-material/MonitorHeart';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CircleIcon from '@mui/icons-material/Circle';
import { useSnackbar } from 'notistack';
import { useExecuteTool, useTestConnection, useTool, useToolHealth } from '@/api/hooks';
import { errorMessage } from '@/api/client';
import type { InvocationResult, ToolParameter } from '@/api/types';
import PageHeader from '@/components/layout/PageHeader';
import MethodChip from '@/components/common/MethodChip';
import StatusChip from '@/components/common/StatusChip';
import JsonViewer from '@/components/common/JsonViewer';
import MonacoJsonEditor from '@/components/common/MonacoJsonEditor';

function coerce(value: string, type?: string): unknown {
  if (value === '') return undefined;
  switch (type) {
    case 'integer':
    case 'number': {
      const n = Number(value);
      return Number.isNaN(n) ? value : n;
    }
    case 'boolean':
      return value === 'true';
    default:
      return value;
  }
}

export default function TestConsolePage() {
  const { id } = useParams<{ id: string }>();
  const { enqueueSnackbar } = useSnackbar();
  const { data: tool, isLoading } = useTool(id);
  const executeTool = useExecuteTool(id ?? '');
  const testConnection = useTestConnection(id ?? '');
  const [healthEnabled, setHealthEnabled] = useState(false);
  const { data: health, isFetching: healthLoading } = useToolHealth(id, healthEnabled);

  const [argValues, setArgValues] = useState<Record<string, string>>({});
  const [rawMode, setRawMode] = useState(false);
  const [rawJson, setRawJson] = useState('{}');
  const [result, setResult] = useState<InvocationResult | null>(null);
  const [responseTab, setResponseTab] = useState(0);

  const allParams = useMemo(() => {
    const http = tool?.httpConfig;
    return [
      ...(http?.pathVariables ?? []),
      ...(http?.queryParameters ?? []),
      ...(http?.bodyParameters ?? []),
    ] as ToolParameter[];
  }, [tool]);

  const buildArguments = (): Record<string, unknown> => {
    if (rawMode) {
      try {
        return JSON.parse(rawJson);
      } catch {
        throw new Error('Arguments JSON is not valid');
      }
    }
    const args: Record<string, unknown> = {};
    for (const param of allParams) {
      const coerced = coerce(argValues[param.name] ?? '', param.type);
      if (coerced !== undefined) args[param.name] = coerced;
    }
    return args;
  };

  const handleExecute = async () => {
    try {
      const invocation = await executeTool.mutateAsync(buildArguments());
      setResult(invocation);
      setResponseTab(0);
    } catch (error) {
      enqueueSnackbar(errorMessage(error), { variant: 'error' });
    }
  };

  const handleTestConnection = async () => {
    try {
      const test = await testConnection.mutateAsync();
      enqueueSnackbar(
        test.reachable
          ? `Reachable — HTTP ${test.statusCode} in ${test.latencyMs}ms`
          : `Unreachable: ${test.message}`,
        { variant: test.reachable ? 'success' : 'error' },
      );
    } catch (error) {
      enqueueSnackbar(errorMessage(error), { variant: 'error' });
    }
  };

  if (isLoading || !tool) {
    return <Skeleton variant="rounded" height={480} />;
  }

  return (
    <Box>
      <PageHeader
        title={`Test Console`}
        subtitle={tool.displayName}
        actions={
          <Button startIcon={<ArrowBackIcon />} component={RouterLink} to={`/tools/${id}`} color="inherit">
            Back to tool
          </Button>
        }
      />

      <Card sx={{ mb: 2.5 }}>
        <CardContent sx={{ py: 2 }}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ flexGrow: 1, minWidth: 0 }}>
              <MethodChip method={tool.httpConfig?.method} />
              <Typography
                variant="body2"
                sx={{ fontFamily: '"JetBrains Mono", monospace', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
              >
                {tool.httpConfig?.uri}
              </Typography>
              <StatusChip status={tool.status} />
            </Stack>
            <Stack direction="row" spacing={1}>
              <Button
                variant="outlined"
                size="small"
                startIcon={<WifiTetheringIcon />}
                onClick={handleTestConnection}
                disabled={testConnection.isPending}
              >
                Test connection
              </Button>
              <Button
                variant="outlined"
                size="small"
                startIcon={
                  healthLoading ? <CircularProgress size={14} /> : <FavoriteIcon />
                }
                onClick={() => setHealthEnabled(true)}
              >
                Health check
              </Button>
              {health && healthEnabled && (
                <Chip
                  icon={<CircleIcon sx={{ fontSize: 10 }} />}
                  label={health.healthy ? `Healthy · ${health.latencyMs}ms` : 'Unhealthy'}
                  color={health.healthy ? 'success' : 'error'}
                  size="small"
                  variant="outlined"
                />
              )}
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      <Grid container spacing={2.5}>
        {/* Request panel */}
        <Grid size={{ xs: 12, md: 5 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                <Typography variant="h6">Request</Typography>
                <FormControlLabel
                  control={<Switch size="small" checked={rawMode} onChange={(e) => setRawMode(e.target.checked)} />}
                  label={<Typography variant="caption">Raw JSON</Typography>}
                />
              </Stack>

              {rawMode ? (
                <MonacoJsonEditor value={rawJson} onChange={setRawJson} height={280} />
              ) : allParams.length ? (
                <Stack spacing={2}>
                  {allParams.map((param) => (
                    <TextField
                      key={param.name}
                      size="small"
                      label={param.name + (param.required ? ' *' : '')}
                      helperText={[param.type ?? 'string', param.description].filter(Boolean).join(' — ')}
                      value={argValues[param.name] ?? param.defaultValue ?? ''}
                      onChange={(e) => setArgValues((prev) => ({ ...prev, [param.name]: e.target.value }))}
                      select={!!param.enumValues?.length || param.type === 'boolean'}
                    >
                      {(param.enumValues?.length
                        ? param.enumValues
                        : param.type === 'boolean'
                          ? ['true', 'false']
                          : []
                      ).map((option) => (
                        <option
                          key={option}
                          value={option}
                          style={{ padding: 8 }}
                        >
                          {option}
                        </option>
                      ))}
                    </TextField>
                  ))}
                </Stack>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  This tool takes no arguments.
                </Typography>
              )}

              <Button
                fullWidth
                variant="contained"
                size="large"
                startIcon={executeTool.isPending ? <CircularProgress size={18} color="inherit" /> : <PlayArrowIcon />}
                onClick={handleExecute}
                disabled={executeTool.isPending}
                sx={{ mt: 3 }}
              >
                Execute
              </Button>
            </CardContent>
          </Card>
        </Grid>

        {/* Response panel */}
        <Grid size={{ xs: 12, md: 7 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 1.5 }}>
                <Typography variant="h6" sx={{ flexGrow: 1 }}>
                  Response
                </Typography>
                {result && (
                  <>
                    <Chip
                      label={result.statusCode ? `HTTP ${result.statusCode}` : 'ERROR'}
                      color={result.success ? 'success' : 'error'}
                      size="small"
                    />
                    <Typography variant="caption" color="text.secondary">
                      {result.durationMs} ms
                    </Typography>
                  </>
                )}
              </Stack>

              {!result ? (
                <Box sx={{ py: 8, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.secondary">
                    Execute the tool to see the full request/response exchange here.
                  </Typography>
                </Box>
              ) : (
                <>
                  <Tabs value={responseTab} onChange={(_, v) => setResponseTab(v)} sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}>
                    <Tab label="Response body" />
                    <Tab label="Response headers" />
                    <Tab label="Request sent" />
                  </Tabs>

                  {responseTab === 0 && (
                    <>
                      {result.error && (
                        <Typography variant="body2" color="error" sx={{ mb: 1.5, fontFamily: '"JetBrains Mono", monospace' }}>
                          {result.error}
                        </Typography>
                      )}
                      <JsonViewer value={result.responseBody ?? ''} maxHeight={420} />
                    </>
                  )}
                  {responseTab === 1 && (
                    <JsonViewer value={JSON.stringify(result.responseHeaders ?? {}, null, 2)} maxHeight={420} />
                  )}
                  {responseTab === 2 && (
                    <Box>
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
                        <MethodChip method={result.method ?? undefined} />
                        <Typography variant="body2" sx={{ fontFamily: '"JetBrains Mono", monospace', wordBreak: 'break-all' }}>
                          {result.resolvedUri}
                        </Typography>
                      </Stack>
                      <Typography variant="caption" fontWeight={700} color="text.secondary">
                        HEADERS (sensitive values masked)
                      </Typography>
                      <JsonViewer value={JSON.stringify(result.requestHeaders ?? {}, null, 2)} maxHeight={160} />
                      {result.requestBody && (
                        <>
                          <Divider sx={{ my: 1.5 }} />
                          <Typography variant="caption" fontWeight={700} color="text.secondary">
                            BODY
                          </Typography>
                          <JsonViewer value={result.requestBody} maxHeight={200} />
                        </>
                      )}
                    </Box>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
