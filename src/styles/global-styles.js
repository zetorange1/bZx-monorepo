import { injectGlobal } from "styled-components";

const injectGlobalStyles = () => {
  // eslint-disable-next-line no-unused-expressions
  injectGlobal`
    body {
      font-family: sans-serif;
    }
  `;
};

export default injectGlobalStyles;
