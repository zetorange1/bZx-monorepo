import { Fragment } from "react";
import styled from "styled-components";
import { FormControlLabel } from "material-ui/Form";
import Checkbox from "material-ui/Checkbox";
import TextField from "material-ui/TextField";
import { Section, SectionLabel } from "./components";

const AddressTextField = styled(TextField)`
  max-width: 480px !important;
`;

export default ({ sendToRelayExchange, setRelayCheckbox }) => (
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
          id="feeRecipientAddress"
          label="Relay/Exchange Address"
          defaultValue="foo"
          margin="normal"
          fullWidth
          required
        />
        <TextField
          type="number"
          id="lenderRelayFee"
          label="Lender Relay Fee"
          defaultValue="42"
          margin="normal"
          required
        />
        <TextField
          type="number"
          id="traderRelayFee"
          label="Trader Relay Fee"
          defaultValue="42"
          margin="normal"
          required
        />
      </Fragment>
    )}
  </Section>
);
