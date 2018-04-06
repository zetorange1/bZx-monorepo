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
import {
  compileObject,
  addSalt,
  signOrder,
  getHash,
  addNetworkId
} from "./utils";

export default class GenerateOrder extends React.Component {
  state = {
    role: `lender`,

    // token addresses
    loanTokenAddress: this.props.tokens[0].address,
    interestTokenAddress: this.props.tokens[0].address,
    collateralTokenAddress: this.props.tokens[0].address,

    // token amounts
    loanTokenAmount: ``,
    interestAmount: ``,

    // margin amounts
    initialMarginAmount: 50,
    maintenanceMarginAmount: 25,

    // expiration date/time
    expirationDate: moment(),

    // oracles
    oracles: this.props.oracles,
    oracleAddress: this.props.oracles[0].address,

    // relay/exchange settings
    sendToRelayExchange: false,
    feeRecipientAddress: `0x0000000000000000000000000000000000000000`,
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

  /* Submission handler */

  handleSubmit = async () => {
    const isValid = await validateInputs(
      this.props.b0x,
      this.props.accounts,
      this.state,
      this.props.tokens
    );
    this.setState({ orderHash: null, finalOrder: null });
    if (isValid) {
      const orderObject = await compileObject(
        this.props.web3,
        this.state,
        this.props.accounts[0],
        this.props.b0x
      );
      const saltedOrderObj = addSalt(orderObject);
      const orderHash = getHash(saltedOrderObj);
      const signature = await signOrder(
        orderHash,
        this.props.accounts,
        this.props.b0x
      );
      const orderWithSignature = {
        ...saltedOrderObj,
        signature
      };
      console.log(`orderHash`, orderHash);
      const finalOrder = await addNetworkId(
        orderWithSignature,
        this.props.web3
      );
      const isSigValid = await this.props.b0x.isValidSignatureAsync({
        account: this.props.accounts[0].toLowerCase(),
        orderHash,
        signature
      });
      console.log(`isSigValid`, isSigValid);
      this.setState({ orderHash, finalOrder });
    }
  };

  render() {
    return (
      <div>
        <RoleSection role={this.state.role} setRole={this.setRole} />

        <Divider />

        <TokensSection
          tokens={this.props.tokens}
          role={this.state.role}
          // state setters
          setStateForAddress={this.setStateFor}
          setStateForInput={this.setStateForInput}
          // address states
          loanTokenAddress={this.state.loanTokenAddress}
          interestTokenAddress={this.state.interestTokenAddress}
          collateralTokenAddress={this.state.collateralTokenAddress}
          // token amounts
          loanTokenAmount={this.state.loanTokenAmount}
          interestAmount={this.state.interestAmount}
        />

        <Divider />

        <MarginAmountsSection
          setStateForInput={this.setStateForInput}
          initialMarginAmount={this.state.initialMarginAmount}
          maintenanceMarginAmount={this.state.maintenanceMarginAmount}
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
          oracles={this.state.oracles}
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
