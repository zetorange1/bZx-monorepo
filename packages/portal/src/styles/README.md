# Styling

## Styling Material-UI components with Styled-Components

Due to the [fact](https://material-ui-next.com/guides/interoperability/#styled-components) that both styled-components and material-ui inject their styles at the bottom of the `<head>` tag, we need to add `!important` for the styled-components rules to override the material-ui rules.

```jsx
import styled from "styled-components";
import MuiTextField from "material-ui/TextField";

const TextField = styled(MuiTextField)`
  display: block !important;
`;
```