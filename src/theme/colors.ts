/**
 * Theme colors extracted from logo
 * Ocean Green, Emerald, Chambray, Paradiso palette
 */
export const colors = {
  // Logo brand colors
  logo: {
    oceanGreen: '#3aab83',      // rgb(58,171,131) - Primary brand color
    emerald: '#47be7f',         // rgb(71,190,127) - Bright accent
    chambray: '#375d98',        // rgb(55,93,152) - Blue accent
    paradiso: '#38838d',        // rgb(56,131,141) - Teal
    swansDown: '#dcf0e8',       // rgb(220,240,232) - Light background
    calypso: '#397093',         // rgb(57,112,147) - Blue-green
    oceanGreenAlt: '#3a9a88',  // rgb(58,154,136) - Teal-green variant
    rockBlue: '#a1b5ce',        // rgb(161,181,206) - Light blue-gray
    vistaBlue: '#94d8b3',       // rgb(148,216,179) - Light green-blue
  },

  // Glass effects using logo colors
  glass: {
    light: 'rgba(220, 240, 232, 0.7)',   // Swans Down
    medium: 'rgba(220, 240, 232, 0.85)',
    dark: 'rgba(220, 240, 232, 0.5)',
    border: 'rgba(58, 171, 131, 0.2)',   // Ocean Green
  },
  
  // Primary colors based on logo palette
  primary: {
    50: '#dcf0e8',   // Swans Down - very light
    100: '#dcf0e8',
    200: '#94d8b3',  // Vista Blue - light
    300: '#94d8b3',
    400: '#47be7f',  // Emerald - medium bright
    500: '#3aab83',  // Ocean Green - main brand
    600: '#3a9a88',  // Ocean Green Alt - medium
    700: '#38838d',  // Paradiso - medium dark
    800: '#397093',  // Calypso - dark
    900: '#375d98',  // Chambray - darkest
  },
  
  // Background gradients using logo colors
  background: {
    gradientStart: '#3aab83',   // Ocean Green
    gradientEnd: '#47be7f',     // Emerald
    gradientMid: '#38838d',     // Paradiso
    dark: '#375d98',            // Chambray - dark blue
    light: '#dcf0e8',           // Swans Down - very light
    white: '#ffffff',
  },
  
  // Text colors for readability
  text: {
    primary: '#375d98',         // Chambray - dark blue for text
    secondary: '#397093',       // Calypso - medium blue-green
    muted: '#38838d',          // Paradiso - teal
    accent: '#3aab83',         // Ocean Green - brand color
    dark: '#2a4a7a',           // Darker shade of Chambray for contrast
    white: '#ffffff',
  },
  
  // Status colors (medical theme with logo colors)
  status: {
    success: '#3aab83',         // Ocean Green
    successBright: '#47be7f',  // Emerald
    warning: '#f59e0b',        // Amber for caution
    error: '#ef4444',           // Red for critical
    info: '#38838d',           // Paradiso - teal
  },
  
  // Patient status colors
  patient: {
    stable: '#3aab83',         // Ocean Green
    stableBright: '#47be7f',  // Emerald
    critical: '#ef4444',       // Red
    warning: '#f59e0b',       // Amber
    monitoring: '#38838d',    // Paradiso
  },
};

