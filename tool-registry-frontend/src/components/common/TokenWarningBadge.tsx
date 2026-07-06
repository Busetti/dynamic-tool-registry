import Tooltip from '@mui/material/Tooltip';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';

/**
 * The shared "heavy response" warning symbol — shown wherever a tool's
 * response is (or is likely to be) expensive in tokens.
 */
export default function TokenWarningBadge({ reason }: { reason: string }) {
  return (
    <Tooltip title={reason} arrow>
      <WarningAmberIcon color="warning" fontSize="small" sx={{ verticalAlign: 'middle' }} />
    </Tooltip>
  );
}

/** Config-derived warning for a tool with no token safeguards. */
export function configWarningReason(tool: {
  httpConfig?: { method?: string } | null;
  responseControl?: { limitEnabled?: boolean; format?: string } | null;
}): string | null {
  const isGet = (tool.httpConfig?.method ?? 'GET') === 'GET';
  const limited = tool.responseControl?.limitEnabled === true;
  if (isGet && !limited) {
    return 'No response limit configured — a large result list would be sent to the model in full. Consider enabling a limit or TOON format.';
  }
  return null;
}
