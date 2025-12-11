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
      light: '#8C85C1',
      dark: '#28205C',
    },
    secondary: {
      main: '#CF2C1B',
      light: '#F7C8C4',
      dark: '#8F1E13',
    },
    success: {
      main: '#3FB37A',
      light: '#CFF4E2',
      dark: '#2E8A5D',
      contrastText: '#ffffff',
    },
    info: {
      main: '#4CB4D6',
      light: '#D8EFF7',
      dark: '#2589A7',
      contrastText: '#ffffff',
    },
    error: {
      main: '#D9534F',
      light: '#F9D6D5',
      dark: '#C12E2A',
      contrastText: '#ffffff',
    },
    warning: {
      main: '#F0C05A',
      light: '#FFF4D2',
      dark: '#D4A03E',
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
      fontSize: '2.6rem',
      lineHeight: '3rem',
      fontFamily: plus.style.fontFamily,
    },
    h2: {
      fontWeight: 600,
      fontSize: '2rem',
      lineHeight: '2.5rem',
      marginBottom: '0.8rem',
      fontFamily: plus.style.fontFamily,
    },
    h3: {
      fontWeight: 600,
      fontSize: '1.7rem',
      lineHeight: '2.1rem',
      fontFamily: plus.style.fontFamily,
    },
    h4: {
      fontWeight: 600,
      fontSize: '1.45rem',
      lineHeight: '1.8rem',
    },
    h5: {
      fontWeight: 600,
      fontSize: '1.25rem',
      lineHeight: '1.5rem',
    },
    h6: {
      fontWeight: 400,
      fontSize: '1.15rem',
      lineHeight: '1.8rem',
    },
    button: {
      textTransform: 'capitalize',
      fontWeight: 400,
    },
    body1: {
      fontSize: '1rem',
      fontWeight: 400,
      letterSpacing: '0.02rem',
      lineHeight: '1.25rem',
    },
    body2: {
      fontSize: '0.875rem',
      letterSpacing: '0.005rem',
      fontWeight: 400,
      lineHeight: '1rem',
    },
    subtitle1: {
      fontSize: '0.95rem',
      fontWeight: 400,
    },
    subtitle2: {
      fontSize: '0.8rem',
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
