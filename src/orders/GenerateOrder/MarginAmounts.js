import styled from "styled-components";
import MuiTextField from "material-ui/TextField";
import Section, { SectionLabel } from "../../common/FormSection";

const TextField = styled(MuiTextField)`
  margin: 24px !important;
`;

export default ({
  setStateForInput,
  initialMarginAmount,
  liquidationMarginAmount
}) => (
  <Section>
    <SectionLabel>Margin Amounts</SectionLabel>
    <div style={{ textAlign: `center` }}>
      <TextField
        type="number"
        label="Initial margin amount"
        value={initialMarginAmount}
        onChange={setStateForInput(`initialMarginAmount`)}
        margin="normal"
        required
      />
      <TextField
        type="number"
        label="Liquidation margin amount"
        value={liquidationMarginAmount}
        onChange={setStateForInput(`liquidationMarginAmount`)}
        margin="normal"
        required
      />
    </div>
  </Section>
);
