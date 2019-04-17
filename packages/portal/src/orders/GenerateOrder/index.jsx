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
import { getDecimals } from "../../common/tokens";

import validateInputs from "./validate";
import {
  fromBigNumber,
  toBigNumber,
  getInitialCollateralRequired,
  getTokenConversionAmount
} from "../../common/utils";
import {
  compileObject,
  addSalt,
  signOrder,
  getOrderHash,
  addNetworkId,
  pushOrderOnChain
} from "./utils";

const defaultLoanToken = tokens => {
  let token = tokens.filter(t => t.symbol === `KNC`);
  if (token.length > 0) {
    token = token[0]; // eslint-disable-line prefer-destructuring
  } else {
    token = tokens[0]; // eslint-disable-line prefer-destructuring
  }
  return token;
};

const defaultInterestToken = tokens => {
  let token = tokens.filter(t => t.symbol === `WETH`);
  if (token.length > 0) {
    token = token[0]; // eslint-disable-line prefer-destructuring
  } else {
    token = tokens[0]; // eslint-disable-line prefer-destructuring
  }
  return token;
};

const defaultCollateralToken = tokens => {
  let token = tokens.filter(t => t.symbol === `DAI`);
  if (token.length > 0) {
    token = token[0]; // eslint-disable-line prefer-destructuring
  } else {
    token = tokens[0]; // eslint-disable-line prefer-destructuring
  }
  return token;
};

export default class GenerateOrder extends React.Component {
  state = {
    role: `lender`,

    // token addresses
    loanTokenAddress: defaultLoanToken(this.props.tokens).address,
    interestTokenAddress: defaultInterestToken(this.props.tokens).address,
    collateralTokenAddress: defaultCollateralToken(this.props.tokens).address,

    // token amounts
    loanTokenAmount: ``,
    interestAmount: ``,
    collateralTokenAmount: `(finish form then refresh)`,

    interestTotalAmount: 0,
    interestRate: 0.0006,

    // margin amounts
    initialMarginAmount: toBigNumber(50, 10 ** 18).toString(),
    maintenanceMarginAmount: toBigNumber(25, 10 ** 18).toString(),

    maxDuration: 2419200, // 28 days

    // expiration date/time
    expirationDate: moment().add(7, `days`),

    // oracles
    oracles: this.props.oracles,
    oracleAddress: this.props.oracles[0].address,

    // relay/exchange settings
    sendToRelayExchange: false,
    feeRecipientAddress: `0x0000000000000000000000000000000000000000`,
    lenderRelayFee: 0,
    traderRelayFee: 0,

    takerAddress: `0x0000000000000000000000000000000000000000`,

    oracleData: `0x`,

    pushOnChain: false,
    withdrawOnOpen: false,
    tradeTokenToFillAddress: `0x0000000000000000000000000000000000000000`,

    orderHash: `0x_temp_order_hash`,
    finalOrder: null
  };

  /* State setters */

  setStateForCollateralAmount = async (
    loanTokenAddress,
    collateralTokenAddress,
    oracleAddress,
    loanTokenAmount,
    initialMarginAmount
  ) => {
    let collateralRequired = `(finish form then refresh)`;
    if (
      loanTokenAddress &&
      collateralTokenAddress &&
      oracleAddress &&
      loanTokenAmount &&
      initialMarginAmount
    ) {
      this.setState({ [`collateralTokenAmount`]: `loading...` });
      collateralRequired = toBigNumber(await getInitialCollateralRequired(
        loanTokenAddress,
        collateralTokenAddress,
        oracleAddress,
        toBigNumber(loanTokenAmount).toFixed(0),
        toBigNumber(initialMarginAmount).toFixed(0),
        this.props.bZx
      ));
      console.log(`collateralRequired`,collateralRequired);

      if (this.state.withdrawOnOpen) {
        collateralRequired = collateralRequired.plus(collateralRequired.times(10 ** 20).div(initialMarginAmount));
      }

      collateralRequired = fromBigNumber(
        collateralRequired,
        10 ** getDecimals(this.props.tokens, collateralTokenAddress)
      );

      console.log(`collateralRequired: ${collateralRequired}`);
      if (collateralRequired === 0) {
        collateralRequired = `(unsupported)`;
      }
    }
    this.setState({ [`collateralTokenAmount`]: collateralRequired });
  };

