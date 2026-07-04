import { useState } from 'react';
import { Controller, FormProvider, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Autocomplete from '@mui/material/Autocomplete';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid2';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Step from '@mui/material/Step';
import StepButton from '@mui/material/StepButton';
import Stepper from '@mui/material/Stepper';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CheckIcon from '@mui/icons-material/Check';
import { AnimatePresence, motion } from 'framer-motion';
import { useGroups } from '@/api/hooks';
import MonacoJsonEditor from '@/components/common/MonacoJsonEditor';
import MethodChip from '@/components/common/MethodChip';
import StatusChip from '@/components/common/StatusChip';
import ParameterFieldArray from './ParameterFieldArray';
import HeaderFieldArray from './HeaderFieldArray';
import { emptyToolForm, toolFormSchema, type ToolFormValues } from './schema';

const steps = ['Basic', 'Technical', 'Parameters', 'Documentation', 'AI Context', 'Review'];

/** Field names validated when leaving each step. */
const stepFields: (keyof ToolFormValues)[][] = [
  ['toolName', 'displayName', 'description'],
  ['method', 'uri', 'timeoutMs'],
  ['headers', 'pathVariables', 'queryParameters', 'bodyParameters'],
  ['externalLinks'],
  [],
  [],
];

interface ToolFormProps {
  initialValues?: ToolFormValues;
  submitLabel: string;
  submitting?: boolean;
  editMode?: boolean;
  onSubmit: (values: ToolFormValues) => void;
}

function FreeSoloChips({
  label,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  placeholder?: string;
  value: string[];
  onChange: (value: string[]) => void;
}) {
  return (
    <Autocomplete
      multiple
      freeSolo
      options={[]}
      value={value}
      onChange={(_, v) => onChange(v as string[])}
      renderTags={(tagValue, getTagProps) =>
        tagValue.map((option, index) => (
          <Chip label={option} size="small" {...getTagProps({ index })} key={`${option}-${index}`} />
        ))
      }
      renderInput={(params) => <TextField {...params} label={label} placeholder={placeholder ?? 'Type and press Enter'} />}
    />
  );
}

export default function ToolForm({ initialValues, submitLabel, submitting, editMode, onSubmit }: ToolFormProps) {
  const [activeStep, setActiveStep] = useState(0);
  const { data: groups } = useGroups();

  const methods = useForm<ToolFormValues>({
    resolver: zodResolver(toolFormSchema),
    defaultValues: initialValues ?? emptyToolForm,
    mode: 'onTouched',
  });
  const { control, handleSubmit, trigger, watch, getValues } = methods;

  const method = watch('method');

  const goNext = async () => {
    const valid = await trigger(stepFields[activeStep]);
    if (valid) setActiveStep((s) => Math.min(s + 1, steps.length - 1));
  };
  const goBack = () => setActiveStep((s) => Math.max(s - 1, 0));

  const submit = handleSubmit((values) => onSubmit(values));

  return (
    <FormProvider {...methods}>
      <Card>
        <CardContent>
          <Stepper nonLinear activeStep={activeStep} alternativeLabel sx={{ mb: 4 }}>
            {steps.map((label, index) => (
              <Step key={label} completed={index < activeStep}>
                <StepButton onClick={() => setActiveStep(index)}>{label}</StepButton>
              </Step>
            ))}
          </Stepper>

          <AnimatePresence mode="wait">
            <motion.div
              key={activeStep}
              initial={{ opacity: 0, x: 16 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -16 }}
              transition={{ duration: 0.2 }}
            >
              {activeStep === 0 && (
                <Grid container spacing={2.5}>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Controller
                      name="toolName"
                      control={control}
                      render={({ field, fieldState }) => (
                        <TextField
                          {...field}
                          label="Tool name (MCP identifier)"
                          placeholder="get_employee_by_id"
                          fullWidth
                          disabled={editMode}
                          error={!!fieldState.error}
                          helperText={fieldState.error?.message ?? 'snake_case — how AI models reference this tool'}
                        />
                      )}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
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
                      render={({ field, fieldState }) => (
                        <TextField
                          {...field}
                          label="Description"
                          fullWidth
                          multiline
                          minRows={2}
                          error={!!fieldState.error}
                          helperText={fieldState.error?.message ?? 'What the tool does — shown to AI models'}
                        />
                      )}
                    />
                  </Grid>
                  <Grid size={12}>
                    <Controller
                      name="businessPurpose"
                      control={control}
                      render={({ field }) => (
                        <TextField {...field} label="Business purpose" fullWidth multiline minRows={2} helperText="Why this tool exists" />
                      )}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <Controller
                      name="businessCapability"
                      control={control}
                      render={({ field }) => (
                        <TextField {...field} label="Business capability" placeholder="HR / Employee Data" fullWidth />
                      )}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <Controller
                      name="category"
                      control={control}
                      render={({ field }) => <TextField {...field} label="Category" fullWidth />}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <Controller
                      name="version"
                      control={control}
                      render={({ field }) => <TextField {...field} label="Version" fullWidth />}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Controller
                      name="tags"
                      control={control}
                      render={({ field }) => (
                        <FreeSoloChips label="Tags" value={field.value ?? []} onChange={field.onChange} />
                      )}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Controller
                      name="groupIds"
                      control={control}
                      render={({ field }) => (
                        <Autocomplete
                          multiple
                          options={groups ?? []}
                          getOptionLabel={(g) => g.displayName}
                          value={(groups ?? []).filter((g) => field.value?.includes(g.id))}
                          onChange={(_, v) => field.onChange(v.map((g) => g.id))}
                          renderInput={(params) => <TextField {...params} label="Groups" placeholder="Assign groups" />}
                        />
                      )}
                    />
                  </Grid>
                </Grid>
              )}

              {activeStep === 1 && (
                <Grid container spacing={2.5}>
                  <Grid size={{ xs: 12, md: 3 }}>
                    <Controller
                      name="method"
                      control={control}
                      render={({ field }) => (
                        <TextField {...field} select label="HTTP method" fullWidth>
                          <MenuItem value="GET">GET</MenuItem>
                          <MenuItem value="POST">POST</MenuItem>
                        </TextField>
                      )}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 9 }}>
                    <Controller
                      name="uri"
                      control={control}
                      render={({ field, fieldState }) => (
                        <TextField
                          {...field}
                          label="URI"
                          placeholder="https://api.corp.com/employees/{employeeId}"
                          fullWidth
                          error={!!fieldState.error}
                          helperText={
                            fieldState.error?.message ??
                            'Use {variable} templates for path variables — declare them in the Parameters step'
                          }
                          InputProps={{ sx: { fontFamily: '"JetBrains Mono", monospace', fontSize: 14 } }}
                        />
                      )}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Controller
                      name="contentType"
                      control={control}
                      render={({ field }) => (
                        <TextField {...field} select label="Content type" fullWidth>
                          {['application/json', 'application/x-www-form-urlencoded', 'text/plain', 'application/xml'].map((ct) => (
                            <MenuItem key={ct} value={ct}>
                              {ct}
                            </MenuItem>
                          ))}
                        </TextField>
                      )}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Controller
                      name="timeoutMs"
                      control={control}
                      render={({ field, fieldState }) => (
                        <TextField
                          {...field}
                          type="number"
                          label="Timeout (ms)"
                          fullWidth
                          error={!!fieldState.error}
                          helperText={fieldState.error?.message}
                        />
                      )}
                    />
                  </Grid>
                  {method === 'POST' && (
                    <Grid size={12}>
                      <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
                        Request body template
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                        Use {'{{parameterName}}'} placeholders — declare each parameter as a body parameter in the next step.
                      </Typography>
                      <Controller
                        name="requestBodyTemplate"
                        control={control}
                        render={({ field }) => (
                          <MonacoJsonEditor value={field.value} onChange={field.onChange} height={220} />
                        )}
                      />
                    </Grid>
                  )}
                </Grid>
              )}

              {activeStep === 2 && (
                <Stack spacing={4}>
                  <HeaderFieldArray control={control} />
                  <Divider />
                  <ParameterFieldArray
                    control={control}
                    name="pathVariables"
                    title="Path variables"
                    hint="Must exactly match {variable} templates in the URI"
                  />
                  <Divider />
                  <ParameterFieldArray
                    control={control}
                    name="queryParameters"
                    title="Query parameters"
                    hint="Appended to the URL as ?name=value"
                  />
                  {method === 'POST' && (
                    <>
                      <Divider />
                      <ParameterFieldArray
                        control={control}
                        name="bodyParameters"
                        title="Body parameters"
                        hint="Bound to {{placeholders}} in the body template, or sent as a flat JSON object"
                      />
                    </>
                  )}
                </Stack>
              )}

              {activeStep === 3 && (
                <Grid container spacing={2.5}>
                  <Grid size={12}>
                    <Controller
                      name="docMarkdown"
                      control={control}
                      render={({ field }) => (
                        <TextField {...field} label="Documentation (Markdown)" fullWidth multiline minRows={5} />
                      )}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Controller
                      name="swaggerUrl"
                      control={control}
                      render={({ field }) => <TextField {...field} label="Swagger / OpenAPI URL" fullWidth />}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Controller
                      name="notes"
                      control={control}
                      render={({ field }) => <TextField {...field} label="Notes" fullWidth />}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
                      Request example (arguments JSON)
                    </Typography>
                    <Controller
                      name="requestExampleJson"
                      control={control}
                      render={({ field }) => (
                        <MonacoJsonEditor value={field.value} onChange={field.onChange} height={180} />
                      )}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
                      Response example (JSON)
                    </Typography>
                    <Controller
                      name="responseExampleJson"
                      control={control}
                      render={({ field }) => (
                        <MonacoJsonEditor value={field.value} onChange={field.onChange} height={180} />
                      )}
                    />
                  </Grid>
                  <Grid size={12}>
                    <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1 }}>
                      Response schema (JSON Schema)
                    </Typography>
                    <Controller
                      name="responseSchema"
                      control={control}
                      render={({ field }) => (
                        <MonacoJsonEditor value={field.value} onChange={field.onChange} height={180} />
                      )}
                    />
                  </Grid>
                </Grid>
              )}

              {activeStep === 4 && (
                <Grid container spacing={2.5}>
                  <Grid size={12}>
                    <Controller
                      name="naturalLanguageDescription"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          label="Natural language description"
                          fullWidth
                          multiline
                          minRows={2}
                          helperText="Plain-English description used as the primary MCP tool description"
                        />
                      )}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Controller
                      name="expectedInputs"
                      control={control}
                      render={({ field }) => (
                        <TextField {...field} label="Expected inputs" fullWidth multiline minRows={2} />
                      )}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Controller
                      name="expectedOutputs"
                      control={control}
                      render={({ field }) => (
                        <TextField {...field} label="Expected outputs" fullWidth multiline minRows={2} />
                      )}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Controller
                      name="useCases"
                      control={control}
                      render={({ field }) => (
                        <FreeSoloChips label="Use cases" value={field.value ?? []} onChange={field.onChange} />
                      )}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 6 }}>
                    <Controller
                      name="examplePrompts"
                      control={control}
                      render={({ field }) => (
                        <FreeSoloChips label="Example prompts" value={field.value ?? []} onChange={field.onChange} />
                      )}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <Controller
                      name="keywords"
                      control={control}
                      render={({ field }) => (
                        <FreeSoloChips label="Keywords" value={field.value ?? []} onChange={field.onChange} />
                      )}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <Controller
                      name="searchAliases"
                      control={control}
                      render={({ field }) => (
                        <FreeSoloChips label="Search aliases" value={field.value ?? []} onChange={field.onChange} />
                      )}
                    />
                  </Grid>
                  <Grid size={{ xs: 12, md: 4 }}>
                    <Controller
                      name="businessDomain"
                      control={control}
                      render={({ field }) => <TextField {...field} label="Business domain" fullWidth />}
                    />
                  </Grid>
                </Grid>
              )}

              {activeStep === 5 && <ReviewStep values={getValues()} />}
            </motion.div>
          </AnimatePresence>

          <Stack direction="row" justifyContent="space-between" sx={{ mt: 4 }}>
            <Button startIcon={<ArrowBackIcon />} onClick={goBack} disabled={activeStep === 0} color="inherit">
              Back
            </Button>
            {activeStep < steps.length - 1 ? (
              <Button variant="contained" endIcon={<ArrowForwardIcon />} onClick={goNext}>
                Next
              </Button>
            ) : (
              <Button variant="contained" startIcon={<CheckIcon />} onClick={submit} disabled={submitting}>
                {submitLabel}
              </Button>
            )}
          </Stack>
        </CardContent>
      </Card>
    </FormProvider>
  );
}

function ReviewRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Stack direction="row" spacing={2} sx={{ py: 0.75 }}>
      <Typography variant="body2" color="text.secondary" sx={{ width: 170, flexShrink: 0 }}>
        {label}
      </Typography>
      <Box sx={{ minWidth: 0 }}>{children}</Box>
    </Stack>
  );
}

function ReviewStep({ values }: { values: ToolFormValues }) {
  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Review & submit
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        New tools start in <StatusChip status="DRAFT" size="small" /> status — activate them afterwards to expose them
        through the MCP registry.
      </Typography>
      <Divider sx={{ mb: 1.5 }} />
      <ReviewRow label="Tool name">
        <Typography variant="body2" sx={{ fontFamily: '"JetBrains Mono", monospace' }}>
          {values.toolName}
        </Typography>
      </ReviewRow>
      <ReviewRow label="Display name">
        <Typography variant="body2">{values.displayName}</Typography>
      </ReviewRow>
      <ReviewRow label="Endpoint">
        <Stack direction="row" spacing={1} alignItems="center">
          <MethodChip method={values.method} />
          <Typography variant="body2" sx={{ fontFamily: '"JetBrains Mono", monospace', wordBreak: 'break-all' }}>
            {values.uri}
          </Typography>
        </Stack>
      </ReviewRow>
      <ReviewRow label="Parameters">
        <Typography variant="body2">
          {values.pathVariables.length} path · {values.queryParameters.length} query · {values.bodyParameters.length}{' '}
          body · {values.headers.length} headers
        </Typography>
      </ReviewRow>
      <ReviewRow label="Groups">
        <Typography variant="body2">{values.groupIds?.length ? `${values.groupIds.length} assigned` : 'None'}</Typography>
      </ReviewRow>
      <ReviewRow label="AI context">
        <Typography variant="body2">
          {[
            values.naturalLanguageDescription && 'description',
            values.useCases?.length && `${values.useCases.length} use cases`,
            values.examplePrompts?.length && `${values.examplePrompts.length} prompts`,
            values.keywords?.length && `${values.keywords.length} keywords`,
          ]
            .filter(Boolean)
            .join(' · ') || 'None provided'}
        </Typography>
      </ReviewRow>
    </Box>
  );
}
