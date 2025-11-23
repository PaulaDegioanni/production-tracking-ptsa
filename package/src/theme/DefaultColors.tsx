import { createTheme } from '@mui/material/styles';
import { Plus_Jakarta_Sans } from 'next/font/google';

export const plus = Plus_Jakarta_Sans({
  weight: ['300', '400', '500', '600', '700'],
  subsets: ['latin'],
  display: 'swap',
  fallback: ['Helvetica', 'Arial', 'sans-serif'],
});

const baselightTheme = createTheme({
  direction: 'ltr',
  palette: {
    primary: {
      main: '#3A3184',
      light: '#6962A2',
      dark: '#221D50',
    },
    secondary: {
      main: '#CF2C1B',
      light: '#FFCBC6',
      dark: '#53110B',
    },
    success: {
      main: '#a0eeba',
      light: '#80A383',
      dark: '#18301A',
      contrastText: '#ffffff',
    },
    info: {
      main: '#a0ebf5',
      light: '#EBF3FE',
      dark: '#1682d4',
      contrastText: '#ffffff',
    },
    error: {
      main: '#FA896B',
      light: '#bf73ee',
      dark: '#f3704d',
      contrastText: '#ffffff',
    },
    warning: {
      main: '#ffdd8f',
      light: '#FEF5E5',
      dark: '#FFAE1F',
      contrastText: '#ffffff',
    },
    grey: {
      100: '#F2F6FA',
      200: '#EAEFF4',
      300: '#DFE5EF',
      400: '#7C8FAC',
      500: '#5A6A85',
      600: '#2A3547',
    },
    text: {
      primary: '#2A3547',
      secondary: '#5A6A85',
    },
    action: {
      disabledBackground: 'rgba(73,82,88,0.12)',
      hoverOpacity: 0.02,
      hover: '#f6f9fc',
    },
    divider: '#e5eaef',
  },
  typography: {
    fontFamily: plus.style.fontFamily,
    h1: {
      fontWeight: 600,
      fontSize: '3rem',
      lineHeight: '3.25rem',
      fontFamily: plus.style.fontFamily,
    },
    h2: {
      fontWeight: 600,
      fontSize: '2.2rem',
      lineHeight: '3rem',
      marginBottom: '0.8rem',
      fontFamily: plus.style.fontFamily,
    },
    h3: {
      fontWeight: 600,
      fontSize: '2rem',
      lineHeight: '2.25rem',
      fontFamily: plus.style.fontFamily,
    },
    h4: {
      fontWeight: 600,
      fontSize: '1.8rem',
      lineHeight: '1.2rem',
    },
    h5: {
      fontWeight: 600,
      fontSize: '1.5rem',
      lineHeight: '1.6rem',
    },
    h6: {
      fontWeight: 600,
      fontSize: '1.3rem',
      lineHeight: '1.5rem',
    },
    button: {
      textTransform: 'capitalize',
      fontWeight: 400,
    },
    body1: {
      fontSize: '1.1rem',
      fontWeight: 400,
      letterSpacing: '0.02rem',
      lineHeight: '1.45rem',
    },
    body2: {
      fontSize: '0.9rem',
      letterSpacing: '0.005rem',
      fontWeight: 400,
      lineHeight: '1.2rem',
    },
    subtitle1: {
      fontSize: '1rem',
      fontWeight: 400,
    },
    subtitle2: {
      fontSize: '0.875rem',
      fontWeight: 400,
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        '.MuiPaper-elevation9, .MuiPopover-root .MuiPaper-elevation': {
          boxShadow:
            'rgb(145 158 171 / 30%) 0px 0px 2px 0px, rgb(145 158 171 / 12%) 0px 12px 24px -4px !important',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: '7px',
        },
      },
    },
  },
});

export { baselightTheme };
