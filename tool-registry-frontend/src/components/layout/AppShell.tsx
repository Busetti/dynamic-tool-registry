import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import AppBar from '@mui/material/AppBar';
import Box from '@mui/material/Box';
import Drawer from '@mui/material/Drawer';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Stack from '@mui/material/Stack';
import Toolbar from '@mui/material/Toolbar';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import MenuIcon from '@mui/icons-material/Menu';
import DashboardIcon from '@mui/icons-material/Dashboard';
import BuildIcon from '@mui/icons-material/Build';
import FolderIcon from '@mui/icons-material/Folder';
import HubIcon from '@mui/icons-material/Hub';
import SearchIcon from '@mui/icons-material/Search';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import TerminalIcon from '@mui/icons-material/Terminal';
import { useThemeMode } from '@/theme/ThemeModeContext';
import GlobalSearchDialog from '@/components/search/GlobalSearchDialog';

const DRAWER_WIDTH = 232;

const navItems = [
  { label: 'Dashboard', path: '/', icon: <DashboardIcon /> },
  { label: 'Tools', path: '/tools', icon: <BuildIcon /> },
  { label: 'Groups', path: '/groups', icon: <FolderIcon /> },
  { label: 'MCP Registry', path: '/mcp', icon: <HubIcon /> },
];

export default function AppShell() {
  const { mode, toggleMode } = useThemeMode();
  const theme = useTheme();
  const isDesktop = useMediaQuery(theme.breakpoints.up('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  const drawerContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Toolbar sx={{ px: 2.5 }}>
        <Stack direction="row" spacing={1.25} alignItems="center">
          <TerminalIcon color="primary" />
          <Box>
            <Typography variant="subtitle1" fontWeight={700} lineHeight={1.2}>
              Tool Registry
            </Typography>
            <Typography variant="caption" color="text.secondary">
              AI Tool Catalog & MCP
            </Typography>
          </Box>
        </Stack>
      </Toolbar>
      <List sx={{ px: 1.5, pt: 1 }}>
        {navItems.map((item) => (
          <ListItemButton
            key={item.path}
            component={NavLink}
            to={item.path}
            end={item.path === '/'}
            sx={{
              borderRadius: 2,
              mb: 0.5,
              '&.active': {
                bgcolor: 'action.selected',
                '& .MuiListItemIcon-root, & .MuiListItemText-primary': {
                  color: 'primary.main',
                },
              },
            }}
          >
            <ListItemIcon sx={{ minWidth: 38 }}>{item.icon}</ListItemIcon>
            <ListItemText primary={item.label} primaryTypographyProps={{ fontSize: 14, fontWeight: 600 }} />
          </ListItemButton>
        ))}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <AppBar position="fixed" elevation={0} sx={{ zIndex: theme.zIndex.drawer + 1 }}>
        <Toolbar sx={{ gap: 1 }}>
          {!isDesktop && (
            <IconButton edge="start" onClick={() => setMobileOpen(true)} sx={{ color: 'text.primary' }}>
              <MenuIcon />
            </IconButton>
          )}
          <Box sx={{ width: isDesktop ? DRAWER_WIDTH - 24 : 'auto' }} />
          <Button
            onClick={() => setSearchOpen(true)}
            startIcon={<SearchIcon />}
            sx={{
              color: 'text.secondary',
              border: 1,
              borderColor: 'divider',
              borderRadius: 2,
              px: 2,
              width: { xs: 'auto', sm: 320 },
              justifyContent: 'flex-start',
              bgcolor: 'background.paper',
            }}
          >
            <Box component="span" sx={{ flexGrow: 1, textAlign: 'left', display: { xs: 'none', sm: 'inline' } }}>
              Search tools & groups…
            </Box>
            <Typography variant="caption" sx={{ border: 1, borderColor: 'divider', borderRadius: 1, px: 0.75, display: { xs: 'none', sm: 'inline' } }}>
              ⌘K
            </Typography>
          </Button>
          <Box sx={{ flexGrow: 1 }} />
          <Tooltip title={mode === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}>
            <IconButton onClick={toggleMode} sx={{ color: 'text.primary' }}>
              {mode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>

      <Drawer
        variant={isDesktop ? 'permanent' : 'temporary'}
        open={isDesktop || mobileOpen}
        onClose={() => setMobileOpen(false)}
        sx={{
          width: DRAWER_WIDTH,
          flexShrink: 0,
          '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box' },
        }}
      >
        {drawerContent}
      </Drawer>

      <Box component="main" sx={{ flexGrow: 1, p: { xs: 2, md: 3.5 }, minWidth: 0 }}>
        <Toolbar />
        <Outlet />
      </Box>

      <GlobalSearchDialog open={searchOpen} onClose={() => setSearchOpen(false)} />
    </Box>
  );
}
