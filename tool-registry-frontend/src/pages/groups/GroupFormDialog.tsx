import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Autocomplete from '@mui/material/Autocomplete';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Grid from '@mui/material/Grid2';
import TextField from '@mui/material/TextField';
import { useSnackbar } from 'notistack';
import { useCreateGroup, useUpdateGroup } from '@/api/hooks';
import { errorMessage } from '@/api/client';
import type { Group } from '@/api/types';

const groupSchema = z.object({
  name: z
    .string()
    .min(2)
    .max(64)
    .regex(/^[a-z][a-z0-9-]{1,63}$/, 'Lowercase letters, digits and hyphens; must start with a letter'),
  displayName: z.string().min(1, 'Required').max(120),
  description: z.string().max(2000).optional(),
  businessArea: z.string().max(120).optional(),
  teamName: z.string().max(120).optional(),
  owner: z.string().max(200).optional(),
  tags: z.array(z.string().max(50)).optional(),
  documentation: z.string().max(50000).optional(),
});

type GroupFormValues = z.infer<typeof groupSchema>;

interface GroupFormDialogProps {
  open: boolean;
  group?: Group | null;
  onClose: () => void;
}

export default function GroupFormDialog({ open, group, onClose }: GroupFormDialogProps) {
  const { enqueueSnackbar } = useSnackbar();
  const createGroup = useCreateGroup();
  const updateGroup = useUpdateGroup(group?.id ?? '');
  const isEdit = !!group;

  const { control, handleSubmit, reset, formState } = useForm<GroupFormValues>({
    resolver: zodResolver(groupSchema),
    defaultValues: { name: '', displayName: '', tags: [] },
  });

  useEffect(() => {
    if (open) {
      reset(
        group
          ? {
              name: group.name,
              displayName: group.displayName,
              description: group.description ?? '',
              businessArea: group.businessArea ?? '',
              teamName: group.teamName ?? '',
              owner: group.owner ?? '',
              tags: group.tags ?? [],
              documentation: group.documentation ?? '',
            }
          : { name: '', displayName: '', description: '', businessArea: '', teamName: '', owner: '', tags: [], documentation: '' },
      );
    }
  }, [open, group, reset]);

  const onSubmit = handleSubmit(async (values) => {
    try {
      if (isEdit) {
        await updateGroup.mutateAsync(values);
        enqueueSnackbar('Group updated', { variant: 'success' });
      } else {
        await createGroup.mutateAsync(values);
        enqueueSnackbar('Group created', { variant: 'success' });
      }
      onClose();
    } catch (error) {
      enqueueSnackbar(errorMessage(error), { variant: 'error' });
    }
  });

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{isEdit ? 'Edit Group' : 'Create Group'}</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Controller
              name="name"
              control={control}
              render={({ field, fieldState }) => (
                <TextField
                  {...field}
                  label="Machine name"
                  placeholder="payments-platform"
                  fullWidth
                  disabled={isEdit}
                  error={!!fieldState.error}
                  helperText={fieldState.error?.message}
                />
              )}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Controller
              name="displayName"
              control={control}
              render={({ field, fieldState }) => (
                <TextField
                  {...field}
                  label="Display name"
                  fullWidth
                  error={!!fieldState.error}
                  helperText={fieldState.error?.message}
                />
              )}
            />
          </Grid>
          <Grid size={12}>
            <Controller
              name="description"
              control={control}
              render={({ field }) => (
                <TextField {...field} label="Description" fullWidth multiline minRows={2} />
              )}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Controller
              name="businessArea"
              control={control}
              render={({ field }) => <TextField {...field} label="Business area" fullWidth />}
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Controller
              name="teamName"
              control={control}
              render={({ field }) => <TextField {...field} label="Team name" fullWidth />}
            />
          </Grid>
          <Grid size={12}>
            <Controller
              name="owner"
              control={control}
              render={({ field }) => (
                <TextField {...field} label="Owner" placeholder="jane.doe@corp.com" fullWidth />
              )}
            />
          </Grid>
          <Grid size={12}>
            <Controller
              name="tags"
              control={control}
              render={({ field }) => (
                <Autocomplete
                  multiple
                  freeSolo
                  options={[]}
                  value={field.value ?? []}
                  onChange={(_, value) => field.onChange(value)}
                  renderTags={(value, getTagProps) =>
                    value.map((option, index) => (
                      <Chip label={option} size="small" {...getTagProps({ index })} key={option} />
                    ))
                  }
                  renderInput={(params) => (
                    <TextField {...params} label="Tags" placeholder="Type and press Enter" />
                  )}
                />
              )}
            />
          </Grid>
          <Grid size={12}>
            <Controller
              name="documentation"
              control={control}
              render={({ field }) => (
                <TextField {...field} label="Documentation (Markdown)" fullWidth multiline minRows={4} />
              )}
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} color="inherit">
          Cancel
        </Button>
        <Button variant="contained" onClick={onSubmit} disabled={formState.isSubmitting}>
          {isEdit ? 'Save changes' : 'Create group'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
