import { useNavigate, useParams } from 'react-router-dom';
import Box from '@mui/material/Box';
import Skeleton from '@mui/material/Skeleton';
import { useSnackbar } from 'notistack';
import { useTool, useUpdateTool } from '@/api/hooks';
import { errorMessage } from '@/api/client';
import PageHeader from '@/components/layout/PageHeader';
import ToolForm from '@/components/tools/ToolForm/ToolForm';
import { fromTool, toToolRequest, type ToolFormValues } from '@/components/tools/ToolForm/schema';

export default function ToolEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const { data: tool, isLoading } = useTool(id);
  const updateTool = useUpdateTool(id ?? '');

  const handleSubmit = async (values: ToolFormValues) => {
    try {
      await updateTool.mutateAsync(toToolRequest(values));
      enqueueSnackbar('Tool updated', { variant: 'success' });
      navigate(`/tools/${id}`);
    } catch (error) {
      enqueueSnackbar(errorMessage(error), { variant: 'error' });
    }
  };

  if (isLoading || !tool) {
    return <Skeleton variant="rounded" height={480} />;
  }

  return (
    <Box>
      <PageHeader title={`Edit: ${tool.displayName}`} subtitle={tool.toolName} />
      <ToolForm
        initialValues={fromTool(tool)}
        submitLabel="Save changes"
        submitting={updateTool.isPending}
        editMode
        onSubmit={handleSubmit}
      />
    </Box>
  );
}
