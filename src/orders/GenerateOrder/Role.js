import { FormControlLabel, FormLabel } from "material-ui/Form";
import Radio, { RadioGroup } from "material-ui/Radio";
import { Section, SectionLabel } from "./components";

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
      <FormControlLabel value="lender" control={<Radio />} label="Lender" />
      <FormControlLabel value="trader" control={<Radio />} label="Trader" />
    </RadioGroup>
  </Section>
);
