import Chip from '@mui/material/Chip';

const methodColors: Record<string, string> = {
  GET: '#3fb950',
  POST: '#d29922',
  PUT: '#58a6ff',
  PATCH: '#bc8cff',
  DELETE: '#f85149',
};

export default function MethodChip({ method }: { method?: string }) {
  if (!method) return null;
  const color = methodColors[method.toUpperCase()] ?? '#8b949e';
  return (
    <Chip
      label={method.toUpperCase()}
      size="small"
      sx={{
        fontFamily: '"JetBrains Mono", monospace',
        fontWeight: 700,
        fontSize: 11,
        color,
        borderColor: color,
        bgcolor: 'transparent',
      }}
      variant="outlined"
    />
  );
}
