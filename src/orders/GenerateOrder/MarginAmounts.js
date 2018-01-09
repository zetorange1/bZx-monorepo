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
  liquidationMarginAmount
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
        <FormHelperText>
          <Tooltip
            id="tooltip-icon"
            title="The margin level the trader is required to have in order to take out a trade with the loan."
          >
            <ToolTipHint>Range: 10%-100%</ToolTipHint>
          </Tooltip>
        </FormHelperText>
      </FormControl>
      <FormControl>
        <InputLabel>Liquidation Margin Amount</InputLabel>
        <Input
          value={liquidationMarginAmount}
          type="number"
          onChange={setStateForInput(`liquidationMarginAmount`)}
          endAdornment={<InputAdornment position="end">%</InputAdornment>}
        />
        <FormHelperText>
          <Tooltip
            id="tooltip-icon"
            title="The margin level that will trigger a liquidation if the trader's margin balance falls to this level or lower. This cannot be greater than the initial margin amount."
          >
            <ToolTipHint>Range: 5%-95%</ToolTipHint>
          </Tooltip>
        </FormHelperText>
      </FormControl>
    </div>
  </Section>
);
