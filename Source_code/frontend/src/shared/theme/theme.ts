import { createTheme } from '@mui/material/styles';

/**
 * Medora Brand Design System Palette & Theme Configuration
 */
export const medoraColors = {
  main: '#0F665F',      // Pine Teal
  dark: '#0B3D36',      // Dark Pine
  accent: '#14B8A6',    // Teal Accent
  light: '#5EEAD4',     // Mint Light
  soft: '#E6FFFA',      // Mint Soft
  textPrimary: '#1E293B',
  textSecondary: '#64748B',
  border: '#CCFBF1',
};

const theme = createTheme({
  palette: {
    primary: {
      main: medoraColors.main,
      dark: medoraColors.dark,
      light: medoraColors.accent,
      contrastText: '#ffffff',
    },
    secondary: {
      main: medoraColors.accent,
      dark: medoraColors.main,
      light: medoraColors.light,
      contrastText: '#ffffff',
    },
    background: {
      default: medoraColors.soft,
      paper: '#ffffff',
    },
    text: {
      primary: medoraColors.textPrimary,
      secondary: medoraColors.textSecondary,
    },
    info: {
      main: '#0284C7',
      light: '#E0F2FE',
    },
    success: {
      main: '#059669',
      light: '#D1FAE5',
    },
    warning: {
      main: '#D97706',
      light: '#FEF3C7',
    },
    error: {
      main: '#DC2626',
      light: '#FEE2E2',
    },
  },
  shape: {
    borderRadius: 16,
  },
  typography: {
    fontFamily: [
      'var(--font-sans)',
      'Inter',
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
    ].join(','),
    h1: {
      fontWeight: 800,
      color: medoraColors.main,
    },
    h2: {
      fontWeight: 800,
      color: medoraColors.main,
    },
    h3: {
      fontWeight: 700,
      color: medoraColors.main,
    },
    h4: {
      fontWeight: 700,
      color: medoraColors.textPrimary,
    },
    h5: {
      fontWeight: 700,
      color: medoraColors.textPrimary,
    },
    h6: {
      fontWeight: 700,
      color: medoraColors.textPrimary,
    },
    subtitle1: {
      fontWeight: 600,
    },
    subtitle2: {
      fontWeight: 600,
    },
    button: {
      textTransform: 'none',
      fontWeight: 600,
    },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          padding: '8px 20px',
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0 4px 12px rgba(15, 102, 95, 0.15)',
          },
        },
      },
      variants: [
        {
          props: { variant: 'contained', color: 'primary' },
          style: {
            backgroundColor: medoraColors.main,
            '&:hover': {
              backgroundColor: medoraColors.dark,
            },
          },
        },
        {
          props: { variant: 'contained', color: 'secondary' },
          style: {
            backgroundColor: medoraColors.accent,
            '&:hover': {
              backgroundColor: medoraColors.main,
            },
          },
        },
        {
          props: { variant: 'outlined', color: 'primary' },
          style: {
            borderColor: medoraColors.accent,
            color: medoraColors.main,
            '&:hover': {
              backgroundColor: medoraColors.soft,
              borderColor: medoraColors.main,
            },
          },
        },
      ],
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
        rounded: {
          borderRadius: 16,
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 20,
          borderColor: medoraColors.border,
          boxShadow: '0 1px 3px 0 rgba(15, 102, 95, 0.05), 0 1px 2px -1px rgba(15, 102, 95, 0.05)',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 600,
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 12,
            backgroundColor: '#F8FAFC',
            '&:hover': {
              backgroundColor: '#FFFFFF',
            },
            '&.Mui-focused': {
              backgroundColor: '#FFFFFF',
            },
          },
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: {
          borderRadius: 12,
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.03)',
        },
      },
    },
  },
});

export default theme;
