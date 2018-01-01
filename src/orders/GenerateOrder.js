import Button from "material-ui/Button";

export default class GenerateOrder extends React.Component {
  state = {};

  render() {
    return (
      <div>
        <div>Checkbox to indicate lender or trader</div>
        <form>
          <input type="text" />
          <Button color="primary">Flat Primary</Button>
          <Button raised color="accent">
            Raised Accent
          </Button>
        </form>
        <div>Sign Order submit button</div>
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
