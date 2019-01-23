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
    currentAccount: PropTypes.string,
    currentAsset: PropTypes.string,
    onLoanOrderWithdrawProfit: PropTypes.func,
    onLoanOrderCancel: PropTypes.func,
    onLoanClose: PropTypes.func,
    onLoanTradeWithCurrentAsset: PropTypes.func,
    getMarginLevels: PropTypes.func,
    getPositionOffset: PropTypes.func,
    getSingleOrder: PropTypes.func,
    getTokenNameFromAddress: PropTypes.func,
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

    this.state = {
      actionTradeWithCurrentAssetEnabled: false,
      actionLoanOrderCancelEnabled: false,
      actionLoanOrderWithdrawProfitEnabled: false,
      profitStatus: null,
      fullOrder: null,
      marginLevel: null
    };
  }

  componentDidMount() {
    if (this.props.data.trader.toLowerCase() === this.props.currentAccount.toLowerCase()) {
      this.props.getPositionOffset(this.props.data.loanOrderHash).then(result => {
        this.setState({ ...this.state, profitStatus: result, actionLoanOrderWithdrawProfitEnabled: result.isPositive });
      });
    }

    this.props.getSingleOrder(this.props.data.loanOrderHash).then(result => {
      console.dir(result);
      this.setState({
        ...this.state,
        fullOrder: result,
        actionLoanOrderCancelEnabled: new BigNumber(result.loanTokenAmount)
          .minus(new BigNumber(result.orderCancelledAmount))
          .gt(new BigNumber(this.props.data.loanTokenAmountFilled))
      });
    });

    this.props.getMarginLevels(this.props.data.loanOrderHash).then(result => {
      this.setState({ ...this.state, marginLevel: result });
    });
  }

  componentWillReceiveProps(nextProps, nextContext) {
    if (this.props.currentAsset.toLowerCase() !== nextProps.currentAsset.toLowerCase()) {
      this.setState({
        ...this.state,
        actionTradeWithCurrentAssetEnabled:
          this.props.isWethToken(nextProps.currentAsset.toLowerCase()) !==
            this.props.isWethToken(nextProps.data.loanTokenAddress.toLowerCase()) &&
          nextProps.data.trader.toLowerCase() === this.props.currentAccount.toLowerCase(),
        actionLoanOrderCancelEnabled: this.state.fullOrder
          ? new BigNumber(this.state.fullOrder.loanTokenAmount)
              .minus(new BigNumber(this.state.fullOrder.orderCancelledAmount))
              .gt(new BigNumber(this.props.data.loanTokenAmountFilled))
          : false
      });
    }
  }

  render() {
    return this.props.data.trader.toLowerCase() === this.props.currentAccount.toLowerCase()
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
          <span style={this.paramHeaderStyle}>Amount (avail. / full):</span>{" "}
          {this.state.fullOrder
            ? new BigNumber(this.state.fullOrder.loanTokenAmount)
                .minus(new BigNumber(this.props.data.loanTokenAmountFilled))
                .minus(new BigNumber(this.state.fullOrder.orderCancelledAmount))
                .dividedBy(1000000000000000000)
                .toFixed(4)
            : "?"}
          {" / "}
          {this.state.fullOrder
            ? new BigNumber(this.state.fullOrder.loanTokenAmount).dividedBy(1000000000000000000).toFixed(4)
            : "?"}
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
        {this.renderLoanOrderCancelButton()}
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
        <div style={this.ellipsisStyle}>
          <span style={this.paramHeaderStyle}>Amount (avail. / full):</span>{" "}
          {this.state.fullOrder
            ? new BigNumber(this.state.fullOrder.loanTokenAmount)
                .minus(new BigNumber(this.props.data.loanTokenAmountFilled))
                .minus(new BigNumber(this.state.fullOrder.orderCancelledAmount))
                .dividedBy(1000000000000000000)
                .toFixed(4)
            : "?"}
          {" / "}
          {this.state.fullOrder
            ? new BigNumber(this.state.fullOrder.loanTokenAmount).dividedBy(1000000000000000000).toFixed(4)
            : "?"}
        </div>
        {this.renderProfitOrLoss()}
        <div style={this.ellipsisStyle}>{this.renderMarginLevels()}</div>
        <div style={this.ellipsisStyle}>
          <span style={this.paramHeaderStyle}>Expiration:</span>{" "}
          {moment.unix(this.props.data.loanEndUnixTimestampSec).format("dddd, MMMM Do YYYY, h:mm:ss a")}
        </div>
        <br />
        {this.renderTradeWithCurrentAssetButton()}
        {this.renderLoanOrderWithdrawProfitButton()}
        {this.renderLoanCloseButton()}
      </Card>
    );
  }

  renderProfitOrLoss() {
    return this.state.profitStatus ? (
      this.state.profitStatus.isPositive ? (
        <span>
          <span style={this.paramHeaderStyle}>Profit: </span>
          <Icon type="up-circle" theme="twoTone" twoToneColor="#52c41a" />{" "}
          {new BigNumber(this.state.profitStatus.offsetAmount).dividedBy(1000000000000000000).toFixed(4)} WETH
        </span>
      ) : (
        <span>
          <span style={this.paramHeaderStyle}>Loss: </span>
          <Icon type="down-circle" theme="twoTone" twoToneColor="#eb2f96" />{" "}
          {new BigNumber(this.state.profitStatus.offsetAmount).dividedBy(1000000000000000000).toFixed(4)} WETH
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
          ? `${new BigNumber(this.state.marginLevel.initialMarginAmount).dividedBy(
              1000000000000000000
            )} / ${new BigNumber(this.state.marginLevel.maintenanceMarginAmount).dividedBy(
              1000000000000000000
            )} / ${new BigNumber(this.state.marginLevel.currentMarginAmount).dividedBy(1000000000000000000)}`
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
          disabled={!this.state.actionTradeWithCurrentAssetEnabled}
        >
          Open position against active asset
        </Button>
      </div>
    );
  }

  renderLoanOrderWithdrawProfitButton() {
    return (
      <div>
        <Button
          block
          onClick={this._handleLoanOrderWithdrawProfitClicked}
          disabled={!this.state.actionLoanOrderWithdrawProfitEnabled}
        >
          Withdraw profit
        </Button>
      </div>
    );
  }

  renderLoanOrderCancelButton() {
    return (
      <div>
        <Button block onClick={this._handleLoanOrderCancelClicked} disabled={!this.state.actionLoanOrderCancelEnabled}>
          Cancel loan order
        </Button>
      </div>
    );
  }

  renderLoanCloseButton() {
    return (
      <div>
        <Button block onClick={this._handleLoanCloseClicked}>
          Close loan
        </Button>
      </div>
    );
  }

  _handleLoanOrderWithdrawProfitClicked = () => {
    let resultPromise = this.props.onLoanOrderWithdrawProfit({
      loanOrderHash: this.props.data.loanOrderHash.toLowerCase()
    });
    resultPromise.then(
      value => message.success(`Withdraw profit operation was successful! TX: ${value}`),
      value => message.error(`Withdraw profit operation failed: ${value}!`)
    );
  };

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
      value => message.success(`Close loan order operation was successful! TX: ${value}`),
      value => message.error(`Close loan order operation failed: ${value}!`)
    );
  };

  _handleLoanTradeWithCurrentAssetClicked = () => {
    let resultPromise = this.props.onLoanTradeWithCurrentAsset({
      loanOrderHash: this.props.data.loanOrderHash,
      asset: this.props.currentAsset
    });
    resultPromise.then(
      value => message.success(`Trade with current asset operation was successful! TX: ${value}`),
      value => message.error(`Trade with current asset operation failed: ${value}!`)
    );
  };
}
