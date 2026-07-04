import { createTheme, type Theme } from '@mui/material/styles';

const shared = {
  typography: {
    fontFamily: '"Inter", system-ui, -apple-system, sans-serif',
    h4: { fontWeight: 700 },
    h5: { fontWeight: 700 },
    h6: { fontWeight: 600 },
    button: { textTransform: 'none' as const, fontWeight: 600 },
  },
  shape: { borderRadius: 10 },
};

export const darkTheme: Theme = createTheme({
  ...shared,
  palette: {
    mode: 'dark',
    primary: { main: '#58a6ff' },
    secondary: { main: '#bc8cff' },
    success: { main: '#3fb950' },
    warning: { main: '#d29922' },
    error: { main: '#f85149' },
    background: { default: '#0d1117', paper: '#161b22' },
    divider: '#30363d',
    text: { primary: '#e6edf3', secondary: '#8b949e' },
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: 'none', border: '1px solid #30363d' },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: { backgroundColor: '#010409', borderBottom: '1px solid #30363d' },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: { backgroundColor: '#010409', borderRight: '1px solid #30363d' },
      },
    },
    MuiTableCell: {
      styleOverrides: { root: { borderBottom: '1px solid #21262d' } },
    },
  },
});

export const lightTheme: Theme = createTheme({
  ...shared,
  palette: {
    mode: 'light',
    primary: { main: '#0969da' },
    secondary: { main: '#8250df' },
    success: { main: '#1a7f37' },
    warning: { main: '#9a6700' },
    error: { main: '#cf222e' },
    background: { default: '#f6f8fa', paper: '#ffffff' },
    divider: '#d0d7de',
    text: { primary: '#1f2328', secondary: '#656d76' },
  },
  components: {
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: 'none', border: '1px solid #d0d7de' },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: { backgroundColor: '#ffffff', borderBottom: '1px solid #d0d7de', color: '#1f2328' },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: { backgroundColor: '#ffffff', borderRight: '1px solid #d0d7de' },
      },
    },
  },
});
