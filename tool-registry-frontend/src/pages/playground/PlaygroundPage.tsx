import { useMemo, useState } from 'react';
import Alert from '@mui/material/Alert';
import Autocomplete from '@mui/material/Autocomplete';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid2';
import LinearProgress from '@mui/material/LinearProgress';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Tabs from '@mui/material/Tabs';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import QueryStatsIcon from '@mui/icons-material/QueryStats';
import ScienceIcon from '@mui/icons-material/Science';
import { useSnackbar } from 'notistack';
import { useGroups, usePlaygroundRun, usePlaygroundRunBatch, usePlaygroundRunBatchGroup, useTool, useTools } from '@/api/hooks';
import { errorMessage } from '@/api/client';
import type { BatchRunReport, PlaygroundRunReport, ResponseFormat } from '@/api/types';
import PageHeader from '@/components/layout/PageHeader';
import JsonViewer from '@/components/common/JsonViewer';
import MonacoJsonEditor from '@/components/common/MonacoJsonEditor';
import TokenWarningBadge from '@/components/common/TokenWarningBadge';
import MethodChip from '@/components/common/MethodChip';

function formatTokens(n: number) {
  return n.toLocaleString();
}

/** Side-by-side JSON vs TOON token bar. */
function TokenComparison({ report }: { report: PlaygroundRunReport }) {
  const max = Math.max(report.tokensJson, report.tokensToon, 1);
  return (
    <Stack spacing={1.5}>
      {(
        [
          { label: 'JSON', tokens: report.tokensJson, color: 'primary' as const },
          { label: 'TOON', tokens: report.tokensToon, color: 'success' as const },
        ]
      ).map((row) => (
        <Box key={row.label}>
          <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.25 }}>
            <Typography variant="caption" fontWeight={700}>
              {row.label}
              {report.deliveredFormat === row.label && (
                <Chip label="delivered" size="small" color={row.color} sx={{ ml: 1, height: 16, fontSize: 10 }} />
              )}
            </Typography>
            <Typography variant="caption" sx={{ fontFamily: '"JetBrains Mono", monospace' }}>
              {formatTokens(row.tokens)} tokens
            </Typography>
          </Stack>
          <LinearProgress
            variant="determinate"
            color={row.color}
            value={(row.tokens / max) * 100}
            sx={{ height: 8, borderRadius: 4 }}
          />
        </Box>
      ))}
      <Typography variant="body2" color={report.tokensSaved > 0 ? 'success.main' : 'text.secondary'} fontWeight={600}>
        {report.tokensSaved > 0
          ? `TOON saves ${formatTokens(report.tokensSaved)} tokens (${report.savedPct}%) on this response`
          : 'TOON does not reduce tokens for this response shape'}
      </Typography>
    </Stack>
  );
}