  setStateFor = key => async value => {
    await this.setState({ [key]: value });

    if (
      key === `loanTokenAddress` ||
      key === `collateralTokenAddress` ||
      key === `interestTokenAddress`
    ) {
      await this.refreshValuesAsync();
    }
  };

  setStateForInput = key => event =>
    this.setState({ [key]: event.target.value });

  setStateForMarginAmounts = key => event => {
    const { value } = event.target;
    this.setState({ [key]: toBigNumber(value, 10 ** 18) });
  };

  setStateForTotalInterest = (interestAmount, maxDuration) => {
    let totalInterest = 0;
    if (maxDuration > 0) {
      totalInterest = (maxDuration / 86400) * interestAmount;
    }
    this.setState({
      interestTotalAmount: Math.round(totalInterest * 10 ** 8) / 10 ** 8
    });
  };

  setStateForInterestRate = async event => {
    const { value } = event.target;
    this.setState({ interestRate: value / 100 });
  };

  setStateForMaxDuration = async event => {
    let value = toBigNumber(event.target.value)
      .times(86400)
      .toNumber();
    if (!value) value = 0;
    this.setState({ maxDuration: value });
  };

  setRole = (e, value) => {
    this.setState({ role: value });
  };

  setRelayCheckbox = (e, value) => {
    if (!value || !this.props.web3.utils.isAddress(this.state.feeRecipientAddress))
      this.setState({ 
        feeRecipientAddress: `0x0000000000000000000000000000000000000000`,
        takerAddress: `0x0000000000000000000000000000000000000000`,
        lenderRelayFee: 0,
        traderRelayFee: 0
      });
    this.setState(p => ({ 
      sendToRelayExchange: value,
      /*pushOnChain: value ? !value : p.pushOnChain */
    }));
  }

  setwithdrawOnOpenCheckbox = async (e, value) => {
    await this.setState(p => ({ withdrawOnOpen: value }));
    await this.refreshCollateralAmount();
  }

  setPushOnChainCheckbox = (e, value) => 
    this.setState(p => ({ 
      pushOnChain: value, 
      /*sendToRelayExchange: value ? !value : p.sendToRelayExchange */
    }));

  refreshCollateralAmount = async () => {
    if (this.state.role === `trader` && this.state.loanTokenAmount) {
      await this.setStateForCollateralAmount(
        this.state.loanTokenAddress,
        this.state.collateralTokenAddress,
        this.state.oracleAddress,
        toBigNumber(
          this.state.loanTokenAmount,
          10 ** getDecimals(this.props.tokens, this.state.loanTokenAddress)
        ),
        this.state.initialMarginAmount
      );
    }
  };

  refreshCollateralAmountEvent = async event => {
    event.preventDefault();
    await this.refreshCollateralAmount();
  };

  refreshValuesAsync = async () => {
    await this.refreshInterestAmount();
    await this.refreshCollateralAmount();
  };

  refreshInterestAmount = async () => {
    let interestAmount = 0;
    if (
      this.state.loanTokenAmount &&
      this.state.interestRate &&
      this.state.loanTokenAddress &&
      this.state.interestTokenAddress
    ) {
      const loanToInterestAmount = toBigNumber(
        await getTokenConversionAmount(
          this.state.loanTokenAddress,
          this.state.interestTokenAddress,
          toBigNumber(
            this.state.loanTokenAmount,
            10 ** getDecimals(this.props.tokens, this.state.loanTokenAddress)
          ),
          this.state.oracleAddress,
          this.props.bZx
        )
      );

      if (!loanToInterestAmount.eq(0)) {
        interestAmount = fromBigNumber(
          loanToInterestAmount.times(this.state.interestRate),
          10 ** getDecimals(this.props.tokens, this.state.interestTokenAddress)
        );
      }
    }
    this.setState({ interestAmount });
    this.setStateForTotalInterest(interestAmount, this.state.maxDuration);
  };

