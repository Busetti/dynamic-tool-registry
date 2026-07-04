import { useNavigate } from 'react-router-dom';
import Box from '@mui/material/Box';
import { useSnackbar } from 'notistack';
import { useCreateTool } from '@/api/hooks';
import { errorMessage } from '@/api/client';
import PageHeader from '@/components/layout/PageHeader';
import ToolForm from '@/components/tools/ToolForm/ToolForm';
import { toToolRequest, type ToolFormValues } from '@/components/tools/ToolForm/schema';

export default function ToolCreatePage() {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const createTool = useCreateTool();

  const handleSubmit = async (values: ToolFormValues) => {
    try {
      const tool = await createTool.mutateAsync(toToolRequest(values));
      enqueueSnackbar('Tool registered — activate it to expose it via MCP', { variant: 'success' });
      navigate(`/tools/${tool.id}`);
    } catch (error) {
      enqueueSnackbar(errorMessage(error), { variant: 'error' });
    }
  };

  return (
    <Box>
      <PageHeader
        title="Register Tool"
        subtitle="Describe an API with enough business and technical context for AI models to use it well"
      />
      <ToolForm submitLabel="Register tool" submitting={createTool.isPending} onSubmit={handleSubmit} />
    </Box>
  );
}
