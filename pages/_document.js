import Document, { Head, Main, NextScript } from "next/document";
import { ServerStyleSheet } from "styled-components";
import JssProvider from "react-jss/lib/JssProvider";
import getPageContext from "../lib/material-ui/getPageContext";
import injectGlobalStyles from "../src/styles/global-styles";

injectGlobalStyles();

const withJssProvider = (App, pageContext, props) => (
  <JssProvider
    registry={pageContext.sheetsRegistry}
    generateClassName={pageContext.generateClassName}
  >
    <App pageContext={pageContext} {...props} />
  </JssProvider>
);

export default class MyDocument extends Document {
  static getInitialProps({ renderPage }) {
    const sheet = new ServerStyleSheet(); // for styled-components
    const pageContext = getPageContext(); // for material-ui
    const page = renderPage(App => props => {
      // wrap with JSS provider and pageContext for material-ui
      const WrappedApp = withJssProvider(App, pageContext, props);

      // collect styles for styled-components
      sheet.collectStyles(WrappedApp);

      // return the rendered page
      return WrappedApp;
    });
    // for styled-components: styleTags
    // for material-ui: pageContext and styles
    return {
      ...page,
      styleTags: sheet.getStyleElement(),
      pageContext,
      styles: (
        <style
          id="jss-server-side"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{
            __html: pageContext.sheetsRegistry.toString()
          }}
        />
      )
    };
  }

  render() {
    return (
      <html lang="en">
        <Head>
          <title>b0x Portal</title>
          <link
            rel="stylesheet"
            href="https://cdnjs.cloudflare.com/ajax/libs/normalize/7.0.0/normalize.min.css"
          />
          <link
            href="https://fonts.googleapis.com/css?family=Raleway:400,700"
            rel="stylesheet"
          />
          <link
            href="https://fonts.googleapis.com/icon?family=Material+Icons"
            rel="stylesheet"
          />
          <meta charSet="utf-8" />
          {/* Use minimum-scale=1 to enable GPU rasterization */}
          <meta
            name="viewport"
            content="user-scalable=0, initial-scale=1, minimum-scale=1, width=device-width, height=device-height"
          />
          {this.props.styleTags}
        </Head>
        <body>
          <Main />
          <NextScript />
        </body>
      </html>
    );
  }
}
