import { injectGlobal } from "styled-components";

const injectGlobalStyles = () => {
  // eslint-disable-next-line no-unused-expressions
  injectGlobal`
    body {
      font-family: -apple-system, system-ui, BlinkMacSystemFont, "Segoe UI", Roboto,
    "Helvetica Neue", Arial, sans-serif;
      background-color: #FAFAFA;
    }
  `;
};

export default injectGlobalStyles;
