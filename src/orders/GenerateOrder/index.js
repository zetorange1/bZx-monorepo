import { Fragment } from "react";
import moment from "moment";
// import { B0xJS } from "b0x.js"; // eslint-disable-line import/no-extraneous-dependencies

import { Divider } from "../../common/FormSection";
import RoleSection from "./Role";
import TokensSection from "./Tokens";
import MarginAmountsSection from "./MarginAmounts";
import ExpirationSection from "./Expiration";
import RelayExchangeSection from "./RelayExchange";
import Submission from "./Submission";
import Result from "./Result";

import validateInputs from "./validate";
// eslint-disable-next-line no-unused-vars
import { compileObject, addSalt, signOrder, getHash } from "./utils";

export default class GenerateOrder extends React.Component {
  state = {
    role: `lender`,

    // token addresses
    lendTokenAddress: `WETH_SM_ADDRESS_HERE`,
    interestTokenAddress: `ZRX_SM_ADDRESS_HERE`,
    marginTokenAddress: `MKR_SM_ADDRESS_HERE`,

    // token amounts
    lendTokenAmount: 40,
    interestAmount: 41,

    // margin amounts
    initialMarginAmount: 42,
    liquidationMarginAmount: 43,

    // expiration date/time
    expirationDate: moment(),

    // relay/exchange settings
    sendToRelayExchange: false,
    feeRecipientAddress: ``,
    lenderRelayFee: 0,
    traderRelayFee: 0,

    orderHash: `0x_temp_order_hash`,
    signedOrderObject: null
  };

  /* State setters */

  setStateFor = key => value => this.setState({ [key]: value });

  setStateForInput = key => event =>
    this.setState({ [key]: event.target.value });

  setRole = (e, value) => this.setState({ role: value });

  setRelayCheckbox = (e, value) =>
    this.setState({ sendToRelayExchange: value });

  /* Submission handler */

  handleSubmit = () => {
    const isValid = validateInputs(this.state);
    this.setState({ orderHash: null, signedOrderObject: null });
    if (isValid) {
      const orderObject = compileObject(this.state); // 1. compile the order object from state
      const saltedOrderObj = addSalt(orderObject); // 2. compute and add salt to the order object
      const signedOrderObject = signOrder(saltedOrderObj); // 3. sign order w/ maker's private key
      const orderHash = getHash(signedOrderObject); // 4. get a hash for the signed object
      this.setState({ orderHash, signedOrderObject });
    } else {
      // eslint-disable-next-line no-undef
      alert(verificationResult.errorMsg);
    }
  };

  render() {
    return (
      <div>
        <RoleSection role={this.state.role} setRole={this.setRole} />

        <Divider />

        <TokensSection
          role={this.state.role}
          // state setters
          setStateForAddress={this.setStateFor}
          setStateForInput={this.setStateForInput}
          // address states
          lendTokenAddress={this.state.lendTokenAddress}
          interestTokenAddress={this.state.interestTokenAddress}
          marginTokenAddress={this.state.marginTokenAddress}
          // token amounts
          lendTokenAmount={this.state.lendTokenAmount}
          interestAmount={this.state.interestAmount}
        />

        <Divider />

        <MarginAmountsSection
          setStateForInput={this.setStateForInput}
          initialMarginAmount={this.state.initialMarginAmount}
          liquidationMarginAmount={this.state.liquidationMarginAmount}
        />

        <Divider />

        <ExpirationSection
          setExpirationDate={this.setStateFor(`expirationDate`)}
          expirationDate={this.state.expirationDate}
        />

        <Divider />

        <RelayExchangeSection
          // state setters
          setStateForInput={this.setStateForInput}
          setRelayCheckbox={this.setRelayCheckbox}
          // form states
          sendToRelayExchange={this.state.sendToRelayExchange}
          feeRecipientAddress={this.state.feeRecipientAddress}
          lenderRelayFee={this.state.lenderRelayFee}
          traderRelayFee={this.state.traderRelayFee}
        />

        <Divider />

        <Submission onSubmit={this.handleSubmit} />

        <Result
          orderHash={this.state.orderHash}
          signedOrderObject={this.state.signedOrderObject}
        />
      </div>
    );
  }
}
