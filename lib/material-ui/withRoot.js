/* globals document */
import React from "react";
import { MuiThemeProvider } from "material-ui/styles";
import getPageContext from "./getPageContext";

export default function withRoot(Component) {
  return class WithRoot extends React.Component {
    componentWillMount() {
      this.pageContext = this.props.pageContext || getPageContext();
    }

    componentDidMount() {
      // Remove the server-side injected CSS.
      const jssStyles = document.querySelector(`#jss-server-side`);
      if (jssStyles && jssStyles.parentNode) {
        jssStyles.parentNode.removeChild(jssStyles);
      }
    }

    getInitialProps = ctx => {
      const { getInitialProps } = Component;
      return getInitialProps ? getInitialProps(ctx) : {};
    };

    pageContext = null;

    render() {
      const { pageContext } = this;
      // MuiThemeProvider makes the theme available down the React tree thanks to React context.
      return (
        <MuiThemeProvider
          theme={pageContext.theme}
          sheetsManager={pageContext.sheetsManager}
        >
          <Component {...this.props} />
        </MuiThemeProvider>
      );
    }
  };
}
