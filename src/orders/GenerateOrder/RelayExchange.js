import { Fragment } from "react";
import styled from "styled-components";
import Input, { InputLabel, InputAdornment } from "material-ui/Input";
import { FormControl, FormControlLabel } from "material-ui/Form";
import Checkbox from "material-ui/Checkbox";
import TextField from "material-ui/TextField";
import Section, { SectionLabel } from "../../common/FormSection";

const AddressTextField = styled(TextField)`
  max-width: 480px !important;
`;

export default ({
  sendToRelayExchange,
  setRelayCheckbox,
  setStateForInput,
  feeRecipientAddress,
  lenderRelayFee,
  traderRelayFee
}) => (
  <Section>
    <SectionLabel>Relay/Exchange Settings (optional)</SectionLabel>

    <div>
      <FormControlLabel
        control={
          <Checkbox checked={sendToRelayExchange} onChange={setRelayCheckbox} />
        }
        label="Send to relay/exchange"
      />
    </div>

    {sendToRelayExchange && (
      <Fragment>
        <AddressTextField
          value={feeRecipientAddress}
          onChange={setStateForInput(`feeRecipientAddress`)}
          label="Relay/Exchange Address"
          margin="normal"
          fullWidth
        />
        <FormControl margin="normal">
          <InputLabel>Lender Relay Fee</InputLabel>
          <Input
            value={lenderRelayFee}
            type="number"
            onChange={setStateForInput(`lenderRelayFee`)}
            endAdornment={<InputAdornment position="end">B0X</InputAdornment>}
          />
        </FormControl>
        <FormControl margin="normal">
          <InputLabel>Trader Relay Fee</InputLabel>
          <Input
            value={traderRelayFee}
            type="number"
            onChange={setStateForInput(`traderRelayFee`)}
            endAdornment={<InputAdornment position="end">B0X</InputAdornment>}
          />
        </FormControl>
      </Fragment>
    )}
  </Section>
);