function SingleToolTab() {
  const { enqueueSnackbar } = useSnackbar();
  const { data: toolsPage } = useTools({ size: 100 });
  const [toolId, setToolId] = useState('');
  const { data: tool } = useTool(toolId || undefined);
  const [argsJson, setArgsJson] = useState('{}');
  const [format, setFormat] = useState<'SAVED' | ResponseFormat>('SAVED');
  const [preview, setPreview] = useState<ResponseFormat>('JSON');
  const run = usePlaygroundRun();

  const tools = toolsPage?.content ?? [];
  const report = run.data;

  const argHint = useMemo(() => {
    const params = [
      ...(tool?.httpConfig?.pathVariables ?? []),
      ...(tool?.httpConfig?.queryParameters ?? []),
      ...(tool?.httpConfig?.bodyParameters ?? []),
    ];
    return params.length ? `Parameters: ${params.map((p) => p.name).join(', ')}` : 'This tool takes no parameters';
  }, [tool]);

  const handleRun = async () => {
    let args: Record<string, unknown> = {};
    try {
      args = argsJson.trim() ? JSON.parse(argsJson) : {};
    } catch {
      enqueueSnackbar('Arguments must be valid JSON', { variant: 'error' });
      return;
    }
    try {
      const result = await run.mutateAsync({
        toolId,
        arguments: args,
        formatOverride: format === 'SAVED' ? undefined : format,
      });
      setPreview(result.deliveredFormat ?? 'JSON');
    } catch (error) {
      enqueueSnackbar(errorMessage(error), { variant: 'error' });
    }
  };

  return (
    <Grid container spacing={2.5}>
      <Grid size={{ xs: 12, md: 5 }}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Run a tool
            </Typography>
            <Autocomplete
              options={tools}
              getOptionLabel={(t) => t.displayName}
              value={tools.find((t) => t.id === toolId) ?? null}
              onChange={(_, v) => {
                setToolId(v?.id ?? '');
                run.reset();
              }}
              renderOption={(props, t) => (
                <li {...props} key={t.id}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    {t.method && <MethodChip method={t.method} />}
                    <span>{t.displayName}</span>
                    <Typography variant="caption" color="text.secondary" sx={{ fontFamily: '"JetBrains Mono", monospace' }}>
                      {t.toolName}
                    </Typography>
                  </Stack>
                </li>
              )}
              renderInput={(params) => <TextField {...params} label="Tool" />}
              sx={{ mb: 2 }}
            />
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.5 }}>
              Arguments (JSON)
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
              {toolId ? argHint : 'Select a tool first'}
            </Typography>
            <MonacoJsonEditor value={argsJson} onChange={(v) => setArgsJson(v ?? '{}')} height={140} />
            <Stack direction="row" spacing={2} alignItems="center" sx={{ mt: 2 }}>
              <TextField
                select
                size="small"
                label="Format"
                value={format}
                onChange={(e) => setFormat(e.target.value as 'SAVED' | ResponseFormat)}
                sx={{ width: 200 }}
              >
                <MenuItem value="SAVED">Tool's saved format</MenuItem>
                <MenuItem value="JSON">Preview as JSON</MenuItem>
                <MenuItem value="TOON">Preview as TOON</MenuItem>
              </TextField>
              <Button
                variant="contained"
                startIcon={run.isPending ? <CircularProgress size={14} /> : <PlayArrowIcon />}
                onClick={handleRun}
                disabled={!toolId || run.isPending}
              >
                Run &amp; analyze
              </Button>
            </Stack>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, md: 7 }}>
        {!report ? (
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 8 }}>
              <ScienceIcon sx={{ fontSize: 44, color: 'text.disabled', mb: 1 }} />
              <Typography color="text.secondary">
                Run a tool to see exactly what the AI model receives and what it costs in tokens.
              </Typography>
            </CardContent>
          </Card>
        ) : !report.success ? (
          <Alert severity="error">{report.error}</Alert>
        ) : (
          <Card>
            <CardContent>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }} flexWrap="wrap" useFlexGap>
                <Typography variant="h6" sx={{ flexGrow: 1 }}>
                  Token report
                </Typography>
                {report.warning && report.warningReason && <TokenWarningBadge reason={report.warningReason} />}
                <Chip size="small" label={`HTTP ${report.statusCode} · ${report.durationMs} ms`} />
                <Chip size="small" label={`definition: ${formatTokens(report.definitionTokens)} tk`} variant="outlined" />
                {report.truncated && (
                  <Chip
                    size="small"
                    color="warning"
                    label={`truncated ${report.originalItems} → ${report.deliveredItems} items`}
                  />
                )}
              </Stack>

              {report.warning && report.warningReason && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                  {report.warningReason}
                </Alert>
              )}

              <TokenComparison report={report} />

              <Divider sx={{ my: 2 }} />
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                <Typography variant="subtitle2" fontWeight={700}>
                  Delivered payload preview
                </Typography>
                <ToggleButtonGroup
                  exclusive
                  size="small"
                  value={preview}
                  onChange={(_, v) => v && setPreview(v)}
                >
                  <ToggleButton value="JSON">JSON</ToggleButton>
                  <ToggleButton value="TOON">TOON</ToggleButton>
                </ToggleButtonGroup>
              </Stack>
              <JsonViewer
                value={(preview === 'TOON' ? report.responseToon : report.responseJson) ?? ''}
                maxHeight={320}
              />
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>
                Token counts are {report.tokenEncoding}.
              </Typography>
            </CardContent>
          </Card>
        )}
      </Grid>
    </Grid>
  );
}

