import { useMemo, useState } from 'react';
import { Link as RouterLink, useNavigate, useParams } from 'react-router-dom';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid2';
import Link from '@mui/material/Link';
import Menu from '@mui/material/Menu';
import MenuItem from '@mui/material/MenuItem';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Tabs from '@mui/material/Tabs';
import Typography from '@mui/material/Typography';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import LinkIcon from '@mui/icons-material/Link';
import ReactMarkdown from 'react-markdown';
import { useSnackbar } from 'notistack';
import { useChangeToolStatus, useDeleteTool, useGroups, useTool } from '@/api/hooks';
import { errorMessage } from '@/api/client';
import type { ToolParameter, ToolStatus } from '@/api/types';
import PageHeader from '@/components/layout/PageHeader';
import StatusChip from '@/components/common/StatusChip';
import MethodChip from '@/components/common/MethodChip';
import JsonViewer from '@/components/common/JsonViewer';
import CopyButton from '@/components/common/CopyButton';
import ConfirmDialog from '@/components/common/ConfirmDialog';

function ParamTable({ title, params }: { title: string; params?: ToolParameter[] }) {
  if (!params?.length) return null;
  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="subtitle2" fontWeight={700} gutterBottom>
        {title}
      </Typography>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 700 }}>Name</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Type</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Required</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Default</TableCell>
            <TableCell sx={{ fontWeight: 700 }}>Description</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {params.map((param) => (
            <TableRow key={param.name}>
              <TableCell sx={{ fontFamily: '"JetBrains Mono", monospace' }}>{param.name}</TableCell>
              <TableCell>{param.type ?? 'string'}</TableCell>
              <TableCell>{param.required ? 'Yes' : 'No'}</TableCell>
              <TableCell>{param.defaultValue ?? '—'}</TableCell>
              <TableCell>{param.description ?? '—'}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  );
}

function ChipListRow({ label, items }: { label: string; items?: string[] }) {
  if (!items?.length) return null;
  return (
    <Box sx={{ mb: 2 }}>
      <Typography variant="subtitle2" fontWeight={700} gutterBottom>
        {label}
      </Typography>
      <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
        {items.map((item) => (
          <Chip key={item} label={item} size="small" />
        ))}
      </Stack>
    </Box>
  );
}

function TextRow({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <Box sx={{ mb: 2 }}>
      <Typography variant="subtitle2" fontWeight={700} gutterBottom>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
        {value}
      </Typography>
    </Box>
  );
}

export default function ToolDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const { data: tool, isLoading } = useTool(id);
  const { data: groups } = useGroups();
  const changeStatus = useChangeToolStatus();
  const deleteTool = useDeleteTool();

  const [tab, setTab] = useState(0);
  const [statusAnchor, setStatusAnchor] = useState<null | HTMLElement>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const toolGroups = useMemo(
    () => (groups ?? []).filter((g) => tool?.groupIds?.includes(g.id)),
    [groups, tool],
  );

  const curlCommand = useMemo(() => {
    if (!tool?.httpConfig) return '';
    const { method, uri, headers } = tool.httpConfig;
    const headerFlags = (headers ?? [])
      .map((h) => `-H '${h.name}: ${h.sensitive ? '<secret>' : h.value ?? ''}'`)
      .join(' ');
    const bodyFlag =
      method === 'POST' && tool.httpConfig.requestBodyTemplate
        ? ` -d '${tool.httpConfig.requestBodyTemplate.replace(/'/g, "'\\''")}'`
        : '';
    return `curl -X ${method} '${uri}' ${headerFlags}${bodyFlag}`.trim();
  }, [tool]);

  const handleStatusChange = async (status: ToolStatus) => {
    setStatusAnchor(null);
    try {
      await changeStatus.mutateAsync({ id: id!, status });
      enqueueSnackbar(
        status === 'ACTIVE'
          ? 'Tool activated — now live in the MCP registry'
          : `Status changed to ${status}`,
        { variant: 'success' },
      );
    } catch (error) {
      enqueueSnackbar(errorMessage(error), { variant: 'error' });
    }
  };

  const handleDelete = async () => {
    try {
      await deleteTool.mutateAsync(id!);
      enqueueSnackbar('Tool deleted', { variant: 'success' });
      navigate('/tools');
    } catch (error) {
      enqueueSnackbar(errorMessage(error), { variant: 'error' });
    }
  };

  if (isLoading || !tool) {
    return <Skeleton variant="rounded" height={480} />;
  }

  const http = tool.httpConfig;

  return (
    <Box>
      <PageHeader
        title={tool.displayName}
        subtitle={tool.description}
        actions={
          <>
            <Button
              variant="outlined"
              endIcon={<ExpandMoreIcon />}
              onClick={(e) => setStatusAnchor(e.currentTarget)}
            >
              <StatusChip status={tool.status} />
            </Button>
            <Menu anchorEl={statusAnchor} open={!!statusAnchor} onClose={() => setStatusAnchor(null)}>
              {(['DRAFT', 'ACTIVE', 'DEPRECATED', 'DISABLED'] as ToolStatus[])
                .filter((s) => s !== tool.status)
                .map((s) => (
                  <MenuItem key={s} onClick={() => handleStatusChange(s)}>
                    {s === 'ACTIVE' ? 'Activate (expose via MCP)' : `Mark ${s.toLowerCase()}`}
                  </MenuItem>
                ))}
            </Menu>
            <Button variant="contained" startIcon={<PlayArrowIcon />} component={RouterLink} to={`/tools/${id}/test`}>
              Test
            </Button>
            <Button variant="outlined" startIcon={<EditIcon />} component={RouterLink} to={`/tools/${id}/edit`}>
              Edit
            </Button>
            <Button variant="outlined" color="error" startIcon={<DeleteIcon />} onClick={() => setDeleteOpen(true)}>
              Delete
            </Button>
          </>
        }
      />

      <Card sx={{ mb: 2.5 }}>
        <CardContent sx={{ py: 2 }}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ flexGrow: 1, minWidth: 0 }}>
              <MethodChip method={http?.method} />
              <Typography
                variant="body2"
                sx={{
                  fontFamily: '"JetBrains Mono", monospace',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {http?.uri}
              </Typography>
              <CopyButton text={http?.uri ?? ''} />
            </Stack>
            <Stack direction="row" spacing={1} alignItems="center">
              {toolGroups.map((g) => (
                <Chip
                  key={g.id}
                  label={g.displayName}
                  size="small"
                  onClick={() => navigate(`/groups/${g.id}`)}
                  variant="outlined"
                />
              ))}
              <Chip label={`v${tool.version ?? '1.0.0'}`} size="small" />
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}>
          <Tab label="Overview" />
          <Tab label="Technical" />
          <Tab label="Documentation" />
          <Tab label="AI Context" />
          <Tab label="Examples" />
        </Tabs>
        <CardContent>
          {tab === 0 && (
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 7 }}>
                <TextRow label="Description" value={tool.description} />
                <TextRow label="Business purpose" value={tool.businessPurpose} />
                <TextRow label="Business capability" value={tool.businessCapability} />
                <ChipListRow label="Tags" items={tool.tags} />
              </Grid>
              <Grid size={{ xs: 12, md: 5 }}>
                <TextRow label="Category" value={tool.category} />
                <TextRow label="Tool type" value={tool.toolType} />
                <TextRow label="Created" value={new Date(tool.createdAt).toLocaleString()} />
                <TextRow label="Updated" value={new Date(tool.updatedAt).toLocaleString()} />
              </Grid>
            </Grid>
          )}

          {tab === 1 && (
            <Box>
              <Box sx={{ mb: 3 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                  <Typography variant="subtitle2" fontWeight={700}>
                    Copy as curl
                  </Typography>
                  <CopyButton text={curlCommand} />
                </Stack>
                <JsonViewer value={curlCommand} maxHeight={120} />
              </Box>
              <Divider sx={{ mb: 3 }} />
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid size={{ xs: 6, md: 3 }}>
                  <TextRow label="Content type" value={http?.contentType} />
                </Grid>
                <Grid size={{ xs: 6, md: 3 }}>
                  <TextRow label="Timeout" value={`${http?.timeoutMs ?? 10000} ms`} />
                </Grid>
              </Grid>
              {!!http?.headers?.length && (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                    Headers
                  </Typography>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700 }}>Name</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Value</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Sensitive</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Description</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {http.headers.map((h) => (
                        <TableRow key={h.name}>
                          <TableCell sx={{ fontFamily: '"JetBrains Mono", monospace' }}>{h.name}</TableCell>
                          <TableCell sx={{ fontFamily: '"JetBrains Mono", monospace' }}>{h.value}</TableCell>
                          <TableCell>{h.sensitive ? 'Yes' : 'No'}</TableCell>
                          <TableCell>{h.description ?? '—'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Box>
              )}
              <ParamTable title="Path variables" params={http?.pathVariables} />
              <ParamTable title="Query parameters" params={http?.queryParameters} />
              <ParamTable title="Body parameters" params={http?.bodyParameters} />
              {http?.requestBodyTemplate && (
                <Box>
                  <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                    Request body template
                  </Typography>
                  <JsonViewer value={http.requestBodyTemplate} />
                </Box>
              )}
            </Box>
          )}

          {tab === 2 && (
            <Box>
              {tool.documentation?.markdown ? (
                <Box sx={{ '& p': { my: 1 }, '& h1,h2,h3': { mt: 2, mb: 1 }, mb: 3 }}>
                  <ReactMarkdown>{tool.documentation.markdown}</ReactMarkdown>
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  No markdown documentation provided.
                </Typography>
              )}
              {tool.documentation?.swaggerUrl && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                    Swagger / OpenAPI
                  </Typography>
                  <Link href={tool.documentation.swaggerUrl} target="_blank" rel="noopener">
                    {tool.documentation.swaggerUrl}
                  </Link>
                </Box>
              )}
              {!!tool.documentation?.externalLinks?.length && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                    External links
                  </Typography>
                  <Stack spacing={0.5}>
                    {tool.documentation.externalLinks.map((link) => (
                      <Stack key={link.url} direction="row" spacing={1} alignItems="center">
                        <LinkIcon fontSize="small" color="disabled" />
                        <Link href={link.url} target="_blank" rel="noopener">
                          {link.title}
                        </Link>
                      </Stack>
                    ))}
                  </Stack>
                </Box>
              )}
              <TextRow label="Notes" value={tool.documentation?.notes} />
            </Box>
          )}

          {tab === 3 && (
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 7 }}>
                <TextRow label="Natural language description" value={tool.aiContext?.naturalLanguageDescription} />
                <TextRow label="Expected inputs" value={tool.aiContext?.expectedInputs} />
                <TextRow label="Expected outputs" value={tool.aiContext?.expectedOutputs} />
                <ChipListRow label="Use cases" items={tool.aiContext?.useCases} />
                <ChipListRow label="Example prompts" items={tool.aiContext?.examplePrompts} />
              </Grid>
              <Grid size={{ xs: 12, md: 5 }}>
                <TextRow label="Business domain" value={tool.aiContext?.businessDomain} />
                <ChipListRow label="Keywords" items={tool.aiContext?.keywords} />
                <ChipListRow label="Search aliases" items={tool.aiContext?.searchAliases} />
              </Grid>
            </Grid>
          )}

          {tab === 4 && (
            <Grid container spacing={3}>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                  Request examples
                </Typography>
                {tool.examples?.requestExamples?.length ? (
                  tool.examples.requestExamples.map((example) => (
                    <Box key={example.name} sx={{ mb: 2 }}>
                      <Typography variant="caption" color="text.secondary">
                        {example.name}
                      </Typography>
                      <JsonViewer value={JSON.stringify(example.arguments ?? {}, null, 2)} maxHeight={220} />
                    </Box>
                  ))
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    None provided.
                  </Typography>
                )}
              </Grid>
              <Grid size={{ xs: 12, md: 6 }}>
                <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                  Response examples
                </Typography>
                {tool.examples?.responseExamples?.length ? (
                  tool.examples.responseExamples.map((example) => (
                    <Box key={example.name} sx={{ mb: 2 }}>
                      <Typography variant="caption" color="text.secondary">
                        {example.name} {example.statusCode ? `· HTTP ${example.statusCode}` : ''}
                      </Typography>
                      <JsonViewer value={example.body} maxHeight={220} />
                    </Box>
                  ))
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    None provided.
                  </Typography>
                )}
                {tool.examples?.responseSchema && (
                  <Box sx={{ mt: 2 }}>
                    <Typography variant="subtitle2" fontWeight={700} gutterBottom>
                      Response schema
                    </Typography>
                    <JsonViewer value={tool.examples.responseSchema} maxHeight={220} />
                  </Box>
                )}
              </Grid>
            </Grid>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={deleteOpen}
        title="Delete tool?"
        message={`This permanently deletes "${tool.displayName}" and removes it from the MCP registry.`}
        confirmLabel="Delete"
        destructive
        loading={deleteTool.isPending}
        onConfirm={handleDelete}
        onClose={() => setDeleteOpen(false)}
      />
    </Box>
  );
}
