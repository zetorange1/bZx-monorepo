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
    isAsk: PropTypes.bool,
    data: PropTypes.object,
    doLoanOrderTake: PropTypes.func,
    getTokenNameFromAddress: PropTypes.func,
    getMarginLevels: PropTypes.func,
    getProfitOrLoss: PropTypes.func
  };

  styleColumnRowType = {
    width: "24px",
    height: "24px",
    float: "left",
    verticalAlign: "middle"
  };

  styleColumnAmount = {
    width: "15%",
    height: "24px",
    float: "left",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    verticalAlign: "middle"
  };

  styleColumnDate = {
    width: "35%",
    height: "24px",
    float: "left",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    verticalAlign: "middle"
  };

  styleColumnButton = {
    width: "20%",
    float: "left"
  };

  constructor(props) {
    super(props);

    this.state = {};
  }

  componentDidMount() {}

  render() {
    return (
      <div style={{ height: "32px" }}>
        <div style={this.styleColumnRowType}>{this.renderColumnRowType()}</div>
        <div style={this.styleColumnAmount}>{this.renderColumnInterest()}</div>
        <div style={this.styleColumnAmount}>{this.renderColumnAmount()}</div>
        <div style={this.styleColumnDate}>{this.renderColumnExpDate()}</div>
        <div style={this.styleColumnButton}>
          <Button block size={"small"} onClick={this._handleLoanOrderTakeClicked}>
            {this.props.isAsk ? "lend" : "borrow"}
          </Button>
        </div>
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

  _handleLoanOrderTakeClicked = () => {
    let resultPromise = this.props.doLoanOrderTake({
      loanOrderHash: this.props.data.loanOrderHash,
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
