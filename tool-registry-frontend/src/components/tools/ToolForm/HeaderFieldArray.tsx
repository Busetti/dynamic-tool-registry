import { Controller, useFieldArray, type Control } from 'react-hook-form';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import type { ToolFormValues } from './schema';

/** Dynamic-row editor for HTTP headers (unlimited rows). */
export default function HeaderFieldArray({ control }: { control: Control<ToolFormValues> }) {
  const { fields, append, remove } = useFieldArray({ control, name: 'headers' });

  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
        <Box>
          <Typography variant="subtitle2" fontWeight={700}>
            Headers ({fields.length})
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Sent with every invocation. Mark secrets as sensitive — values are masked everywhere in the UI.
          </Typography>
        </Box>
        <Button
          size="small"
          startIcon={<AddIcon />}
          onClick={() => append({ name: '', value: '', description: '', required: false, sensitive: false })}
        >
          Add
        </Button>
      </Stack>
      <Stack spacing={1}>
        {fields.map((field, index) => (
          <Stack
            key={field.id}
            direction={{ xs: 'column', md: 'row' }}
            spacing={1}
            alignItems={{ md: 'center' }}
            sx={{ p: 1.25, border: 1, borderColor: 'divider', borderRadius: 2 }}
          >
            <Controller
              control={control}
              name={`headers.${index}.name`}
              render={({ field: f, fieldState }) => (
                <TextField
                  {...f}
                  size="small"
                  label="Header name"
                  placeholder="X-Api-Key"
                  error={!!fieldState.error}
                  helperText={fieldState.error?.message}
                  sx={{ minWidth: 170 }}
                />
              )}
            />
            <Controller
              control={control}
              name={`headers.${index}.value`}
              render={({ field: f }) => (
                <TextField {...f} size="small" label="Value" sx={{ flexGrow: 1 }} />
              )}
            />
            <Controller
              control={control}
              name={`headers.${index}.description`}
              render={({ field: f }) => (
                <TextField {...f} size="small" label="Description" sx={{ width: 180 }} />
              )}
            />
            <Controller
              control={control}
              name={`headers.${index}.sensitive`}
              render={({ field: f }) => (
                <Tooltip title="Sensitive (masked in UI and execution echoes)">
                  <Checkbox checked={f.value} onChange={(e) => f.onChange(e.target.checked)} size="small" />
                </Tooltip>
              )}
            />
            <IconButton size="small" color="error" onClick={() => remove(index)}>
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Stack>
        ))}
        {!fields.length && (
          <Typography variant="caption" color="text.secondary" sx={{ py: 1, textAlign: 'center' }}>
            No headers defined
          </Typography>
        )}
      </Stack>
    </Box>
  );
}
