import styled from "styled-components";
import Input, { InputLabel, InputAdornment } from "material-ui/Input";
import {
  FormControl as MuiFormControl,
  FormHelperText
} from "material-ui/Form";
import Tooltip from "material-ui/Tooltip";

import Section, { SectionLabel } from "../../common/FormSection";

const FormControl = styled(MuiFormControl)`
  margin: 24px !important;
`;

const ToolTipHint = styled.span`
  text-decoration: underline;
  cursor: pointer;
`;

export default ({
  setStateForInput,
  initialMarginAmount,
  maintenanceMarginAmount
}) => (
  <Section>
    <SectionLabel>Margin Amounts</SectionLabel>
    <div style={{ textAlign: `center` }}>
      <FormControl>
        <InputLabel>Initial Margin Amount</InputLabel>
        <Input
          value={initialMarginAmount}
          type="number"
          onChange={setStateForInput(`initialMarginAmount`)}
          endAdornment={<InputAdornment position="end">%</InputAdornment>}
        />
        <FormHelperText component="div">
          <Tooltip
            id="tooltip-icon"
            title="The minimum margin level the trader must have in order to fill a loan order or place a trade."
          >
            <ToolTipHint>Range: 10%-100%</ToolTipHint>
          </Tooltip>
        </FormHelperText>
      </FormControl>
      <FormControl>
        <InputLabel>Maintenance Margin Amount</InputLabel>
        <Input
          value={maintenanceMarginAmount}
          type="number"
          onChange={setStateForInput(`maintenanceMarginAmount`)}
          endAdornment={<InputAdornment position="end">%</InputAdornment>}
        />
        <FormHelperText component="div">
          <Tooltip
            id="tooltip-icon"
            title="The margin level that will trigger a loan liquidation if the trader's margin balance falls to this level or lower. This cannot be greater than the initial margin amount."
          >
            <ToolTipHint>Range: 5%-95%</ToolTipHint>
          </Tooltip>
        </FormHelperText>
      </FormControl>
    </div>
  </Section>
);
