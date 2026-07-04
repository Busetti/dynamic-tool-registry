import { useState } from 'react';
import Accordion from '@mui/material/Accordion';
import AccordionDetails from '@mui/material/AccordionDetails';
import AccordionSummary from '@mui/material/AccordionSummary';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Grid from '@mui/material/Grid2';
import InputAdornment from '@mui/material/InputAdornment';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import HubIcon from '@mui/icons-material/Hub';
import RefreshIcon from '@mui/icons-material/Refresh';
import SearchIcon from '@mui/icons-material/Search';
import CircleIcon from '@mui/icons-material/Circle';
import FolderIcon from '@mui/icons-material/Folder';
import { useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import { useGroups, useMcpRefresh, useMcpStatus, useMcpTools } from '@/api/hooks';
import { errorMessage } from '@/api/client';
import PageHeader from '@/components/layout/PageHeader';
import JsonViewer from '@/components/common/JsonViewer';
import CopyButton from '@/components/common/CopyButton';
import EmptyState from '@/components/common/EmptyState';

export default function McpRegistryPage() {
  const { enqueueSnackbar } = useSnackbar();
  const navigate = useNavigate();
  const { data: groups } = useGroups();
  const { data: status, isLoading: statusLoading } = useMcpStatus();
  const { data: tools, isLoading: toolsLoading } = useMcpTools();
  const refresh = useMcpRefresh();
  const [filter, setFilter] = useState('');

  const filteredTools = (tools ?? []).filter(
    (tool) =>
      !filter ||
      tool.name.toLowerCase().includes(filter.toLowerCase()) ||
      (tool.description ?? '').toLowerCase().includes(filter.toLowerCase()),
  );

  const sseUrl = `${window.location.origin.replace(/:\d+$/, ':8080')}/sse`;
  const clientConfig = JSON.stringify(
    {
      mcpServers: {
        'dynamic-tool-registry': { url: sseUrl },
      },
    },
    null,
    2,
  );

  const handleRefresh = async () => {
    try {
      const result = await refresh.mutateAsync();
      enqueueSnackbar(`Registry resynced — ${result.registeredTools} tools live`, { variant: 'success' });
    } catch (error) {
      enqueueSnackbar(errorMessage(error), { variant: 'error' });
    }
  };

  return (
    <Box>
      <PageHeader
        title="MCP Registry"
        subtitle="Live view of tools exposed to MCP-compatible AI clients"
        actions={
          <Button
            variant="outlined"
            startIcon={<RefreshIcon />}
            onClick={handleRefresh}
            disabled={refresh.isPending}
          >
            Force Resync
          </Button>
        }
      />

      <Grid container spacing={2.5}>
        <Grid size={{ xs: 12, md: 5 }}>
          <Card>
            <CardContent>
              <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2 }}>
                <HubIcon color="primary" />
                <Typography variant="h6">Server</Typography>
                <Box sx={{ flexGrow: 1 }} />
                <Stack direction="row" spacing={0.75} alignItems="center">
                  <CircleIcon sx={{ fontSize: 10, color: 'success.main' }} />
                  <Typography variant="caption" color="success.main" fontWeight={700}>
                    LIVE
                  </Typography>
                </Stack>
              </Stack>
              {statusLoading ? (
                <Skeleton height={120} />
              ) : (
                <Stack spacing={1}>
                  <Row label="Name" value={status?.serverName} mono />
                  <Row label="Version" value={status?.serverVersion} />
                  <Row label="Transport" value={status?.transport} />
                  <Row label="Registered tools" value={String(status?.registeredToolCount ?? 0)} />
                  <Row
                    label="Last sync"
                    value={status?.lastSyncAt ? new Date(status.lastSyncAt).toLocaleString() : '—'}
                  />
                </Stack>
              )}
            </CardContent>
          </Card>

          <Card sx={{ mt: 2.5 }}>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                <Typography variant="h6">Client connection</Typography>
                <CopyButton text={clientConfig} />
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                Add this to any MCP-compatible client (Claude Desktop, MCP Inspector, Spring AI):
              </Typography>
              <JsonViewer value={clientConfig} maxHeight={220} />
            </CardContent>
          </Card>

          <Card sx={{ mt: 2.5 }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 0.5 }}>
                Group-scoped endpoints
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                Each group has its own MCP endpoint exposing only that group's ACTIVE tools —
                connect consumers to the narrowest set they need.
              </Typography>
              <Stack spacing={1}>
                {(groups ?? []).map((group) => {
                  const url = `${window.location.origin.replace(/:\d+$/, ':8080')}${group.mcpSseUrl ?? ''}`;
                  return (
                    <Stack
                      key={group.id}
                      direction="row"
                      spacing={1}
                      alignItems="center"
                      sx={{ p: 1, border: 1, borderColor: 'divider', borderRadius: 2 }}
                    >
                      <FolderIcon fontSize="small" color="primary" />
                      <Box sx={{ minWidth: 0, flexGrow: 1, cursor: 'pointer' }} onClick={() => navigate(`/groups/${group.id}`)}>
                        <Typography variant="body2" fontWeight={600} noWrap>
                          {group.displayName}
                        </Typography>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          noWrap
                          sx={{ display: 'block', fontFamily: '"JetBrains Mono", monospace' }}
                        >
                          {group.mcpSseUrl}
                        </Typography>
                      </Box>
                      <CopyButton text={url} />
                    </Stack>
                  );
                })}
                {!groups?.length && (
                  <Typography variant="caption" color="text.secondary">
                    No groups yet.
                  </Typography>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 7 }}>
          <Card>
            <CardContent sx={{ pb: 1.5 }}>
              <Stack direction="row" spacing={2} alignItems="center">
                <Typography variant="h6" sx={{ flexShrink: 0 }}>
                  Live tools ({filteredTools.length})
                </Typography>
                <TextField
                  size="small"
                  fullWidth
                  placeholder="Filter registered tools…"
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon fontSize="small" />
                      </InputAdornment>
                    ),
                  }}
                />
              </Stack>
            </CardContent>
            {toolsLoading ? (
              <Box sx={{ p: 2 }}>
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} height={56} />
                ))}
              </Box>
            ) : !filteredTools.length ? (
              <EmptyState
                icon={<HubIcon />}
                title="No tools registered with MCP"
                description="Activate a tool (status → ACTIVE) and it appears here instantly — no restart needed."
              />
            ) : (
              <Box sx={{ px: 2, pb: 2 }}>
                {filteredTools.map((tool) => (
                  <Accordion key={tool.name} disableGutters sx={{ '&:before': { display: 'none' } }}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Box>
                        <Typography fontWeight={600} sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: 14 }}>
                          {tool.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {(tool.description ?? '').split('\n')[0]}
                        </Typography>
                      </Box>
                    </AccordionSummary>
                    <AccordionDetails>
                      {tool.description && tool.description.includes('\n') && (
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, whiteSpace: 'pre-line' }}>
                          {tool.description}
                        </Typography>
                      )}
                      <Typography variant="caption" fontWeight={700} color="text.secondary">
                        INPUT SCHEMA
                      </Typography>
                      <Box sx={{ mt: 0.5 }}>
                        <JsonViewer value={tool.inputSchema ?? '{}'} maxHeight={260} />
                      </Box>
                    </AccordionDetails>
                  </Accordion>
                ))}
              </Box>
            )}
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

function Row({ label, value, mono = false }: { label: string; value?: string; mono?: boolean }) {
  return (
    <Stack direction="row" justifyContent="space-between">
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2" sx={mono ? { fontFamily: '"JetBrains Mono", monospace' } : undefined}>
        {value ?? '—'}
      </Typography>
    </Stack>
  );
}
