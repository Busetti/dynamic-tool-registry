import { useMemo, useState } from 'react';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import InputAdornment from '@mui/material/InputAdornment';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import SearchIcon from '@mui/icons-material/Search';
import { useSnackbar } from 'notistack';
import { useAttachTool, useTools } from '@/api/hooks';
import { errorMessage } from '@/api/client';
import MethodChip from '@/components/common/MethodChip';
import StatusChip from '@/components/common/StatusChip';

interface AttachToolsDialogProps {
  open: boolean;
  groupId: string;
  existingToolIds: string[];
  onClose: () => void;
}

/** Pick existing tools from the catalog and attach them to this group. */
export default function AttachToolsDialog({ open, groupId, existingToolIds, onClose }: AttachToolsDialogProps) {
  const { enqueueSnackbar } = useSnackbar();
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const attachTool = useAttachTool(groupId);

  const { data } = useTools(open ? { search: search || undefined, size: 50 } : undefined);

  const candidates = useMemo(
    () => (data?.content ?? []).filter((tool) => !existingToolIds.includes(tool.id)),
    [data, existingToolIds],
  );

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAttach = async () => {
    try {
      for (const toolId of selected) {
        await attachTool.mutateAsync(toolId);
      }
      enqueueSnackbar(`${selected.size} tool(s) added to group`, { variant: 'success' });
      setSelected(new Set());
      setSearch('');
      onClose();
    } catch (error) {
      enqueueSnackbar(errorMessage(error), { variant: 'error' });
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Add existing tools to group</DialogTitle>
      <DialogContent>
        <TextField
          fullWidth
          size="small"
          autoFocus
          placeholder="Search the tool catalog…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ mb: 1.5, mt: 0.5 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
        />
        {!candidates.length ? (
          <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>
            {search ? 'No matching tools outside this group.' : 'All tools already belong to this group.'}
          </Typography>
        ) : (
          <List dense sx={{ maxHeight: 360, overflow: 'auto' }}>
            {candidates.map((tool) => (
              <ListItemButton key={tool.id} onClick={() => toggle(tool.id)}>
                <ListItemIcon sx={{ minWidth: 36 }}>
                  <Checkbox edge="start" checked={selected.has(tool.id)} disableRipple size="small" />
                </ListItemIcon>
                <ListItemText
                  primary={tool.displayName}
                  secondary={tool.toolName}
                  secondaryTypographyProps={{ sx: { fontFamily: '"JetBrains Mono", monospace', fontSize: 11 } }}
                />
                <MethodChip method={tool.method} />
                <StatusChip status={tool.status} />
              </ListItemButton>
            ))}
          </List>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button
          variant="contained"
          onClick={handleAttach}
          disabled={!selected.size || attachTool.isPending}
          startIcon={attachTool.isPending ? <CircularProgress size={14} /> : undefined}
        >
          Add {selected.size ? `(${selected.size})` : ''}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