  refreshInterestAmountEvent = async event => {
    event.preventDefault();
    await this.refreshInterestAmount();
  };

  /* Submission handler */

  handleSubmit = async () => {
    await this.refreshValuesAsync();

    const isValid = await validateInputs(
      this.props.bZx,
      this.props.accounts,
      this.state,
      this.props.tokens,
      this.props.web3
    );
    this.setState({ orderHash: null, finalOrder: null });
    if (isValid) {
      const orderObject = await compileObject(
        this.props.web3,
        this.state,
        this.props.accounts[0],
        this.props.bZx,
        this.props.tokens
      );
      const saltedOrderObj = addSalt(orderObject);
      console.log(saltedOrderObj);
      const orderHash = getOrderHash(saltedOrderObj);
      try {
        
        if (this.state.pushOnChain) {
          // console.log(finalOrder);
          pushOrderOnChain(
            saltedOrderObj,
            this.props.web3,
            this.props.bZx,
            this.props.accounts
          );
        } else {
          const signature = await signOrder(
            orderHash,
            this.props.accounts,
            this.props.bZx
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
          const isSigValid = await this.props.bZx.isValidSignatureAsync({
            account: this.props.accounts[0].toLowerCase(),
            orderHash,
            signature
          });
          console.log(`isSigValid`, isSigValid);
          this.setState({ orderHash, finalOrder });
        }
      } catch (e) {
        console.log(e);
      }
    }
  };

  render() {
    return (
      <div>
        <RoleSection role={this.state.role} setRole={this.setRole} />

        <Divider />

        <OracleSection
          oracleAddress={this.state.oracleAddress}
          setOracleAddress={this.setStateForInput(`oracleAddress`)}
          oracles={this.state.oracles}
          etherscanURL={this.props.bZx.etherscanURL}
        />

        <Divider />

        <TokensSection
          tokens={this.props.tokens}
          role={this.state.role}
          // state setters
          setStateForAddress={this.setStateFor}
          setStateForInput={this.setStateForInput}
          setStateForInterestRate={this.setStateForInterestRate}
          // address states
          loanTokenAddress={this.state.loanTokenAddress}
          interestTokenAddress={this.state.interestTokenAddress}
          collateralTokenAddress={this.state.collateralTokenAddress}
          // token amounts
          loanTokenAmount={this.state.loanTokenAmount}
          collateralTokenAmount={this.state.collateralTokenAmount}
          interestRate={this.state.interestRate}
          interestTotalAmount={this.state.interestTotalAmount}
          collateralRefresh={this.refreshCollateralAmountEvent}
          etherscanURL={this.props.bZx.etherscanURL}
          maxDuration={this.state.maxDuration}
          interestRefresh={this.refreshInterestAmountEvent}
        />

        <Divider />

        <MarginAmountsSection
          setStateForInput={this.setStateForMarginAmounts}
          initialMarginAmount={this.state.initialMarginAmount}
          maintenanceMarginAmount={this.state.maintenanceMarginAmount}
          role={this.state.role}
          setwithdrawOnOpenCheckbox={this.setwithdrawOnOpenCheckbox}
          withdrawOnOpen={this.state.withdrawOnOpen}
        />

        <Divider />

        <ExpirationSection
          setMaxDuration={this.setStateForMaxDuration}
          maxDuration={this.state.maxDuration}
          setStateForInput={this.setStateForInput}
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
          takerAddress={this.state.takerAddress}
          pushOnChain={this.state.pushOnChain}
          lenderRelayFee={this.state.lenderRelayFee}
          traderRelayFee={this.state.traderRelayFee}
        />

        <Divider />

        <Submission
          setPushOnChainCheckbox={this.setPushOnChainCheckbox}
          pushOnChain={this.state.pushOnChain}
          sendToRelayExchange={this.state.sendToRelayExchange}
          onSubmit={this.handleSubmit}
        />

        <Result
          orderHash={this.state.orderHash}
          signedOrderObject={this.state.finalOrder}
        />
      </div>
    );
  }
}
