import { Controller, useFieldArray, type Control } from 'react-hook-form';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import type { ToolFormValues } from './schema';

interface ParameterFieldArrayProps {
  control: Control<ToolFormValues>;
  name: 'pathVariables' | 'queryParameters' | 'bodyParameters';
  title: string;
  hint?: string;
}

/** Reusable dynamic-row editor for path/query/body parameters (unlimited rows). */
export default function ParameterFieldArray({ control, name, title, hint }: ParameterFieldArrayProps) {
  const { fields, append, remove } = useFieldArray({ control, name });

  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
        <Box>
          <Typography variant="subtitle2" fontWeight={700}>
            {title} ({fields.length})
          </Typography>
          {hint && (
            <Typography variant="caption" color="text.secondary">
              {hint}
            </Typography>
          )}
        </Box>
        <Button
          size="small"
          startIcon={<AddIcon />}
          onClick={() =>
            append({ name: '', type: 'string', description: '', required: true, defaultValue: '', enumCsv: '' })
          }
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
              name={`${name}.${index}.name`}
              render={({ field: f, fieldState }) => (
                <TextField
                  {...f}
                  size="small"
                  label="Name"
                  error={!!fieldState.error}
                  helperText={fieldState.error?.message}
                  sx={{ minWidth: 140 }}
                />
              )}
            />
            <Controller
              control={control}
              name={`${name}.${index}.type`}
              render={({ field: f }) => (
                <TextField {...f} size="small" select label="Type" sx={{ minWidth: 110 }}>
                  {['string', 'number', 'integer', 'boolean'].map((t) => (
                    <MenuItem key={t} value={t}>
                      {t}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />
            <Controller
              control={control}
              name={`${name}.${index}.description`}
              render={({ field: f }) => (
                <TextField {...f} size="small" label="Description" sx={{ flexGrow: 1 }} />
              )}
            />
            <Controller
              control={control}
              name={`${name}.${index}.defaultValue`}
              render={({ field: f }) => (
                <TextField {...f} size="small" label="Default" sx={{ width: 100 }} />
              )}
            />
            <Controller
              control={control}
              name={`${name}.${index}.enumCsv`}
              render={({ field: f }) => (
                <Tooltip title="Comma-separated list of allowed values (optional)">
                  <TextField {...f} size="small" label="Enum (csv)" sx={{ width: 130 }} />
                </Tooltip>
              )}
            />
            <Controller
              control={control}
              name={`${name}.${index}.required`}
              render={({ field: f }) => (
                <Tooltip title="Required">
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
            None defined
          </Typography>
        )}
      </Stack>
    </Box>
  );
}
