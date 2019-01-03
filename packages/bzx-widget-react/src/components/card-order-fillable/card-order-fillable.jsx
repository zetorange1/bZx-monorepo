import React, { Component } from "react";
import PropTypes from "prop-types";

import Button from "antd/lib/button";
import "./../../styles/components/button/index.less";
import Icon from "antd/lib/icon";
import BigNumber from "bignumber.js";
import message from "antd/lib/message";
import * as moment from "moment";

export default class CardOrderFillable extends Component {
  static propTypes = {
    currentAccount: PropTypes.string,
    currentAsset: PropTypes.string,
    isAsk: PropTypes.bool,
    data: PropTypes.object,
    doLoanOrderTake: PropTypes.func,
    doLoanOrderCancel: PropTypes.func
  };

  styleColumnRowType = {
    width: 24,
    height: 24,
    float: "left",
    verticalAlign: "middle"
  };

  styleColumnAmount = {
    width: 72,
    height: 24,
    float: "left",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    verticalAlign: "middle"
  };

  styleColumnDate = {
    width: 140,
    height: 24,
    float: "left",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    verticalAlign: "middle"
  };

  styleColumnButton = {
    width: 80,
    float: "left"
  };

  constructor(props) {
    super(props);

    this.state = {};
  }

  render() {
    return (
      <div style={{ height: "24px", width: "400px" }}>
        <div style={this.styleColumnRowType}>{this.renderColumnRowType()}</div>
        <div style={this.styleColumnAmount}>{this.renderColumnInterest()}</div>
        <div style={this.styleColumnAmount}>{this.renderColumnAmount()}</div>
        <div style={this.styleColumnDate}>{this.renderColumnExpDate()}</div>
        <div style={this.styleColumnButton}>{this.renderColumnActions()}</div>
      </div>
    );
  }

  renderColumnRowType() {
    return this.props.isAsk ? (
      <Icon type="left-circle" theme="twoTone" twoToneColor="#eb2f96" />
    ) : (
      <Icon type="right-circle" theme="twoTone" twoToneColor="#52c41a" />
    );
  }

  renderColumnInterest() {
    return new BigNumber(this.props.data.interestAmount).dividedBy(1000000000000000000).toFixed(4);
  }

  renderColumnAmount() {
    const amountInOrder =
      this.props.data.loanTokenAmount - this.props.data.orderFilledAmount - this.props.data.orderCancelledAmount;

    return new BigNumber(amountInOrder).dividedBy(1000000000000000000).toFixed(4);
  }

  renderColumnExpDate() {
    return moment.unix(this.props.data.expirationUnixTimestampSec).format("YYYY.MM.DD HH:mm:ss");
  }

  renderColumnActions() {
    return this.props.data.makerAddress.toLowerCase() !== this.props.currentAccount.toLowerCase() ? (
      <Button block size={"small"} onClick={this._handleLoanOrderTakeClicked}>
        {this.props.isAsk ? "lend" : "borrow"}
      </Button>
    ) : (
      <Button block size={"small"} onClick={this._handleLoanOrderCancelClicked}>
        cancel
      </Button>
    );
  }

  _handleLoanOrderCancelClicked = () => {
    let resultPromise = this.props.doLoanOrderCancel({
      loanOrderHash: this.props.data.loanOrderHash,
      amount: new BigNumber(
        this.props.data.loanTokenAmount - this.props.data.orderFilledAmount - this.props.data.orderCancelledAmount
      ).toString()
    });
    resultPromise.then(
      value => message.success(`Cancel order operation was successful! TX: ${value}`),
      value => message.error(`Cancel order operation failed: ${value}!`)
    );
  };

  _handleLoanOrderTakeClicked = () => {
    let resultPromise = this.props.doLoanOrderTake({
      loanOrderHash: this.props.data.loanOrderHash,
      loanTokenAddress: this.props.data.loanTokenAddress,
      collateralTokenAddress: this.props.data.collateralTokenAddress,
      isAsk: this.props.isAsk,
      amount: new BigNumber(
        this.props.data.loanTokenAmount - this.props.data.orderFilledAmount - this.props.data.orderCancelledAmount
      ).toString()
    });
    resultPromise.then(
      value => message.success(`Take order operation was successful! TX: ${value}`),
      value => message.error(`Take order operation failed: ${value}!`)
    );
  };
}
