import { Fragment } from "react";
import styled from "styled-components";
import { FormControlLabel } from "material-ui/Form";
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
          defaultValue="foo"
          margin="normal"
          fullWidth
          required
        />
        <TextField
          type="number"
          value={lenderRelayFee}
          onChange={setStateForInput(`lenderRelayFee`)}
          label="Lender Relay Fee"
          margin="normal"
          required
        />
        <TextField
          type="number"
          value={traderRelayFee}
          onChange={setStateForInput(`traderRelayFee`)}
          label="Trader Relay Fee"
          margin="normal"
          required
        />
      </Fragment>
    )}
  </Section>
);
