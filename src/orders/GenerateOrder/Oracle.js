import styled from "styled-components";
import { FormControlLabel } from "material-ui/Form";
import Checkbox from "material-ui/Checkbox";
import TextField from "material-ui/TextField";
import Section, { SectionLabel } from "../../common/FormSection";

const AddressTextField = styled(TextField)`
  max-width: 480px !important;
`;

export default ({
  oracleAddress,
  setOracleAddress,
  useB0xCheckbox,
  setUseB0xCheckbox
}) => (
  <Section>
    <SectionLabel>Oracle</SectionLabel>

    <div>
      <FormControlLabel
        control={
          <Checkbox checked={useB0xCheckbox} onChange={setUseB0xCheckbox} />
        }
        label="Use B0X Oracle"
      />
    </div>
    <AddressTextField
      value={oracleAddress}
      onChange={setOracleAddress}
      label="Oracle Address"
      margin="normal"
      fullWidth
      disabled={useB0xCheckbox}
    />
  </Section>
);
