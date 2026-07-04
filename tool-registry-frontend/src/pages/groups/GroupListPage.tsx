import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid2';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import AddIcon from '@mui/icons-material/Add';
import FolderIcon from '@mui/icons-material/Folder';
import BuildIcon from '@mui/icons-material/Build';
import { motion } from 'framer-motion';
import { useGroups } from '@/api/hooks';
import PageHeader from '@/components/layout/PageHeader';
import TagList from '@/components/common/TagList';
import EmptyState from '@/components/common/EmptyState';
import GroupFormDialog from './GroupFormDialog';

export default function GroupListPage() {
  const navigate = useNavigate();
  const { data: groups, isLoading } = useGroups();
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <Box>
      <PageHeader
        title="Groups"
        subtitle="Teams and business units that own collections of tools"
        actions={
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>
            Create Group
          </Button>
        }
      />

      {isLoading ? (
        <Grid container spacing={2.5}>
          {Array.from({ length: 6 }).map((_, i) => (
            <Grid key={i} size={{ xs: 12, sm: 6, lg: 4 }}>
              <Skeleton variant="rounded" height={160} />
            </Grid>
          ))}
        </Grid>
      ) : !groups?.length ? (
        <Card>
          <EmptyState
            icon={<FolderIcon />}
            title="No groups yet"
            description="Groups organize tools by team or business unit. Create one to get started."
            actionLabel="Create Group"
            onAction={() => setCreateOpen(true)}
          />
        </Card>
      ) : (
        <Grid container spacing={2.5}>
          {groups.map((group, index) => (
            <Grid key={group.id} size={{ xs: 12, sm: 6, lg: 4 }}>
              <motion.div
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04, duration: 0.25 }}
                whileHover={{ y: -3 }}
              >
                <Card sx={{ height: '100%' }}>
                  <CardActionArea onClick={() => navigate(`/groups/${group.id}`)} sx={{ height: '100%' }}>
                    <CardContent>
                      <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1 }}>
                        <FolderIcon color="primary" />
                        <Box sx={{ minWidth: 0 }}>
                          <Typography variant="subtitle1" fontWeight={700} noWrap>
                            {group.displayName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {group.businessArea ?? '—'} {group.teamName ? `· ${group.teamName}` : ''}
                          </Typography>
                        </Box>
                      </Stack>
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{
                          mb: 1.5,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          minHeight: 40,
                        }}
                      >
                        {group.description || 'No description'}
                      </Typography>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <TagList tags={group.tags} max={3} />
                        <Chip
                          icon={<BuildIcon sx={{ fontSize: 14 }} />}
                          label={`${group.toolCount} tool${group.toolCount === 1 ? '' : 's'}`}
                          size="small"
                          variant="outlined"
                        />
                      </Stack>
                    </CardContent>
                  </CardActionArea>
                </Card>
              </motion.div>
            </Grid>
          ))}
        </Grid>
      )}

      <GroupFormDialog open={createOpen} onClose={() => setCreateOpen(false)} />
    </Box>
  );
}
