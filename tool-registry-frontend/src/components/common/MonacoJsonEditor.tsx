import Editor from '@monaco-editor/react';
import Box from '@mui/material/Box';
import { useTheme } from '@mui/material/styles';

interface MonacoJsonEditorProps {
  value?: string;
  onChange?: (value: string) => void;
  height?: number | string;
  readOnly?: boolean;
  language?: string;
}

export default function MonacoJsonEditor({
  value = '',
  onChange,
  height = 240,
  readOnly = false,
  language = 'json',
}: MonacoJsonEditorProps) {
  const theme = useTheme();
  return (
    <Box
      sx={{
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: 2,
        overflow: 'hidden',
        '& .monaco-editor': { outline: 'none' },
      }}
    >
      <Editor
        height={height}
        language={language}
        value={value}
        theme={theme.palette.mode === 'dark' ? 'vs-dark' : 'light'}
        onChange={(v) => onChange?.(v ?? '')}
        options={{
          readOnly,
          minimap: { enabled: false },
          fontSize: 13,
          fontFamily: '"JetBrains Mono", monospace',
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 2,
          lineNumbers: 'on',
          folding: true,
          renderLineHighlight: 'none',
          overviewRulerLanes: 0,
          hideCursorInOverviewRuler: true,
          scrollbar: { verticalScrollbarSize: 8, horizontalScrollbarSize: 8 },
        }}
      />
    </Box>
  );
}
