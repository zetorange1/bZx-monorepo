import { Fragment } from "react";
import styled from "styled-components";
import Button from "@material-ui/core/Button";

import {
  fromBigNumber,
  toBigNumber,
  getInitialCollateralRequired
} from "../../common/utils";
import Section, { SectionLabel, Divider } from "../../common/FormSection";
import { getDecimals } from "../../common/tokens";

import Tokens from "./Tokens";
import Details from "./Details";
import Expiration from "./Expiration";
import Inputs from "./Inputs";
import CancelInputs from "./CancelInputs";

import BZxComponent from "../../common/BZxComponent";

import {
  validateFillOrder,
  validateCancelOrder,
  submitFillOrder,
  submitFillOrderWithHash,
  submitCancelOrder,
  submitCancelOrderWithHash
} from "./utils";
import { getOrderHash } from "../GenerateOrder/utils";

const SubmitBtn = styled(Button)`
  width: 100%;
  max-width: 480px;
  margin-bottom: 24px;
`;

const Hash = styled.a`
  font-family: monospace;
`;

const defaultToken = tokens => {
  let token = tokens.filter(t => t.symbol === `DAI`);
  if (token.length > 0) {
    token = token[0]; // eslint-disable-line prefer-destructuring
  } else {
    token = tokens[0]; // eslint-disable-line prefer-destructuring
  }
  return token;
};

export default class FillOrder extends BZxComponent {
  state = {
    fillOrderAmount: 0,
    collateralTokenAddress: defaultToken(this.props.tokens).address,
    collateralTokenAmount: `(finish form then refresh)`,
    loanTokenAvailable: 0,
    overCollateralize: false
  };

