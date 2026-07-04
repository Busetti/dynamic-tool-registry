import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';

export default function TagList({ tags, max = 5 }: { tags?: string[]; max?: number }) {
  if (!tags?.length) return null;
  const visible = tags.slice(0, max);
  const overflow = tags.length - visible.length;
  return (
    <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
      {visible.map((tag) => (
        <Chip key={tag} label={tag} size="small" sx={{ fontSize: 11 }} />
      ))}
      {overflow > 0 && <Chip label={`+${overflow}`} size="small" sx={{ fontSize: 11 }} />}
    </Stack>
  );
}
