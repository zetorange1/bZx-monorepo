import { Fragment } from "react";
import styled from "styled-components";
import Input from "@material-ui/core/Input";
import InputLabel from "@material-ui/core/InputLabel";
import InputAdornment from "@material-ui/core/InputAdornment";
import { FormControl, FormControlLabel } from "@material-ui/core";
import Checkbox from "@material-ui/core/Checkbox";
import TextField from "@material-ui/core/TextField";
import Section, { SectionLabel } from "../../common/FormSection";

const AddressTextField = styled(TextField)`
  max-width: 480px !important;
`;

export default ({
  sendToRelayExchange,
  pushOnChain,
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
          <Checkbox checked={sendToRelayExchange} onChange={setRelayCheckbox} disabled={pushOnChain} />
        }
        label="Set relay/exchange fees"
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
            endAdornment={<InputAdornment position="end">BZRX</InputAdornment>}
          />
        </FormControl>
        <FormControl margin="normal">
          <InputLabel>Trader Relay Fee</InputLabel>
          <Input
            value={traderRelayFee}
            type="number"
            onChange={setStateForInput(`traderRelayFee`)}
            endAdornment={<InputAdornment position="end">BZRX</InputAdornment>}
          />
        </FormControl>
      </Fragment>
    )}
  </Section>
);
