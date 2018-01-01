/* globals document */
import React from "react";
import { MuiThemeProvider } from "material-ui/styles";
import Reboot from "material-ui/Reboot";
import getPageContext from "./getPageContext";

function withRoot(Component) {
  class WithRoot extends React.Component {
    componentDidMount() {
      this.pageContext = this.props.pageContext || getPageContext();
      // Remove the server-side injected CSS.
      const jssStyles = document.querySelector(`#jss-server-side`);
      if (jssStyles && jssStyles.parentNode) {
        jssStyles.parentNode.removeChild(jssStyles);
      }
    }

    pageContext = null;

    render() {
      const pageContext =
        this.pageContext || this.props.pageContext || getPageContext();
      // MuiThemeProvider makes the theme available down the React tree thanks to React context.
      return (
        <MuiThemeProvider
          theme={pageContext.theme}
          sheetsManager={pageContext.sheetsManager}
        >
          {/* Reboot kickstart an elegant, consistent, and simple baseline to build upon. */}
          <Reboot />
          <Component {...this.props} />
        </MuiThemeProvider>
      );
    }
  }

  WithRoot.getInitialProps = ctx => {
    if (Component.getInitialProps) {
      return Component.getInitialProps(ctx);
    }

    return {};
  };

  return WithRoot;
}

export default withRoot;