function BatchRunTab() {
  const { enqueueSnackbar } = useSnackbar();
  const { data: toolsPage } = useTools({ size: 100 });
  const { data: groups } = useGroups();
  const [mode, setMode] = useState<'tools' | 'group'>('tools');
  const [toolIds, setToolIds] = useState<string[]>([]);
  const [groupId, setGroupId] = useState('');
  const runBatch = usePlaygroundRunBatch();
  const runBatchGroup = usePlaygroundRunBatchGroup();

  const tools = toolsPage?.content ?? [];
  const report: BatchRunReport | undefined = mode === 'tools' ? runBatch.data : runBatchGroup.data;
  const pending = runBatch.isPending || runBatchGroup.isPending;

  const handleRun = async () => {
    try {
      if (mode === 'tools') await runBatch.mutateAsync(toolIds);
      else await runBatchGroup.mutateAsync(groupId);
    } catch (error) {
      enqueueSnackbar(errorMessage(error), { variant: 'error' });
    }
  };

  const maxTotal = Math.max(
    ...(report?.results.map((t) => t.definitionTokens + t.responseTokens) ?? [1]),
    1,
  );

  return (
    <Grid container spacing={2.5}>
      <Grid size={{ xs: 12, md: 4 }}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Run a toolset
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Executes every selected tool (using its parameter defaults) and measures the real token usage an agent
              would pay: tool definitions + actual responses.
            </Typography>
            <ToggleButtonGroup
              exclusive
              size="small"
              value={mode}
              onChange={(_, v) => v && setMode(v)}
              sx={{ mb: 2 }}
            >
              <ToggleButton value="tools">Pick tools</ToggleButton>
              <ToggleButton value="group">Whole group</ToggleButton>
            </ToggleButtonGroup>

            {mode === 'tools' ? (
              <Autocomplete
                multiple
                options={tools}
                getOptionLabel={(t) => t.displayName}
                value={tools.filter((t) => toolIds.includes(t.id))}
                onChange={(_, v) => setToolIds(v.map((t) => t.id))}
                renderInput={(params) => <TextField {...params} label="Tools" placeholder="Select tools" />}
                sx={{ mb: 2 }}
              />
            ) : (
              <TextField
                select
                fullWidth
                label="Group (ACTIVE tools)"
                value={groupId}
                onChange={(e) => setGroupId(e.target.value)}
                sx={{ mb: 2 }}
              >
                {(groups ?? []).map((g) => (
                  <MenuItem key={g.id} value={g.id}>
                    {g.displayName}
                  </MenuItem>
                ))}
              </TextField>
            )}

            <Button
              variant="contained"
              startIcon={pending ? <CircularProgress size={14} /> : <PlayArrowIcon />}
              onClick={handleRun}
              disabled={pending || (mode === 'tools' ? !toolIds.length : !groupId)}
            >
              Run all &amp; measure
            </Button>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>
              Tools whose required parameters have no default value are skipped — run those individually on the
              Single tool tab.
            </Typography>
          </CardContent>
        </Card>
      </Grid>

      <Grid size={{ xs: 12, md: 8 }}>
        {!report ? (
          <Card>
            <CardContent sx={{ textAlign: 'center', py: 8 }}>
              <QueryStatsIcon sx={{ fontSize: 44, color: 'text.disabled', mb: 1 }} />
              <Typography color="text.secondary">
                Select tools or a group, then run them to measure combined real token usage.
              </Typography>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent>
              <Grid container spacing={2} sx={{ mb: 2 }}>
                {(
                  [
                    { label: 'Tool definitions (context tax)', value: report.totalDefinitionTokens },
                    { label: 'Responses (executed)', value: report.totalResponseTokens },
                    { label: 'Combined total', value: report.totalTokens },
                  ]
                ).map((s) => (
                  <Grid key={s.label} size={{ xs: 12, sm: 4 }}>
                    <Box sx={{ p: 1.5, border: 1, borderColor: 'divider', borderRadius: 2 }}>
                      <Typography variant="h5" fontWeight={800}>
                        {formatTokens(s.value)}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {s.label}
                      </Typography>
                    </Box>
                  </Grid>
                ))}
              </Grid>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                {report.executedCount} of {report.toolCount} tool(s) executed · token counts are {report.tokenEncoding}
              </Typography>

              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Tool</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="right">Definition</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="right">Response</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="right">Total</TableCell>
                    <TableCell sx={{ fontWeight: 700, width: '24%' }} />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {report.results.map((t) => (
                    <TableRow key={t.toolId}>
                      <TableCell>
                        <Stack direction="row" spacing={0.75} alignItems="center">
                          <Typography variant="body2" fontWeight={600}>
                            {t.displayName}
                          </Typography>
                          {t.warning && t.warningReason && <TokenWarningBadge reason={t.warningReason} />}
                          {t.deliveredFormat === 'TOON' && (
                            <Chip label="TOON" size="small" color="success" variant="outlined" sx={{ height: 18, fontSize: 10 }} />
                          )}
                          {t.truncated && (
                            <Chip label="truncated" size="small" color="warning" variant="outlined" sx={{ height: 18, fontSize: 10 }} />
                          )}
                        </Stack>
                        {!t.executed && (
                          <Typography variant="caption" color="error.main">
                            not executed: {t.skipReason}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell align="right">{formatTokens(t.definitionTokens)}</TableCell>
                      <TableCell align="right">{t.executed ? formatTokens(t.responseTokens) : '—'}</TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight={700}>
                          {formatTokens(t.definitionTokens + t.responseTokens)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <LinearProgress
                          variant="determinate"
                          value={((t.definitionTokens + t.responseTokens) / maxTotal) * 100}
                          sx={{ height: 6, borderRadius: 3 }}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Alert severity="info" sx={{ mt: 2 }}>
                Response tokens are counted per single call in each tool's delivered format. An agent pays the
                definition cost on every request and response costs per call — keep consumer toolsets narrow via
                group-scoped MCP endpoints.
              </Alert>
            </CardContent>
          </Card>
        )}
      </Grid>
    </Grid>
  );
}

export default function PlaygroundPage() {
  const [tab, setTab] = useState(0);
  return (
    <Box>
      <PageHeader
        title="Token Playground"
        subtitle="Measure what your tools really cost an AI model — response tokens, format savings and context tax"
      />
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2.5 }}>
        <Tab label="Single tool" />
        <Tab label="Multi-tool / group analysis" />
      </Tabs>
      {tab === 0 ? <SingleToolTab /> : <BatchRunTab />}
    </Box>
  );
}
