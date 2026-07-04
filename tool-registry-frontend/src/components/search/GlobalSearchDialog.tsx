import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Dialog from '@mui/material/Dialog';
import InputBase from '@mui/material/InputBase';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import ListSubheader from '@mui/material/ListSubheader';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import SearchIcon from '@mui/icons-material/Search';
import BuildIcon from '@mui/icons-material/Build';
import FolderIcon from '@mui/icons-material/Folder';
import { useGroups, useTools } from '@/api/hooks';
import StatusChip from '@/components/common/StatusChip';

interface GlobalSearchDialogProps {
  open: boolean;
  onClose: () => void;
}

export default function GlobalSearchDialog({ open, onClose }: GlobalSearchDialogProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');

  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  const enabled = query.trim().length > 1;
  const { data: toolPage } = useTools(enabled ? { search: query, size: 8 } : undefined);
  const { data: groups } = useGroups(enabled ? { search: query } : undefined);

  const toolHits = enabled ? (toolPage?.content ?? []) : [];
  const groupHits = useMemo(() => (enabled ? (groups ?? []).slice(0, 5) : []), [enabled, groups]);

  const go = (path: string) => {
    onClose();
    navigate(path);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <Box sx={{ display: 'flex', alignItems: 'center', px: 2, py: 1.5, borderBottom: 1, borderColor: 'divider' }}>
        <SearchIcon sx={{ mr: 1.5, color: 'text.secondary' }} />
        <InputBase
          autoFocus
          fullWidth
          placeholder="Search tools and groups…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          sx={{ fontSize: 16 }}
        />
        <Typography variant="caption" sx={{ color: 'text.secondary', border: 1, borderColor: 'divider', borderRadius: 1, px: 0.75, py: 0.25 }}>
          ESC
        </Typography>
      </Box>
      <Box sx={{ maxHeight: 420, overflow: 'auto' }}>
        {!enabled && (
          <Typography variant="body2" color="text.secondary" sx={{ p: 3, textAlign: 'center' }}>
            Type at least 2 characters to search the catalog
          </Typography>
        )}
        {enabled && toolHits.length === 0 && groupHits.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ p: 3, textAlign: 'center' }}>
            No results for “{query}”
          </Typography>
        )}
        {toolHits.length > 0 && (
          <List subheader={<ListSubheader disableSticky>Tools</ListSubheader>} dense>
            {toolHits.map((tool) => (
              <ListItemButton key={tool.id} onClick={() => go(`/tools/${tool.id}`)}>
                <ListItemIcon sx={{ minWidth: 36 }}>
                  <BuildIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText primary={tool.displayName} secondary={tool.toolName} />
                <StatusChip status={tool.status} />
              </ListItemButton>
            ))}
          </List>
        )}
        {groupHits.length > 0 && (
          <List subheader={<ListSubheader disableSticky>Groups</ListSubheader>} dense>
            {groupHits.map((group) => (
              <ListItemButton key={group.id} onClick={() => go(`/groups/${group.id}`)}>
                <ListItemIcon sx={{ minWidth: 36 }}>
                  <FolderIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText primary={group.displayName} secondary={group.businessArea} />
              </ListItemButton>
            ))}
          </List>
        )}
      </Box>
    </Dialog>
  );
}
