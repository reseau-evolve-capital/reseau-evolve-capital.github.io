export const colors = {
  primary: {
    yellow: '#FFF33B',
    orange: '#FDC70C',
    deepOrange: '#F3903F',
    red: '#E93E3A',
  },
  neutral: {
    white: '#FFFFFF',
    gray: '#B3B5B7',
    black: '#231F20',
  }
} as const

export const fonts = {
  heading: 'MADE Tommy Soft Bold',
  body: 'MADE Tommy Soft Light',
} as const

export const animations = {
  slideIn: {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5, ease: 'easeOut' }
  },
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    transition: { duration: 0.4 }
  }
} as const

export const theme = {
  colors: {
    primary: {
      50: '#e6f3ff',
      100: '#b3d7ff',
      200: '#80bcff',
      300: '#4da0ff',
      400: '#1a85ff', // Main Omniventus blue
      500: '#006be6',
      600: '#0054b3',
      700: '#003d80',
      800: '#00264d',
      900: '#000f1a',
    },
    secondary: {
      50: '#f0f7ff',
      100: '#d1e5ff',
      200: '#b2d4ff',
      300: '#93c2ff',
      400: '#74b1ff', // Secondary accent
      500: '#559fff',
      600: '#367dcc',
      700: '#275b99',
      800: '#183a66',
      900: '#091833',
    },
    background: {
      dark: '#0a0c1e',
      darker: '#060714',
      light: '#f8fafc',
      lighter: '#ffffff',
    },
    text: {
      primary: '#ffffff',
      secondary: '#94a3b8',
      dark: '#1e293b',
    },
    accent: {
      success: '#22c55e',
      warning: '#eab308',
      error: '#ef4444',
      info: '#3b82f6',
    }
  },
  fonts: {
    heading: 'Inter, sans-serif',
    body: 'Inter, sans-serif',
    mono: 'JetBrains Mono, monospace',
  },
  spacing: {
    container: {
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
    }
  },
  animation: {
    duration: {
      fast: '0.2s',
      normal: '0.3s',
      slow: '0.5s',
    },
    timing: {
      bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
      smooth: 'cubic-bezier(0.4, 0, 0.2, 1)',
    }
  }
} as const; 