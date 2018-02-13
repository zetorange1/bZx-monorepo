import Layout from "../src/common/Layout";
import { Card, Header, HeaderTitle, Content } from "../src/common/MainContent";
import { Divider } from "../src/common/FormSection";
import PageContent from "../src/borrowing";

export default class Trading extends React.Component {
  state = { activeTab: undefined };

  changeTab = tabId => this.setState({ activeTab: tabId });

  render() {
    const { activeTab } = this.state; // eslint-disable-line no-unused-vars
    return (
      <Layout>
        <Card>
          <Header>
            <HeaderTitle>Borrowing</HeaderTitle>
          </Header>
          <Content>
            This section will allow a trader (borrower) to manage active loans
            and view closed loans.
            <Divider />
            <PageContent />
          </Content>
        </Card>
      </Layout>
    );
  }
}

// This section will allow a trader (borrower) to manage active loans and view closed loans

// For active loans, the trader should see what loans they have open, and some details about them, such as:
//   - the lendOrderHash (from PART 1) tied to this loan
//   - the lender address (lender)
//   - the amount of margin token they put up as collateral (marginTokenAmountFilled)
//   - the amount of lend token they are borrowing for the loan (lendTokenAmountFilled)
//   - the amount of interest they've paid the lender so far for the loan (interestPaidSoFar)
//   - the date/time the loan started (filledUnixTimestampSec)

//   - if a 0x trade is not open from funds from the loan, provide something like this: https://0xproject.com/portal/fill
//     - a trader finds 0x trades from any source, and drops the 0x Order JSON here (note this is a 0x JSON from 0xProject and not to be confused with "LEND ORDER JSON" for b0x)
//     - the b0x portal reads the 0x JSON and submits the params to the b0x contract "open0xTrade" sol function:
//       function open0xTrade(
//         bytes32 lendOrderHash,
//         address[5] orderAddresses0x,
//         uint[6] orderValues0x,
//         uint8 v,
//         bytes32 r,
//         bytes32 s)
//         public
//         returns (uint);

//   - if an 0x trade has been opened using funds from the loan, show a few details about the loan:
//     - token that was traded and bought using the lend token (tradeTokenAddress)
//     - trade token amount (tradeTokenAmountFilled)
//     - should have "Close Trade" button - this calls into b0x to trigger a market order with Kyber to close this trade and buy back the lend token
//       sol function:
//         function closeTrade(
//           bytes32 lendOrderHash)
//           public
//           returns (bool tradeSuccess);

//     - optionally, we can provide a form like this https://0xproject.com/portal/fill again, to let the trader close the order with an "opposite" 0x order. this
//       passes the 0x order json params to b0x similar to above.
//       sol function:
//         function closeWith0xTrade(
//           bytes32 lendOrderHash,
//           address[5] orderAddresses0x,
//           uint[6] orderValues0x,
//           uint8 v,
//           bytes32 r,
//           bytes32 s)
//           public
//           returns (uint);

//   - provide a way to traders to change the current "marginToken of an active loan (via b0x contract function call TBD).
//   - provide a way to traders to "deposit" additional margin token to increase their margin level on active loans (via b0x contract function call TBD).
//   - provide a way for traders to withdraw margin token if and only if it's above "initialMarginAmount" (via b0x contract function call TBD).

// For closes loans, the above details should be provided as well, along with the closed date/time.
//   - trades can't be opened using a closed loan
//   - note: We don't allow margin "deposits" for closed loans.
//           Also, there is no need to provide a withdraw function for closed loans, since all margin is automatically refunded when the loan closes