  async componentDidMount() {
    // console.log(this.props.order);
    if (this.props.order.makerRole !== `0`) {
      this.refreshCollateralAmountNoEvent();
    }

    try {
      const orderHash = this.props.order.loanOrderHash
        ? this.props.order.loanOrderHash
        : getOrderHash(this.props.order);
      // console.log("orderHash: "+orderHash);

      const orderDetail = await this.getSingleOrder(orderHash);
      console.log(orderDetail);
      if (Object.keys(orderDetail).length !== 0) {
        const loanTokenAvailable =
          orderDetail.loanTokenAmount -
          orderDetail.orderFilledAmount -
          orderDetail.orderCancelledAmount;
        this.setState({ loanTokenAvailable });
      } else {
        const cancelledAmount = await this.props.bZx.orderCancelledAmount(
          orderHash
        );
        this.setState({ loanTokenAvailable: this.props.order.loanTokenAmount-cancelledAmount });
      }
    } catch (e) {} // eslint-disable-line no-empty
  }

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
      if (collateralTokenAddress && collateralTokenAddress !== `0x0000000000000000000000000000000000000000`) {
        this.setState({ [`collateralTokenAmount`]: `loading...` });
        collateralRequired = toBigNumber(await getInitialCollateralRequired(
          loanTokenAddress,
          collateralTokenAddress,
          oracleAddress,
          loanTokenAmount,
          initialMarginAmount,
          this.props.bZx
        ));
        
        if (this.state.overCollateralize) {
          collateralRequired = collateralRequired.plus(collateralRequired.times(100).div(initialMarginAmount));
        }
        
        collateralRequired = fromBigNumber(
          collateralRequired,
          10 ** getDecimals(this.props.tokens, collateralTokenAddress)
        );
      } else {
        collateralRequired = `0`;
      }
      // console.log(`collateralRequired: ${collateralRequired}`);
      if (collateralRequired === 0) {
        collateralRequired = `(unsupported)`;
      }
    }
    this.setState({ [`collateralTokenAmount`]: collateralRequired });
  };

  setStateFor = key => value => this.setState({ [key]: value });

  setCollateralTokenAddress = async value => {
    await this.setState({ [`collateralTokenAddress`]: value });
    await this.refreshCollateralAmountNoEvent();
  };

  setOverCollateralize = async (e, value) => {
    await this.setState({ [`overCollateralize`]: value });
    await this.refreshCollateralAmountNoEvent();
  };

  getSingleOrder = async loanOrderHash => {
    const { bZx } = this.props;
    const order = await this.wrapAndRun(bZx.getSingleOrder({
      loanOrderHash
    }));
    return order;
  };

  refreshCollateralAmountNoEvent = async () => {
    await this.setStateForCollateralAmount(
      this.props.order.loanTokenAddress,
      this.props.order.makerRole === `0`
        ? this.state.collateralTokenAddress
        : this.props.order.collateralTokenAddress,
      this.props.order.oracleAddress,
      this.props.order.makerRole === `0`
        ? toBigNumber(
            this.state.fillOrderAmount,
            10 **
              getDecimals(this.props.tokens, this.props.order.loanTokenAddress)
          )
        : toBigNumber(
            this.props.order.loanTokenAmount,
            10 **
              getDecimals(this.props.tokens, this.props.order.loanTokenAddress)
          ),
      this.props.order.initialMarginAmount
    );
  };

  refreshCollateralAmount = async event => {
    event.preventDefault();
    await this.refreshCollateralAmountNoEvent();
  };

  handleSubmit = async () => {
    const {
      order,
      tokens,
      oracles,
      web3,
      bZx,
      accounts,
      changeTab,
      resetOrder
    } = this.props;

    await this.refreshCollateralAmountNoEvent();
    const {
      fillOrderAmount,
      loanTokenAvailable,
      collateralTokenAddress,
      collateralTokenAmount,
      overCollateralize
    } = this.state;
    const isFillOrderValid = await validateFillOrder(
      order,
      fillOrderAmount,
      loanTokenAvailable,
      collateralTokenAddress,
      collateralTokenAmount,
      tokens,
      oracles,
      bZx,
      accounts
    );
    if (isFillOrderValid) {
      if (!order.loanOrderHash) {
        submitFillOrder(
          order,
          fillOrderAmount,
          collateralTokenAddress,
          overCollateralize,
          tokens,
          web3,
          bZx,
          accounts,
          resetOrder
        );
      } else {
        submitFillOrderWithHash(
          order.loanOrderHash,
          order.makerRole === `0`,
          order.loanTokenAddress,
          fillOrderAmount,
          collateralTokenAddress,
          overCollateralize,
          tokens,
          web3,
          bZx,
          accounts,
          changeTab
        );
      }
    }
  };

  handleCancelSubmit = async () => {
    const {
      order,
      tokens,
      web3,
      bZx,
      accounts,
      changeTab,
      resetOrder
    } = this.props;

    await this.refreshCollateralAmountNoEvent();
    const { fillOrderAmount, loanTokenAvailable } = this.state;
    const isCancelOrderValid = await validateCancelOrder(
      order,
      fillOrderAmount, // cancelOrderAmount
      loanTokenAvailable,
      tokens,
      bZx,
      accounts
    );
    if (isCancelOrderValid) {
      if (!order.loanOrderHash) {
        submitCancelOrder(
          order,
          fillOrderAmount,
          tokens,
          web3,
          bZx,
          accounts,
          resetOrder
        );
      } else {
        submitCancelOrderWithHash(
          order.loanOrderHash,
          order.loanTokenAddress,
          fillOrderAmount,
          tokens,
          web3,
          bZx,
          accounts,
          changeTab
        );
      }
    }
  };

  render() {
    const { order, tokens, bZx, accounts } = this.props;
    const isMaker =
      order.makerAddress.toLowerCase() === accounts[0].toLowerCase();
    const makerRole = order.makerRole === `0` ? `lender` : `trader`;
    const counterRole = order.makerRole !== `0` ? `lender` : `trader`;
    return (
      <Fragment>
        <Section>
          <SectionLabel>1. Review order info</SectionLabel>
          <p>
            {isMaker ? (
              <Fragment>
                This order was created by you for a{` `}
                {counterRole} to fill.
              </Fragment>
            ) : (
              <Fragment>
                This order was created by
                {` `}
                <Hash
                  href={`${bZx.etherscanURL}address/${order.makerAddress}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {order.makerAddress}
                </Hash>
                {` `}
                for a{` `}
                {counterRole} to fill.
              </Fragment>
            )}
          </p>
          <Tokens
            bZx={bZx}
            tokens={tokens}
            role={makerRole}
            loanTokenAddress={order.loanTokenAddress}
            loanTokenAvailable={fromBigNumber(
              this.state.loanTokenAvailable,
              10 ** getDecimals(tokens, order.loanTokenAddress)
            )}
            interestTokenAddress={order.interestTokenAddress}
            interestAmount={fromBigNumber(
              order.interestAmount,
              10 ** getDecimals(tokens, order.interestAmount)
            )}
            collateralTokenAddress={order.collateralTokenAddress}
            collateralTokenAmount={this.state.collateralTokenAmount}
          />
          <Details
            bZx={bZx}
            oracles={this.props.oracles}
            initialMarginAmount={order.initialMarginAmount}
            maintenanceMarginAmount={order.maintenanceMarginAmount}
            oracleAddress={order.oracleAddress}
            signature={order.signature}
            feeRecipientAddress={order.feeRecipientAddress}
            lenderRelayFee={fromBigNumber(order.lenderRelayFee, 1e18)}
            traderRelayFee={fromBigNumber(order.traderRelayFee, 1e18)}
          />
          <Expiration
            expirationUnixTimestampSec={order.expirationUnixTimestampSec}
          />
        </Section>
        {this.state.loanTokenAvailable ? (
          <Fragment>
            <Divider />
            <Section>
              {isMaker ? (
                <Fragment>
                  <SectionLabel>
                    2. Choose cancel amount and submit
                  </SectionLabel>
                  <CancelInputs
                    bZx={bZx}
                    tokens={tokens}
                    fillOrderAmount={this.state.fillOrderAmount}
                    loanTokenAddress={order.loanTokenAddress}
                    setFillOrderAmount={this.setStateFor(`fillOrderAmount`)}
                  />
                  <SubmitBtn
                    variant="raised"
                    color="primary"
                    onClick={this.handleCancelSubmit}
                  >
                    Cancel Order
                  </SubmitBtn>
                </Fragment>
              ) : (
                <Fragment>
                  <SectionLabel>
                    {makerRole === `lender`
                      ? `2. Choose parameters and submit`
                      : `2. Submit fill order transaction`}
                  </SectionLabel>
                  {makerRole === `lender` && (
                    <Inputs
                      bZx={bZx}
                      tokens={tokens}
                      fillOrderAmount={this.state.fillOrderAmount}
                      collateralTokenAddress={this.state.collateralTokenAddress}
                      loanTokenAddress={order.loanTokenAddress}
                      setFillOrderAmount={this.setStateFor(`fillOrderAmount`)}
                      setCollateralTokenAddress={this.setCollateralTokenAddress}
                      collateralTokenAmount={this.state.collateralTokenAmount}
                      collateralRefresh={this.refreshCollateralAmount}
                      setOverCollateralize={this.setOverCollateralize}
                      overCollateralize={this.state.overCollateralize}
                    />
                  )}
                  <SubmitBtn
                    variant="raised"
                    color="primary"
                    onClick={this.handleSubmit}
                  >
                    Fill Order
                  </SubmitBtn>
                </Fragment>
              )}
            </Section>
          </Fragment>
        ) : (
          <Fragment>
            <Section>
              <p>
                This order is completely filled. There is no loan token
                remaining.
              </p>
            </Section>
          </Fragment>
        )}
      </Fragment>
    );
  }
}
