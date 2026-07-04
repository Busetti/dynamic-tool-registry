import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from '@tanstack/react-table';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TablePagination from '@mui/material/TablePagination';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import AddIcon from '@mui/icons-material/Add';
import BoltIcon from '@mui/icons-material/Bolt';
import BuildIcon from '@mui/icons-material/Build';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import SearchIcon from '@mui/icons-material/Search';
import InputAdornment from '@mui/material/InputAdornment';
import { useGroups, useTools } from '@/api/hooks';
import type { ToolSummary } from '@/api/types';
import PageHeader from '@/components/layout/PageHeader';
import StatusChip from '@/components/common/StatusChip';
import MethodChip from '@/components/common/MethodChip';
import TagList from '@/components/common/TagList';
import EmptyState from '@/components/common/EmptyState';
import QuickRegisterDialog from '@/components/tools/QuickRegisterDialog';

const columnHelper = createColumnHelper<ToolSummary>();

export default function ToolListPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [page, setPage] = useState(0);
  const [size, setSize] = useState(20);
  const [search, setSearch] = useState('');
  const [quickOpen, setQuickOpen] = useState(false);

  const status = searchParams.get('status') ?? '';
  const groupId = searchParams.get('groupId') ?? '';

  const { data, isLoading } = useTools({
    page,
    size,
    status: status || undefined,
    groupId: groupId || undefined,
    search: search || undefined,
  });
  const { data: groups } = useGroups();

  const setFilter = (key: string, value: string) => {
    setPage(0);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value) next.set(key, value);
      else next.delete(key);
      return next;
    });
  };

  const columns = useMemo(
    () => [
      columnHelper.accessor('displayName', {
        header: 'Tool',
        cell: (info) => (
          <Box sx={{ minWidth: 180 }}>
            <Typography variant="body2" fontWeight={600}>
              {info.getValue()}
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontFamily: '"JetBrains Mono", monospace' }}
            >
              {info.row.original.toolName}
            </Typography>
          </Box>
        ),
      }),
      columnHelper.accessor('method', {
        header: 'Method',
        cell: (info) => <MethodChip method={info.getValue()} />,
      }),
      columnHelper.accessor('uri', {
        header: 'Endpoint',
        cell: (info) => (
          <Typography
            variant="caption"
            sx={{
              fontFamily: '"JetBrains Mono", monospace',
              display: 'block',
              maxWidth: 320,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {info.getValue()}
          </Typography>
        ),
      }),
      columnHelper.accessor('category', {
        header: 'Category',
        cell: (info) => info.getValue() ?? '—',
      }),
      columnHelper.accessor('tags', {
        header: 'Tags',
        cell: (info) => <TagList tags={info.getValue()} max={3} />,
      }),
      columnHelper.accessor('status', {
        header: 'Status',
        cell: (info) => <StatusChip status={info.getValue()} />,
      }),
      columnHelper.display({
        id: 'actions',
        header: '',
        cell: (info) => (
          <Tooltip title="Open test console">
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/tools/${info.row.original.id}/test`);
              }}
            >
              <PlayArrowIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        ),
      }),
    ],
    [navigate],
  );

  const table = useReactTable({
    data: data?.content ?? [],
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  return (
    <Box>
      <PageHeader
        title="Tools"
        subtitle={`${data?.totalElements ?? 0} tools in the catalog`}
        actions={
          <>
            <Button variant="outlined" startIcon={<BoltIcon />} onClick={() => setQuickOpen(true)}>
              Quick Register (curl)
            </Button>
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => navigate('/tools/new')}>
              Register Tool
            </Button>
          </>
        }
      />

      <QuickRegisterDialog open={quickOpen} onClose={() => setQuickOpen(false)} />

      <Card sx={{ mb: 2.5, p: 2 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <TextField
            size="small"
            placeholder="Search name, description, keywords…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(0);
            }}
            sx={{ flexGrow: 1 }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
          />
          <TextField
            select
            size="small"
            label="Status"
            value={status}
            onChange={(e) => setFilter('status', e.target.value)}
            sx={{ minWidth: 150 }}
          >
            <MenuItem value="">All</MenuItem>
            {['DRAFT', 'ACTIVE', 'DEPRECATED', 'DISABLED'].map((s) => (
              <MenuItem key={s} value={s}>
                {s}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            label="Group"
            value={groupId}
            onChange={(e) => setFilter('groupId', e.target.value)}
            sx={{ minWidth: 180 }}
          >
            <MenuItem value="">All</MenuItem>
            {groups?.map((group) => (
              <MenuItem key={group.id} value={group.id}>
                {group.displayName}
              </MenuItem>
            ))}
          </TextField>
        </Stack>
      </Card>

      <Card>
        {isLoading ? (
          <Box sx={{ p: 2 }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} height={52} />
            ))}
          </Box>
        ) : !data?.content.length ? (
          <EmptyState
            icon={<BuildIcon />}
            title="No tools found"
            description={
              search || status || groupId
                ? 'Try adjusting your filters or search query.'
                : 'Register your first API as an AI tool to start building the catalog.'
            }
            actionLabel="Register Tool"
            onAction={() => navigate('/tools/new')}
          />
        ) : (
          <>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <TableCell key={header.id} sx={{ fontWeight: 700, whiteSpace: 'nowrap', py: 1.5 }}>
                          {flexRender(header.column.columnDef.header, header.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableHead>
                <TableBody>
                  {table.getRowModel().rows.map((row) => (
                    <TableRow
                      key={row.id}
                      hover
                      sx={{ cursor: 'pointer' }}
                      onClick={() => navigate(`/tools/${row.original.id}`)}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id} sx={{ py: 1.25 }}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              component="div"
              count={data.totalElements}
              page={page}
              rowsPerPage={size}
              onPageChange={(_, newPage) => setPage(newPage)}
              onRowsPerPageChange={(e) => {
                setSize(parseInt(e.target.value, 10));
                setPage(0);
              }}
              rowsPerPageOptions={[10, 20, 50]}
            />
          </>
        )}
      </Card>
    </Box>
  );
}
