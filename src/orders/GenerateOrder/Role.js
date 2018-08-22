import FormLabel from "@material-ui/core/FormLabel";
import FormControlLabel from "@material-ui/core/FormControlLabel";
import { Radio, RadioGroup } from "@material-ui/core";
import Section, { SectionLabel } from "../../common/FormSection";

export default ({ role, setRole }) => (
  <Section>
    <SectionLabel>Role</SectionLabel>
    <FormLabel>For this order, I am a:</FormLabel>
    <RadioGroup
      row
      aria-label="lenderOrTrader"
      name="lenderOrTrader"
      value={role}
      onChange={setRole}
    >
      <FormControlLabel
        value="lender"
        control={<Radio color="primary" />}
        label="Lender"
      />
      <FormControlLabel
        value="trader"
        control={<Radio color="primary" />}
        label="Trader"
      />
    </RadioGroup>
  </Section>
);
