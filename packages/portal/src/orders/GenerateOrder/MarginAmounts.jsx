import styled from "styled-components";
import Input from "@material-ui/core/Input";
import InputLabel from "@material-ui/core/InputLabel";
import InputAdornment from "@material-ui/core/InputAdornment";
import MuiFormControl from "@material-ui/core/FormControl";
import FormControlLabel from "@material-ui/core/FormControlLabel";
import FormHelperText from "@material-ui/core/FormHelperText";
import Tooltip from "@material-ui/core/Tooltip";
import Checkbox from "@material-ui/core/Checkbox";

import { fromBigNumber } from "../../common/utils";
import Section, { SectionLabel } from "../../common/FormSection";
fromBigNumber
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
  maintenanceMarginAmount,
  role,
  setwithdrawOnOpenCheckbox,
  withdrawOnOpen
}) => (
  <Section>
    <SectionLabel>Margin Amounts</SectionLabel>
    <div style={{ textAlign: `center` }}>
      <FormControl>
        <InputLabel>Initial Margin Amount</InputLabel>
        <Input
          value={fromBigNumber(initialMarginAmount, 10 ** 18)}
          type="number"
          onChange={setStateForInput(`initialMarginAmount`)}
          endAdornment={<InputAdornment position="end">%</InputAdornment>}
        />
        <FormHelperText component="div">
          <Tooltip
            id="tooltip-icon"
            title={
              <div style={{ maxWidth: `300px` }}>
                The minimum margin level the trader must have in order to fill a
                loan order or place a trade.
              </div>
            }
          >
            <ToolTipHint>Range: 40%-100%</ToolTipHint>
          </Tooltip>
        </FormHelperText>
      </FormControl>
      <FormControl>
        <InputLabel>Maintenance Margin Amount</InputLabel>
        <Input
          value={fromBigNumber(maintenanceMarginAmount, 10 ** 18)}
          type="number"
          onChange={setStateForInput(`maintenanceMarginAmount`)}
          endAdornment={<InputAdornment position="end">%</InputAdornment>}
        />
        <FormHelperText component="div">
          <Tooltip
            id="tooltip-icon"
            title={
              <div style={{ maxWidth: `300px` }}>
                The margin level that will trigger a loan liquidation if the
                trader&apos;s margin balance falls to this level or lower. This
                cannot be greater than the initial margin amount.
              </div>
            }
          >
            <ToolTipHint>Range: 20%-90%</ToolTipHint>
          </Tooltip>
        </FormHelperText>
      </FormControl>
      {role === `trader` ? (
        <FormControl>
          <FormControlLabel
            control={
              <Checkbox checked={withdrawOnOpen} onChange={setwithdrawOnOpenCheckbox} />
            }
            label="Withdraw on Loan Open"
          />
          <FormHelperText component="div">
            <Tooltip
              id="tooltip-icon"
              title={
                <div style={{ maxWidth: `300px` }}>
                  The margin level that will trigger a loan liquidation if the
                  trader&apos;s margin balance falls to this level or lower. This
                  cannot be greater than the initial margin amount.
                </div>
              }
            >
              <ToolTipHint>More Info</ToolTipHint>
            </Tooltip>
          </FormHelperText>
        </FormControl>
      ) : ``}
    </div>
  </Section>
);
