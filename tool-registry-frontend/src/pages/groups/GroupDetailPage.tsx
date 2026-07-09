import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Grid from '@mui/material/Grid2';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import BuildIcon from '@mui/icons-material/Build';
import HubIcon from '@mui/icons-material/Hub';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import ReactMarkdown from 'react-markdown';
import { useSnackbar } from 'notistack';
import AddIcon from '@mui/icons-material/Add';
import LinkOffIcon from '@mui/icons-material/LinkOff';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import { useDeleteGroup, useDetachTool, useGroup, useGroupTools, useRegenerateMcpKey } from '@/api/hooks';
import AttachToolsDialog from './AttachToolsDialog';
import { errorMessage } from '@/api/client';
import JsonViewer from '@/components/common/JsonViewer';
import CopyButton from '@/components/common/CopyButton';
import PageHeader from '@/components/layout/PageHeader';
import StatusChip from '@/components/common/StatusChip';
import MethodChip from '@/components/common/MethodChip';
import TagList from '@/components/common/TagList';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import EmptyState from '@/components/common/EmptyState';
import GroupFormDialog from './GroupFormDialog';

function MetaRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <Stack direction="row" spacing={1} sx={{ py: 0.75 }}>
      <Typography variant="body2" color="text.secondary" sx={{ width: 130, flexShrink: 0 }}>
        {label}
      </Typography>
      <Typography variant="body2">{value || '—'}</Typography>
    </Stack>
  );
}

