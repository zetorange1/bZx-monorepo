import moment from "moment";

import { Divider } from "../../common/FormSection";
import RoleSection from "./Role";
import TokensSection from "./Tokens";
import MarginAmountsSection from "./MarginAmounts";
import ExpirationSection from "./Expiration";
import OracleSection from "./Oracle";
import RelayExchangeSection from "./RelayExchange";
import Submission from "./Submission";
import Result from "./Result";

import validateInputs from "./validate";
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
    initialMarginAmount: 40,
    liquidationMarginAmount: 20,

    // expiration date/time
    expirationDate: moment(),

    // oracle
    useB0xOracle: true,
    oracleAddress: `b0x_oracle_address`,

    // relay/exchange settings
    sendToRelayExchange: false,
    feeRecipientAddress: ``,
    lenderRelayFee: 0,
    traderRelayFee: 0,

    orderHash: `0x_temp_order_hash`,
    finalOrder: null
  };

  /* State setters */

  setStateFor = key => value => this.setState({ [key]: value });

  setStateForInput = key => event =>
    this.setState({ [key]: event.target.value });

  setRole = (e, value) => this.setState({ role: value });

  setRelayCheckbox = (e, value) =>
    this.setState({ sendToRelayExchange: value });

  setUseB0xCheckbox = (e, value) => {
    console.log(`hey`);
    if (value) {
      this.setState({ oracleAddress: `b0x_oracle_address` });
    }
    this.setState({ useB0xOracle: value });
  };

  /* Submission handler */

  handleSubmit = () => {
    const isValid = validateInputs(this.state);
    this.setState({ orderHash: null, finalOrder: null });
    if (isValid) {
      const orderObject = compileObject(this.state); // 1. compile the order object from state
      const saltedOrderObj = addSalt(orderObject); // 2. compute and add salt to the order object
      const signedOrderObject = signOrder(saltedOrderObj); // 3. sign order w/ maker's private key
      const orderHash = getHash(signedOrderObject); // 4. get a hash for the signed object
      const finalOrder = { ...signedOrderObject, role: this.state.role };
      this.setState({ orderHash, finalOrder });
    } else {
      alert(verificationResult.errorMsg); // eslint-disable-line no-undef
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

        <OracleSection
          oracleAddress={this.state.oracleAddress}
          setOracleAddress={this.setStateForInput(`oracleAddress`)}
          useB0xCheckbox={this.state.useB0xOracle}
          setUseB0xCheckbox={this.setUseB0xCheckbox}
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
          signedOrderObject={this.state.finalOrder}
        />
      </div>
    );
  }
}
