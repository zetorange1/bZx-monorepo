// eslint-disable-next-line import/no-extraneous-dependencies
import { SheetsRegistry } from "jss";
import { createMuiTheme, createGenerateClassName } from "material-ui/styles";
import amber from "material-ui/colors/amber";
import { primaryPalette, accentColor } from "../../src/common/STYLE";

// A theme with custom primary and secondary color.
const theme = createMuiTheme({
  palette: {
    primary: primaryPalette,
    secondary: {
      ...amber,
      A200: accentColor
    }
  }
});

const createPageContext = () => ({
  theme,
  // This is needed in order to deduplicate the injection of CSS in the page.
  sheetsManager: new Map(),
  // This is needed in order to inject the critical CSS.
  sheetsRegistry: new SheetsRegistry(),
  // The standard class name generator.
  generateClassName: createGenerateClassName()
});

export default function getPageContext() {
  // Make sure to create a new context for every server-side request so that data
  // isn't shared between connections (which would be bad).
  if (!process.browser) {
    return createPageContext();
  }

  // Reuse context on the client-side.
  /* eslint-disable no-underscore-dangle */
  if (!global.__INIT_MATERIAL_UI__) {
    global.__INIT_MATERIAL_UI__ = createPageContext();
  }

  return global.__INIT_MATERIAL_UI__;
}

// For reference: blue palette
// 50: '#e3f2fd',
// 100: '#bbdefb',
// 200: '#90caf9',
// 300: '#64b5f6',
// 400: '#42a5f5',
// 500: '#2196f3',
// 600: '#1e88e5',
// 700: '#1976d2',
// 800: '#1565c0',
// 900: '#0d47a1',
// A100: '#82b1ff',
// A200: '#448aff',
// A400: '#2979ff',
// A700: '#2962ff',
// contrastDefaultColor: 'light'
