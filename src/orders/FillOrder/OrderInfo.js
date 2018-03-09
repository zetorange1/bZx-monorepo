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
    collateralTokenAddress: this.props.tokens[0].address
  };

  setStateFor = key => value => this.setState({ [key]: value });

  handleSubmit = () => {
    const { order } = this.props;
    const { fillOrderAmount, collateralTokenAddress } = this.state;
    const isFillOrderValid = validateFillOrder(
      order,
      fillOrderAmount,
      collateralTokenAddress
    );
    if (isFillOrderValid) {
      submitFillOrder(order, fillOrderAmount, collateralTokenAddress);
    } else {
      alert(`There is something wrong with your order`);
    }
  };

  render() {
    const { order, tokens } = this.props;
    const role = order.makerRole === `0` ? `lender` : `trader`;
    return (
      <div>
        <Tokens
          tokens={tokens}
          role={role}
          loanTokenAddress={order.loanTokenAddress}
          loanTokenAmount={order.loanTokenAmount}
          interestTokenAddress={order.interestTokenAddress}
          interestAmount={order.interestAmount}
          collateralTokenAddress={order.collateralTokenAddress}
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
        {role === `lender` && (
          <Inputs
            tokens={tokens}
            fillOrderAmount={this.state.fillOrderAmount}
            collateralTokenAddress={this.state.collateralTokenAddress}
            loanTokenAddress={order.loanTokenAddress}
            setFillOrderAmount={this.setStateFor(`fillOrderAmount`)}
            setCollateralTokenAddress={this.setStateFor(
              `collateralTokenAddress`
            )}
          />
        )}
        <Submission>
          <SubmitBtn
            variant="raised"
            color="primary"
            onClick={this.handleSubmit}
          >
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
//   /// @param orderAddresses Array of order's maker, lendTokenAddress, interestTokenAddress collateralTokenAddress, and feeRecipientAddress.
//   /// @param orderValues Array of order's lendTokenAmount, interestAmount, initialMarginAmount, liquidationMarginAmount, lenderRelayFee, traderRelayFee, expirationUnixTimestampSec, and salt
//   /// @param collateralTokenAddressFilled Desired address of the marginToken the trader wants to use.
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
//      address collateralTokenAddressFilled,
//      uint lendTokenAmountFilled,
//      uint8 v,
//      bytes32 r,
//      bytes32 s)
//      public
//      returns (uint);

//  - when the loan (order) is filled by the lender:
//   /// @dev Takes the order as lender
//   /// @param orderAddresses Array of order's maker, lendTokenAddress, interestTokenAddress collateralTokenAddress, and feeRecipientAddress.
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
