import styled from "styled-components";
import Button from "material-ui/Button";

import Tokens from "./Tokens";
import Amounts from "./Amounts";
import Expiration from "./Expiration";
import Inputs from "./Inputs";

import { validateFillOrder, submitFillOrder } from "./utils";

const Submission = styled.div`
  text-align: center;
  margin-bottom: 24px;
`;

const SubmitBtn = styled(Button)`
  width: 100%;
  max-width: 480px;
`;

export default class OrderInfo extends React.Component {
  state = {
    fillOrderAmount: 0,
    marginTokenAddress: `WETH_SM_ADDRESS_HERE`
  };

  setStateFor = key => value => this.setState({ [key]: value });

  handleSubmit = () => {
    const { order } = this.props;
    const { fillOrderAmount, marginTokenAddress } = this.state;
    const isFillOrderValid = validateFillOrder(
      order,
      fillOrderAmount,
      marginTokenAddress
    );
    if (isFillOrderValid) {
      submitFillOrder(order, fillOrderAmount, marginTokenAddress);
    } else {
      alert(`There is something wrong with your order`);
    }
  };

  render() {
    const { order } = this.props;
    return (
      <div>
        <Tokens
          role={order.role}
          lendTokenAddress={order.lendToken.address}
          lendTokenAmount={order.lendTokenAmount}
          interestTokenAddress={order.interestToken.address}
          interestAmount={order.interestAmount}
          marginTokenAddress={order.marginToken.address}
        />
        <Amounts
          initialMarginAmount={order.initialMarginAmount}
          liquidationMarginAmount={order.liquidationMarginAmount}
          lenderRelayFee={order.lenderRelayFee}
          traderRelayFee={order.traderRelayFee}
        />
        <Expiration
          expirationUnixTimestampSec={order.expirationUnixTimestampSec}
        />
        {order.role === `lender` && (
          <Inputs
            fillOrderAmount={this.state.fillOrderAmount}
            marginTokenAddress={this.state.marginTokenAddress}
            setFillOrderAmount={this.setStateFor(`fillOrderAmount`)}
            setMarginTokenAddress={this.setStateFor(`marginTokenAddress`)}
          />
        )}
        <Submission>
          <SubmitBtn raised color="primary" onClick={this.handleSubmit}>
            Fill Order
          </SubmitBtn>
        </Submission>
      </div>
    );
  }
}

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
