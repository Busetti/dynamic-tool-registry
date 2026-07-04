import Chip from '@mui/material/Chip';
import type { ToolStatus } from '@/api/types';

const statusConfig: Record<ToolStatus, { color: 'default' | 'success' | 'warning' | 'error'; label: string }> = {
  DRAFT: { color: 'default', label: 'Draft' },
  ACTIVE: { color: 'success', label: 'Active' },
  DEPRECATED: { color: 'warning', label: 'Deprecated' },
  DISABLED: { color: 'error', label: 'Disabled' },
};

export default function StatusChip({ status, size = 'small' }: { status: ToolStatus; size?: 'small' | 'medium' }) {
  const config = statusConfig[status] ?? statusConfig.DRAFT;
  return <Chip label={config.label} color={config.color} size={size} variant="outlined" />;
}
