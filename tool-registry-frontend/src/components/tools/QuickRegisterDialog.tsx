import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Alert from '@mui/material/Alert';
import Autocomplete from '@mui/material/Autocomplete';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid2';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import BoltIcon from '@mui/icons-material/Bolt';
import PreviewIcon from '@mui/icons-material/Visibility';
import { useSnackbar } from 'notistack';
import { useGroups, useParseCurl, useQuickRegister } from '@/api/hooks';
import { errorMessage } from '@/api/client';
import type { ParsedCurl } from '@/api/types';
import MonacoJsonEditor from '@/components/common/MonacoJsonEditor';
import MethodChip from '@/components/common/MethodChip';
import JsonViewer from '@/components/common/JsonViewer';

const TOOL_NAME_PATTERN = /^[a-z][a-z0-9_]{2,63}$/;

interface QuickRegisterDialogProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Paste a curl command + the mandatory details → registered DRAFT tool.
 * The parsed configuration is previewed before anything is saved.
 */
export default function QuickRegisterDialog({ open, onClose }: QuickRegisterDialogProps) {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const { data: groups } = useGroups();
  const parseCurl = useParseCurl();
  const quickRegister = useQuickRegister();

  const [curl, setCurl] = useState('');
  const [toolName, setToolName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [description, setDescription] = useState('');
  const [groupIds, setGroupIds] = useState<string[]>([]);
  const [parsed, setParsed] = useState<ParsedCurl | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setCurl('');
      setToolName('');
      setDisplayName('');
      setDescription('');
      setGroupIds([]);
      setParsed(null);
      setParseError(null);
    }
  }, [open]);

  const mandatoryValid =
    TOOL_NAME_PATTERN.test(toolName) && displayName.trim().length > 0 && description.trim().length > 0;

  const handlePreview = async () => {
    setParseError(null);
    try {
      setParsed(await parseCurl.mutateAsync(curl));
    } catch (error) {
      setParsed(null);
      setParseError(errorMessage(error));
    }
  };

  const handleRegister = async () => {
    try {
      const tool = await quickRegister.mutateAsync({
        curl,
        toolName,
        displayName,
        description,
        groupIds,
      });
      enqueueSnackbar('Tool registered from curl — activate it to expose via MCP', { variant: 'success' });
      onClose();
      navigate(`/tools/${tool.id}`);
    } catch (error) {
      enqueueSnackbar(errorMessage(error), { variant: 'error' });
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Stack direction="row" spacing={1} alignItems="center">
          <BoltIcon color="primary" />
          <span>Quick Register from curl</span>
        </Stack>
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
          Paste a curl command — method, URL, headers, query parameters and JSON body are extracted
          automatically. Use {'{var}'} in the URL path and {'{{param}}'} in the body to declare
          parameters the AI can fill, e.g. …/users/{'{userId}'}. Fill in the mandatory details and register.
        </Typography>

        <MonacoJsonEditor language="shell" value={curl} onChange={setCurl} height={130} />

        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField
              fullWidth
              required
              size="small"
              label="Tool name"
              placeholder="get_orders"
              value={toolName}
              onChange={(e) => setToolName(e.target.value)}
              error={toolName.length > 0 && !TOOL_NAME_PATTERN.test(toolName)}
              helperText="snake_case — MCP identifier"
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <TextField
              fullWidth
              required
              size="small"
              label="Display name"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <Autocomplete
              multiple
              size="small"
              options={groups ?? []}
              getOptionLabel={(g) => g.displayName}
              value={(groups ?? []).filter((g) => groupIds.includes(g.id))}
              onChange={(_, v) => setGroupIds(v.map((g) => g.id))}
              renderInput={(params) => <TextField {...params} label="Groups (optional)" />}
            />
          </Grid>
          <Grid size={12}>
            <TextField
              fullWidth
              required
              size="small"
              label="Description"
              placeholder="What the tool does — shown to AI models"
              multiline
              minRows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </Grid>
        </Grid>

        {parseError && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {parseError}
          </Alert>
        )}

        {parsed && (
          <Box sx={{ mt: 2 }}>
            <Divider sx={{ mb: 1.5 }} />
            <Typography variant="subtitle2" fontWeight={700} gutterBottom>
              Parsed configuration
            </Typography>
            {parsed.warnings.map((warning) => (
              <Alert key={warning} severity="warning" sx={{ mb: 1 }}>
                {warning}
              </Alert>
            ))}
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
              <MethodChip method={parsed.method} />
              <Typography
                variant="body2"
                sx={{ fontFamily: '"JetBrains Mono", monospace', wordBreak: 'break-all' }}
              >
                {parsed.uri}
              </Typography>
            </Stack>
            <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ mb: 1.5 }}>
              <Chip size="small" label={`${parsed.headers.length} header(s)`} />
              <Chip size="small" label={`${parsed.pathVariables.length} path var(s)`} />
              <Chip size="small" label={`${parsed.queryParameters.length} query param(s)`} />
              <Chip size="small" label={`${parsed.bodyParameters.length} body param(s)`} />
              {parsed.headers.some((h) => h.sensitive) && (
                <Chip size="small" color="warning" variant="outlined" label="sensitive headers auto-masked" />
              )}
            </Stack>
            {parsed.requestBodyTemplate && (
              <>
                <Typography variant="caption" fontWeight={700} color="text.secondary">
                  BODY TEMPLATE (values become {'{{parameters}}'})
                </Typography>
                <JsonViewer value={parsed.requestBodyTemplate} maxHeight={160} />
              </>
            )}
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button
          variant="outlined"
          startIcon={parseCurl.isPending ? <CircularProgress size={14} /> : <PreviewIcon />}
          onClick={handlePreview}
          disabled={!curl.trim() || parseCurl.isPending}
        >
          Preview
        </Button>
        <Button
          variant="contained"
          startIcon={<BoltIcon />}
          onClick={handleRegister}
          disabled={!curl.trim() || !mandatoryValid || quickRegister.isPending}
        >
          Register tool
        </Button>
      </DialogActions>
    </Dialog>
  );
}
