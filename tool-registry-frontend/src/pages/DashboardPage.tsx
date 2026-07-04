import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Grid from '@mui/material/Grid2';
import LinearProgress from '@mui/material/LinearProgress';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import AddIcon from '@mui/icons-material/Add';
import BuildIcon from '@mui/icons-material/Build';
import FolderIcon from '@mui/icons-material/Folder';
import HubIcon from '@mui/icons-material/Hub';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { motion } from 'framer-motion';
import { useGroups, useMcpStatus, useStatusCounts, useTools } from '@/api/hooks';
import PageHeader from '@/components/layout/PageHeader';
import StatusChip from '@/components/common/StatusChip';
import MethodChip from '@/components/common/MethodChip';

const statusColors: Record<string, string> = {
  DRAFT: '#8b949e',
  ACTIVE: '#3fb950',
  DEPRECATED: '#d29922',
  DISABLED: '#f85149',
};

function StatCard({
  icon,
  label,
  value,
  loading,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
  loading?: boolean;
  onClick?: () => void;
}) {
  return (
    <motion.div whileHover={{ y: -3 }} transition={{ duration: 0.15 }}>
      <Card sx={{ cursor: onClick ? 'pointer' : 'default' }} onClick={onClick}>
        <CardContent>
          <Stack direction="row" spacing={2} alignItems="center">
            <Box
              sx={{
                bgcolor: 'action.selected',
                borderRadius: 2,
                width: 44,
                height: 44,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'primary.main',
              }}
            >
              {icon}
            </Box>
            <Box>
              <Typography variant="h5">{loading ? <Skeleton width={48} /> : value}</Typography>
              <Typography variant="body2" color="text.secondary">
                {label}
              </Typography>
            </Box>
          </Stack>
        </CardContent>
      </Card>
    </motion.div>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { data: statusCounts, isLoading: countsLoading } = useStatusCounts();
  const { data: groups, isLoading: groupsLoading } = useGroups();
  const { data: mcpStatus, isLoading: mcpLoading } = useMcpStatus();
  const { data: recentTools, isLoading: toolsLoading } = useTools({ size: 6, sort: 'updatedAt,desc' });

  const totalTools = Object.values(statusCounts ?? {}).reduce((a, b) => a + b, 0);

  return (
    <Box>
      <PageHeader
        title="Dashboard"
        subtitle="Your organization's AI tool catalog at a glance"
        actions={
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/tools/new')}>
            Register Tool
          </Button>
        }
      />

      <Grid container spacing={2.5}>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <StatCard
            icon={<BuildIcon />}
            label="Total tools"
            value={totalTools}
            loading={countsLoading}
            onClick={() => navigate('/tools')}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <StatCard
            icon={<CheckCircleIcon />}
            label="Active tools"
            value={statusCounts?.ACTIVE ?? 0}
            loading={countsLoading}
            onClick={() => navigate('/tools?status=ACTIVE')}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <StatCard
            icon={<FolderIcon />}
            label="Groups"
            value={groups?.length ?? 0}
            loading={groupsLoading}
            onClick={() => navigate('/groups')}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
          <StatCard
            icon={<HubIcon />}
            label="MCP-registered"
            value={mcpStatus?.registeredToolCount ?? 0}
            loading={mcpLoading}
            onClick={() => navigate('/mcp')}
          />
        </Grid>

        <Grid size={{ xs: 12, md: 5 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Status breakdown
              </Typography>
              <Stack spacing={2} sx={{ mt: 2 }}>
                {Object.entries(statusCounts ?? {}).map(([status, count]) => (
                  <Box key={status}>
                    <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                      <Typography variant="body2">{status}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {count}
                      </Typography>
                    </Stack>
                    <LinearProgress
                      variant="determinate"
                      value={totalTools ? (count / totalTools) * 100 : 0}
                      sx={{
                        height: 8,
                        borderRadius: 4,
                        bgcolor: 'action.hover',
                        '& .MuiLinearProgress-bar': { bgcolor: statusColors[status], borderRadius: 4 },
                      }}
                    />
                  </Box>
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 7 }}>
          <Card sx={{ height: '100%' }}>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                <Typography variant="h6">Recently updated tools</Typography>
                <Button size="small" onClick={() => navigate('/tools')}>
                  View all
                </Button>
              </Stack>
              <Stack spacing={1}>
                {toolsLoading &&
                  Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} height={44} variant="rounded" />)}
                {recentTools?.content.map((tool) => (
                  <Box
                    key={tool.id}
                    onClick={() => navigate(`/tools/${tool.id}`)}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1.5,
                      p: 1.25,
                      borderRadius: 2,
                      cursor: 'pointer',
                      '&:hover': { bgcolor: 'action.hover' },
                    }}
                  >
                    <MethodChip method={tool.method} />
                    <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                      <Typography variant="body2" fontWeight={600} noWrap>
                        {tool.displayName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
                        {tool.toolName}
                      </Typography>
                    </Box>
                    <StatusChip status={tool.status} />
                  </Box>
                ))}
                {!toolsLoading && !recentTools?.content.length && (
                  <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
                    No tools registered yet — register your first tool to get started.
                  </Typography>
                )}
              </Stack>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={12}>
          <Card>
            <CardContent>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                spacing={2}
                alignItems={{ sm: 'center' }}
                justifyContent="space-between"
              >
                <Stack direction="row" spacing={2} alignItems="center">
                  <HubIcon color="primary" />
                  <Box>
                    <Typography variant="subtitle1" fontWeight={600}>
                      MCP Server: {mcpStatus?.serverName ?? '—'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {mcpStatus
                        ? `v${mcpStatus.serverVersion} · ${mcpStatus.transport} · ${mcpStatus.registeredToolCount} tools live`
                        : 'Connecting…'}
                    </Typography>
                  </Box>
                </Stack>
                <Button variant="outlined" onClick={() => navigate('/mcp')}>
                  Open MCP Registry
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
