import { Fragment } from "react";
import styled from "styled-components";
import { FormControlLabel, FormLabel } from "material-ui/Form";
import Radio, { RadioGroup } from "material-ui/Radio";
import Checkbox from "material-ui/Checkbox";
import MuiDivider from "material-ui/Divider";
import Tooltip from "material-ui/Tooltip";
import Button from "material-ui/Button";
import MuiTextField from "material-ui/TextField";
import TokenPicker from "./TokenPicker";

const Divider = styled(MuiDivider)`
  margin-top: 24px !important;
  margin-bottom: 24px !important;
`;

const TextField = styled(MuiTextField)`
  width: 240px !important;
  margin-right: 24px !important;
`;

const TokenInputs = styled.div`
  display: flex;
  flex-wrap: wrap;
`;

const TokenGroup = styled.div``;

export default class GenerateOrder extends React.Component {
  state = {
    role: `lender`,
    lendTokenAddress: null,
    interestTokenAddress: null,
    sendToRelayExchange: false
  };

  setStateFor = key => value => this.setState({ [key]: value });

  handleRoleChange = (e, value) => this.setState({ role: value });

  changeSendToRelayExchangeCheckbox = (e, value) =>
    this.setState({ sendToRelayExchange: value });

  render() {
    const { role, sendToRelayExchange } = this.state;
    return (
      <div>
        <FormLabel component="legend">I am a:</FormLabel>
        <RadioGroup
          row
          aria-label="lenderOrTrader"
          name="lenderOrTrader"
          value={this.state.role}
          onChange={this.handleRoleChange}
        >
          <FormControlLabel value="lender" control={<Radio />} label="Lender" />
          <FormControlLabel value="trader" control={<Radio />} label="Trader" />
        </RadioGroup>

        <Divider />

        <TokenInputs>
          <TokenGroup>
            {/* TODO - lendTokenAddress */}
            <FormLabel component="legend">Lending</FormLabel>
            <TokenPicker
              onChange={this.setStateFor(`lendTokenAddress`)}
              value={this.state.lendTokenAddress}
            />
            {/* TODO - lendTokenAmount */}
            <TextField
              type="number"
              id="lendTokenAmount"
              label="Lend token amount"
              defaultValue="42"
              margin="normal"
              required
            />
          </TokenGroup>

          <TokenGroup>
            {/* TODO - interestTokenAddress */}
            <FormLabel component="legend">Interest</FormLabel>
            <TokenPicker
              onChange={this.setStateFor(`interestTokenAddress`)}
              value={this.state.interestTokenAddress}
            />
            {/* TODO - interestAmount */}
            <TextField
              type="number"
              id="interestAmount"
              label="Interest amount"
              defaultValue="42"
              margin="normal"
              helperText="Total paid per day to lender"
              required
            />
          </TokenGroup>

          {/* TODO - marginTokenAddress (hidden if role === lender) */}
          {role === `lender` && (
            <TokenGroup>
              <FormLabel component="legend">Margin Token</FormLabel>
              <TokenPicker
                onChange={this.setStateFor(`marginTokenAddress`)}
                value={this.state.marginTokenAddress}
              />
            </TokenGroup>
          )}
        </TokenInputs>

        <Divider />

        <FormLabel component="legend">Margin Amounts</FormLabel>

        {/* TODO - initialMarginAmount */}
        <TextField
          type="number"
          id="initialMarginAmount"
          label="Initial margin amount"
          defaultValue="42"
          margin="normal"
          required
        />

        {/* TODO - liquidationMarginAmount */}
        <TextField
          type="number"
          id="liquidationMarginAmount"
          label="Liquidation margin amount"
          defaultValue="42"
          margin="normal"
          required
        />

        {/* TODO - datapicker -> expirationUnixTimestampSec */}

        <Divider />

        <div>
          <FormControlLabel
            control={
              <Checkbox
                checked={sendToRelayExchange}
                onChange={this.changeSendToRelayExchangeCheckbox}
              />
            }
            label="Send to relay/exchange"
          />
        </div>

        {sendToRelayExchange && (
          <Fragment>
            <TextField
              id="feeRecipientAddress"
              label="Relay/Exchange Address"
              defaultValue="foo"
              margin="normal"
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

        <Divider />

        <div>
          <Button raised color="primary">
            Sign Order
          </Button>
        </div>
      </div>
    );
  }
}

// - the order params that need to be collected via form are as follows. (all visible params are required to submit the form)
//   - Lend Token (lendTokenAddress) (this can be a token address populated graphically similar to how the 0x portal allows to the user to pick the token they want
//   - Interest Token (interestTokenAddress) (graphically populated like above)
//   - Margin Token (marginTokenAddress) (graphically populated - *this is hidden if the "maker" is the lender)
//   - Relay/Exchange address (feeRecipientAddress) (this is hidden by default. there needs to be a checkbox like "Send To Relay/Exchange", which unhides it)
//   - Lend Token Amount (lendTokenAmount) - this is the amount of the lendTokenAddress that's being lending
//   - Interest Amount (interestAmount) - this is the TOTAL amount of interest token that will be paid per day to the lender if the lend order is open for the max possible time
//       - a tooltip should indicate that the amount is prorated if the lend order is closed early by the trader, or the trader's loan is liquidated
//   - Initial Margin Amount (initialMarginAmount) - the initial amount of margin the trader has to have to take out a trade with the loan
//       - possible range 10%-100%
//   - Liquidation Margin Amount (liquidationMarginAmount) - the margin level that will trigger a liquidation if the traders margin balance falls to this level or lower
//       - possible range 5%-95% (note: this MUST be less than initialMarginAmount)
//   - Lender Relay Fee (lenderRelayFee) - if "Send To Relay/Exchange", this is unhidden
//   - Trader Relay Fee (traderRelayFee) - if "Send To Relay/Exchange", this is unhidden
//   - Expiration Date and Time (should be a date picker and a time picker) - see the example on the 0x portal
//       - this is translated to an epoch time (expirationUnixTimestampSec)
//   - a "salt" is also generated and included in the order to ensure hash uniqueness (look at generatePseudoRandomSalt() function in b0x_tester.js)

// - the "submit" of this form is "Sign Order". this signs the order with the maker's private key and generartes a json object with the
//   above params + the maker's ECDSA signigure params (generated by the sign function)
// - to generate the "hash" use the getLendOrderHashHex function is b0x.js.
// the json object created with this and the above params should look similar to the below:
