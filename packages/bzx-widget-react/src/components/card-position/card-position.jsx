import React, { Component } from "react";
import PropTypes from "prop-types";

import Button from "antd/lib/button";
import "./../../styles/components/button/index.less";
import Card from "antd/lib/card";
import "./../../styles/components/card/index.less";
import Icon from "antd/lib/icon";
import BigNumber from "bignumber.js";
import message from "antd/lib/message";
import * as moment from "moment";

export default class CardPosition extends Component {
  static propTypes = {
    data: PropTypes.object,
    onLoanOrderCancel: PropTypes.func,
    onLoanClose: PropTypes.func,
    onLoanTradeWithCurrentAsset: PropTypes.func,
    getTokenNameFromAddress: PropTypes.func,
    getMarginLevels: PropTypes.func,
    getProfitOrLoss: PropTypes.func,
    getSingleOrder: PropTypes.func,
    getAccount: PropTypes.func,
    currentAsset: PropTypes.string,
    isWethToken: PropTypes.func
  };

  ellipsisStyle = {
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis"
  };

  paramHeaderStyle = {
    fontWeight: "bold"
  };

  constructor(props) {
    super(props);

    this.state = { account: this.props.getAccount() };
  }

  componentDidMount() {
    if (this.props.data.trader.toLowerCase() === this.state.account.toLowerCase()) {
      this.props.getProfitOrLoss(this.props.data.loanOrderHash).then(result => {
        this.setState({ ...this.state, profitStatus: result });
      });
    } else {
      this.props.getSingleOrder(this.props.data.loanOrderHash).then(result => {
        this.setState({ ...this.state, fullOrder: result });
      });
    }

    this.props.getMarginLevels(this.props.data.loanOrderHash).then(result => {
      this.setState({ ...this.state, marginLevel: result });
    });
  }

  render() {
    return this.props.data.trader.toLowerCase() === this.state.account.toLowerCase()
      ? this.renderCardBorrowersLoan()
      : this.renderCardLendersLoan();
  }

  renderCardLendersLoan() {
    return (
      <Card>
        <div style={this.ellipsisStyle}>
          <span style={this.paramHeaderStyle}>Order #:</span> {this.props.data.loanOrderHash}
        </div>
        <div style={this.ellipsisStyle}>
          <span style={this.paramHeaderStyle}>Token:</span>{" "}
          {this.props.getTokenNameFromAddress(this.props.data.loanTokenAddress.toLowerCase())} (
          {this.props.data.loanTokenAddress})
        </div>
        <div style={this.ellipsisStyle}>
          <span style={this.paramHeaderStyle}>Interest accrued:</span>{" "}
          {new BigNumber(this.props.data.interestTotalAccrued).dividedBy(1000000000000000000).toFixed(4)}{" "}
          {this.props.getTokenNameFromAddress(this.props.data.interestTokenAddress.toLowerCase())}
        </div>
        <div style={this.ellipsisStyle}>{this.renderMarginLevels()}</div>
        <div style={this.ellipsisStyle}>
          <span style={this.paramHeaderStyle}>Expiration:</span>{" "}
          {moment.unix(this.props.data.loanEndUnixTimestampSec).format("dddd, MMMM Do YYYY, h:mm:ss a")}
        </div>
        <br />
        {this.renderTradeWithCurrentAssetButton()}
        <div>
          <Button block onClick={this._handleLoanOrderCancelClicked}>
            Cancel loan order
          </Button>
        </div>
      </Card>
    );
  }

  renderCardBorrowersLoan() {
    return (
      <Card>
        <div style={this.ellipsisStyle}>
          <span style={this.paramHeaderStyle}>Order #:</span> {this.props.data.loanOrderHash}
        </div>
        <div style={this.ellipsisStyle}>
          <span style={this.paramHeaderStyle}>Token:</span>{" "}
          {this.props.getTokenNameFromAddress(this.props.data.loanTokenAddress.toLowerCase())} (
          {this.props.data.loanTokenAddress})
        </div>
        {this.renderProfitOrLoss()}
        <div style={this.ellipsisStyle}>{this.renderMarginLevels()}</div>
        <div style={this.ellipsisStyle}>
          <span style={this.paramHeaderStyle}>Expiration:</span>{" "}
          {moment.unix(this.props.data.loanEndUnixTimestampSec).format("dddd, MMMM Do YYYY, h:mm:ss a")}
        </div>
        <br />
        {this.renderTradeWithCurrentAssetButton()}
        <div>
          <Button block onClick={this._handleLoanCloseClicked}>
            Close loan order
          </Button>
        </div>
      </Card>
    );
  }

  renderProfitOrLoss() {
    return this.state.profitStatus ? (
      this.state.profitStatus.isProfit ? (
        <span>
          <span style={this.paramHeaderStyle}>Profit: </span>
          <Icon type="up-circle" theme="twoTone" twoToneColor="#52c41a" /> {this.state.profitStatus.profitOrLoss} WETH
        </span>
      ) : (
        <span>
          <span style={this.paramHeaderStyle}>Loss: </span>
          <Icon type="down-circle" theme="twoTone" twoToneColor="#eb2f96" /> {this.state.profitStatus.profitOrLoss} WETH
        </span>
      )
    ) : (
      <span>
        <span style={this.paramHeaderStyle}>Profit/Loss: </span>
        <Icon type="question" />
      </span>
    );
  }

  renderMarginLevels() {
    return (
      <span>
        <span style={this.paramHeaderStyle}>Margin Levels (init / maint. / current): </span>
        {this.state.marginLevel
          ? `${this.state.marginLevel.initialMarginAmount} / ${this.state.marginLevel.maintenanceMarginAmount} / ${
              this.state.marginLevel.currentMarginAmount
            }`
          : ""}
      </span>
    );
  }

  renderTradeWithCurrentAssetButton() {
    return (
      <div>
        <Button
          block
          onClick={this._handleLoanTradeWithCurrentAssetClicked}
          disabled={
            this.props.isWethToken(this.props.currentAsset) === this.props.isWethToken(this.props.data.loanTokenAddress)
          }
        >
          Open position against active asset
        </Button>
      </div>
    );
  }

  _handleLoanOrderCancelClicked = () => {
    let resultPromise = this.props.onLoanOrderCancel({
      loanOrderHash: this.props.data.loanOrderHash.toLowerCase(),
      amount: new BigNumber(this.state.fullOrder.loanTokenAmount)
        .minus(new BigNumber(this.state.fullOrder.orderFilledAmount))
        .minus(new BigNumber(this.state.fullOrder.orderCancelledAmount))
        .toString()
    });
    resultPromise.then(
      value => message.success(`Cancel loan order operation was successful! TX: ${value}`),
      value => message.error(`Cancel loan order operation failed: ${value}!`)
    );
  };

  _handleLoanCloseClicked = () => {
    let resultPromise = this.props.onLoanClose({ loanOrderHash: this.props.data.loanOrderHash });
    resultPromise.then(
      value => message.success(`Cancel loan order operation was successful! TX: ${value}`),
      value => message.error(`Cancel loan order operation failed: ${value}!`)
    );
  };

  _handleLoanTradeWithCurrentAssetClicked = () => {
    let resultPromise = this.props.onLoanTradeWithCurrentAsset({ loanOrderHash: this.props.data.loanOrderHash });
    resultPromise.then(
      value => message.success(`Cancel loan order operation was successful! TX: ${value}`),
      value => message.error(`Cancel loan order operation failed: ${value}!`)
    );
  };
}
