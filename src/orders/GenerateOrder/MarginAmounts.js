import styled from "styled-components";
import MuiTextField from "material-ui/TextField";
import { Section, SectionLabel } from "./components";

const TextField = styled(MuiTextField)`
  margin: 24px !important;
`;

export default () => (
  <Section>
    <SectionLabel>Margin Amounts</SectionLabel>
    {/* TODO - initialMarginAmount */}
    <div style={{ textAlign: `center` }}>
      <TextField
        type="number"
        id="initialMarginAmount"
        label="Initial margin amount"
        defaultValue="42"
        margin="normal"
        required
      />

      {/* TODO - liquidationMarginAmount */}
      <TextField
        type="number"
        id="liquidationMarginAmount"
        label="Liquidation margin amount"
        defaultValue="42"
        margin="normal"
        required
      />
    </div>
  </Section>
);
