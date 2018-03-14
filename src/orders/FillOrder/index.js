import styled from "styled-components";
import Typography from "material-ui/Typography";
import MuiButton from "material-ui/Button";
import { SectionLabel } from "../../common/FormSection";
import OrderInfo from "./OrderInfo";
import { getOrderHash } from "./utils";

const TextArea = styled.textarea`
  margin: 12px 0;
  width: 100%;
  max-width: 480px;
  font-family: monospace;
`;

const BackLink = styled(Typography)`
  display: inline-block !important;
  margin-bottom: 12px !important;
  text-decoration: underline;
  cursor: pointer;
`;

const Button = styled(MuiButton)`
  display: block !important;
`;

const TEMP_ORDER = {
  b0xAddress: `0x75ecc2f387b3a490ce042ea1d2d342920b69ec8f`,
  makerAddress: `0xd6d30f186e802c1558b8137bd730f7f4aec17ae7`,
  makerRole: `0`,
  networkId: 50,
  loanTokenAddress: `0xdb5cd515ae42e70a5c0fa3e9a23cae180f50ef57`,
  interestTokenAddress: `0xdb5cd515ae42e70a5c0fa3e9a23cae180f50ef57`,
  collateralTokenAddress: `0xdb5cd515ae42e70a5c0fa3e9a23cae180f50ef57`,
  feeRecipientAddress: `0x0000000000000000000000000000000000000000`,
  oracleAddress: `0xd5f6ee29a57fcaada6584caad0129c5ac16743d6`,
  loanTokenAmount: `40`,
  interestAmount: `41`,
  initialMarginAmount: `40`,
  maintenanceMarginAmount: `20`,
  lenderRelayFee: `0`,
  traderRelayFee: `0`,
  expirationUnixTimestampSec: `1520962067`,
  salt: `86656368936722261152867883467825642554858235591591812616890726680969303427517`,
  signature: `0x37f737648463c6e5fbd0cca775f0755a8eeb8223a17c8689b1f37503f8a5c8ec0abad2b7ea24908b5875ee29d754a35a71f272cad55a08b94fe993786d4217f61b`
};

export default class FillOrder extends React.Component {
  state = { value: TEMP_ORDER, showOrderInfo: false };

  reset = () => this.setState({ showOrderInfo: false });

  handleChange = e => this.setState({ value: e.target.value });

  handleSubmit = () => {
    const JSONOrder = JSON.parse(this.state.value);
    const hex = getOrderHash(JSONOrder);
    if (hex) {
      this.setState({ showOrderInfo: true });
    } else {
      alert(`Please check your JSON input.`);
    }
  };

  render() {
    const { showOrderInfo, value } = this.state;
    if (showOrderInfo) {
      return (
        <div>
          <BackLink onClick={this.reset}>Go Back</BackLink>
          <SectionLabel>Order info</SectionLabel>
          <OrderInfo order={JSON.parse(value)} tokens={this.props.tokens} />
        </div>
      );
    }
    return (
      <div>
        <SectionLabel>Fill an order</SectionLabel>
        <Typography>Paste your JSON order below:</Typography>
        <TextArea
          name=""
          id=""
          cols="30"
          rows="10"
          value={value}
          onChange={this.handleChange}
        />
        <Button variant="raised" color="primary" onClick={this.handleSubmit}>
          Get Order Info
        </Button>
      </div>
    );
  }
}

// - Provide something like this: https://0xproject.com/portal/fill
// - Accepts a json object (see above) generated in the previous menu. It passes the parameters to our smart contract for validation and acceptance
// - There should also be an API endpoint associated with this that accepts the json object in a POST for orders to be taken without using the UI

// -related functions in b0x smart contract:
//  - when the loan (order) is filled by the trader:
//   /// @dev Takes the order as trader
//   /// @param orderAddresses Array of order's maker, lendTokenAddress, interestTokenAddress marginTokenAddress, and feeRecipientAddress.
//   /// @param orderValues Array of order's lendTokenAmount, interestAmount, initialMarginAmount, liquidationMarginAmount, lenderRelayFee, traderRelayFee, expirationUnixTimestampSec, and salt
//   /// @param marginTokenAddressFilled Desired address of the marginToken the trader wants to use.
//   /// @param lendTokenAmountFilled Desired amount of lendToken the trader wants to borrow.
//   /// @param v ECDSA signature parameter v.
//   /// @param r ECDSA signature parameters r.
//   /// @param s ECDSA signature parameters s.
//   /// @return Total amount of lendToken borrowed (uint).
//   /// @dev Traders can take a portion of the total coin being lent (lendTokenAmountFilled).
//   /// @dev Traders also specifiy the token that will fill the margin requirement if they are taking the order.
//   function takeLendOrderAsTrader(
//      address[5] orderAddresses,
//      uint[8] orderValues,
//      address marginTokenAddressFilled,
//      uint lendTokenAmountFilled,
//      uint8 v,
//      bytes32 r,
//      bytes32 s)
//      public
//      returns (uint);

//  - when the loan (order) is filled by the lender:
//   /// @dev Takes the order as lender
//   /// @param orderAddresses Array of order's maker, lendTokenAddress, interestTokenAddress marginTokenAddress, and feeRecipientAddress.
//   /// @param orderValues Array of order's lendTokenAmount, interestAmount, initialMarginAmount, liquidationMarginAmount, lenderRelayFee, traderRelayFee, expirationUnixTimestampSec, and salt
//   /// @param v ECDSA signature parameter v.
//   /// @param r ECDSA signature parameters r.
//   /// @param s ECDSA signature parameters s.
//   /// @return Total amount of lendToken borrowed (uint).
//   /// @dev Lenders have to fill the entire desired amount the trader wants to borrow.
//   /// @dev This makes lendTokenAmountFilled = lendOrder.lendTokenAmount.
//   function takeLendOrderAsLender(
//      address[5] orderAddresses,
//      uint[8] orderValues,
//      uint8 v,
//      bytes32 r,
//      bytes32 s)
//      public
//      returns (uint);
