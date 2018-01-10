import { createMuiTheme } from "material-ui/styles";
import amber from "material-ui/colors/amber";
import { primaryPalette, accentColor } from "./constants";

const theme = createMuiTheme({
  palette: {
    primary: primaryPalette,
    secondary: {
      ...amber,
      A200: accentColor
    }
  },
  typography: {
    fontFamily: `"Raleway", sans-serif`
    // `-apple-system,system-ui,BlinkMacSystemFont,` +
    // `"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif`
  },
  overrides: {
    MuiTooltip: {
      tooltip: {
        fontSize: `0.75rem !important`
      }
    }
  }
});

export default theme;