export default function GroupDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const { data: group, isLoading } = useGroup(id);
  const { data: tools } = useGroupTools(id);
  const deleteGroup = useDeleteGroup();
  const regenerateKey = useRegenerateMcpKey();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [regenerateOpen, setRegenerateOpen] = useState(false);
  const [attachOpen, setAttachOpen] = useState(false);
  const detachTool = useDetachTool(id ?? '');

  const handleDetach = async (toolId: string, toolName: string) => {
    try {
      await detachTool.mutateAsync(toolId);
      enqueueSnackbar(`Removed "${toolName}" from group`, { variant: 'success' });
    } catch (error) {
      enqueueSnackbar(errorMessage(error), { variant: 'error' });
    }
  };

  const handleRegenerate = async () => {
    try {
      await regenerateKey.mutateAsync(id!);
      enqueueSnackbar('MCP key regenerated — the previous endpoint is now invalid', { variant: 'success' });
      setRegenerateOpen(false);
    } catch (error) {
      enqueueSnackbar(errorMessage(error), { variant: 'error' });
    }
  };

  const handleDelete = async () => {
    try {
      await deleteGroup.mutateAsync({ id: id!, force: (tools?.length ?? 0) > 0 });
      enqueueSnackbar('Group deleted', { variant: 'success' });
      navigate('/groups');
    } catch (error) {
      enqueueSnackbar(errorMessage(error), { variant: 'error' });
    }
  };

  if (isLoading || !group) {
    return <Skeleton variant="rounded" height={400} />;
  }

  return (
    <Box>
      <PageHeader
        title={group.displayName}
        subtitle={group.description}
        actions={
          <>
            <Button startIcon={<EditIcon />} variant="outlined" onClick={() => setEditOpen(true)}>
              Edit
            </Button>
            <Button
              startIcon={<DeleteIcon />}
              variant="outlined"
              color="error"
              onClick={() => setDeleteOpen(true)}
            >
              Delete
            </Button>
          </>
        }
      />

      <Grid container spacing={2.5}>
        <Grid size={{ xs: 12, md: 4 }}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Details
              </Typography>
              <MetaRow label="Machine name" value={group.name} />
              <MetaRow label="Business area" value={group.businessArea} />
              <MetaRow label="Team" value={group.teamName} />
              <MetaRow label="Owner" value={group.owner} />
              <MetaRow label="Created" value={new Date(group.createdAt).toLocaleString()} />
              <MetaRow label="Updated" value={new Date(group.updatedAt).toLocaleString()} />
              <Box sx={{ mt: 1.5 }}>
                <TagList tags={group.tags} max={10} />
              </Box>
            </CardContent>
          </Card>

          <Card sx={{ mt: 2.5 }}>
            <CardContent>
              <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1 }}>
                <HubIcon color="primary" fontSize="small" />
                <Typography variant="h6" sx={{ flexGrow: 1 }}>
                  MCP Access
                </Typography>
                <Button
                  size="small"
                  startIcon={<AutorenewIcon />}
                  onClick={() => setRegenerateOpen(true)}
                >
                  Regenerate key
                </Button>
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                Consumers connecting with this key see only this group's ACTIVE tools.
                {group.mcpToolPrefix
                  ? ` Tools are exposed as ${group.mcpToolPrefix}_<toolName>.`
                  : ''}
              </Typography>
              <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mb: 1.5 }}>
                <Typography
                  variant="body2"
                  sx={{
                    fontFamily: '"JetBrains Mono", monospace',
                    fontSize: 12.5,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    flexGrow: 1,
                  }}
                >
                  {`${window.location.origin.replace(/:\d+$/, ':8080')}${group.mcpSseUrl ?? ''}`}
                </Typography>
                <CopyButton text={`${window.location.origin.replace(/:\d+$/, ':8080')}${group.mcpSseUrl ?? ''}`} />
              </Stack>
              <JsonViewer
                value={JSON.stringify(
                  {
                    mcpServers: {
                      [`tool-registry-${group.name}`]: {
                        url: `${window.location.origin.replace(/:\d+$/, ':8080')}${group.mcpSseUrl ?? ''}`,
                      },
                    },
                  },
                  null,
                  2,
                )}
                maxHeight={180}
              />
            </CardContent>
          </Card>

          {group.documentation && (
            <Card sx={{ mt: 2.5 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Documentation
                </Typography>
                <Box sx={{ '& p': { my: 1 }, '& h1,h2,h3': { mt: 2, mb: 1 }, fontSize: 14 }}>
                  <ReactMarkdown>{group.documentation}</ReactMarkdown>
                </Box>
              </CardContent>
            </Card>
          )}
        </Grid>

        <Grid size={{ xs: 12, md: 8 }}>
          <Card>
            <CardContent sx={{ pb: 0 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center">
                <Typography variant="h6">Tools in this group ({tools?.length ?? 0})</Typography>
                <Button size="small" startIcon={<AddIcon />} onClick={() => setAttachOpen(true)}>
                  Add tools
                </Button>
              </Stack>
            </CardContent>
            {!tools?.length ? (
              <EmptyState
                icon={<BuildIcon />}
                title="No tools in this group"
                description="Assign tools to this group from the tool registration form."
                actionLabel="Register Tool"
                onAction={() => navigate('/tools/new')}
              />
            ) : (
              <TableContainer>
                <Table size="small" sx={{ mt: 1 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>Tool</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Method</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Category</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                      <TableCell />
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {tools.map((tool) => (
                      <TableRow
                        key={tool.id}
                        hover
                        sx={{ cursor: 'pointer' }}
                        onClick={() => navigate(`/tools/${tool.id}`)}
                      >
                        <TableCell>
                          <Typography variant="body2" fontWeight={600}>
                            {tool.displayName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" sx={{ fontFamily: '"JetBrains Mono", monospace' }}>
                            {tool.toolName}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <MethodChip method={tool.method} />
                        </TableCell>
                        <TableCell>{tool.category ?? '—'}</TableCell>
                        <TableCell>
                          <StatusChip status={tool.status} />
                        </TableCell>
                        <TableCell align="right">
                          <Tooltip title="Remove from group (does not delete the tool)">
                            <IconButton
                              size="small"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDetach(tool.id, tool.displayName);
                              }}
                            >
                              <LinkOffIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Card>
        </Grid>
      </Grid>

      <GroupFormDialog open={editOpen} group={group} onClose={() => setEditOpen(false)} />
      <AttachToolsDialog
        open={attachOpen}
        groupId={id!}
        existingToolIds={(tools ?? []).map((t) => t.id)}
        onClose={() => setAttachOpen(false)}
      />
      <ConfirmDialog
        open={regenerateOpen}
        title="Regenerate MCP key?"
        message="The current group MCP endpoint stops working immediately. Every consumer using the old URL must switch to the new one."
        confirmLabel="Regenerate"
        destructive
        loading={regenerateKey.isPending}
        onConfirm={handleRegenerate}
        onClose={() => setRegenerateOpen(false)}
      />
      <ConfirmDialog
        open={deleteOpen}
        title="Delete group?"
        message={
          tools?.length
            ? `"${group.displayName}" is referenced by ${tools.length} tool(s). They will be detached from the group.`
            : `This permanently deletes "${group.displayName}".`
        }
        confirmLabel="Delete"
        destructive
        loading={deleteGroup.isPending}
        onConfirm={handleDelete}
        onClose={() => setDeleteOpen(false)}
      />
    </Box>
  );
}
