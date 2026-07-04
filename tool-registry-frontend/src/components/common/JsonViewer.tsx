import { useMemo } from 'react';
import Box from '@mui/material/Box';
import { useTheme } from '@mui/material/styles';
import CopyButton from './CopyButton';

/**
 * Pretty, syntax-highlighted JSON viewer. Falls back to raw text when the
 * content is not valid JSON.
 */
export default function JsonViewer({ value, maxHeight = 480 }: { value?: string | null; maxHeight?: number }) {
  const theme = useTheme();
  const pretty = useMemo(() => {
    if (!value) return '';
    try {
      return JSON.stringify(JSON.parse(value), null, 2);
    } catch {
      return value;
    }
  }, [value]);

  if (!pretty) return null;

  return (
    <Box sx={{ position: 'relative' }}>
      <Box sx={{ position: 'absolute', top: 4, right: 4, zIndex: 1 }}>
        <CopyButton text={pretty} />
      </Box>
      <Box
        component="pre"
        sx={{
          m: 0,
          p: 2,
          borderRadius: 2,
          border: `1px solid ${theme.palette.divider}`,
          bgcolor: theme.palette.mode === 'dark' ? '#0d1117' : '#f6f8fa',
          fontFamily: '"JetBrains Mono", monospace',
          fontSize: 12.5,
          lineHeight: 1.6,
          overflow: 'auto',
          maxHeight,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
        }}
      >
        {pretty}
      </Box>
    </Box>
  );
}
