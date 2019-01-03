import React, { Component } from "react";
import PropTypes from "prop-types";

import Button from "antd/lib/button";
import "./../../styles/components/button/index.less";
import message from "antd/lib/message";
import "./../../styles/components/message/index.less";
import List from "antd/lib/list";
import "./../../styles/components/list/index.less";
import Item from "antd/lib/list/Item";
import Scrollbar from "react-scrollbars-custom";

import CardOrderFillable from "../../components/card-order-fillable/card-order-fillable";
import CardOrderFillableTitle from "../../components/card-order-fillable/card-order-fillable-title";

import { EVENT_ASSET_SELECTED } from "@bzxnetwork/bzx-widget-common";

export default class OrdersFillableList extends Component {
  static propTypes = {
    currentAccount: PropTypes.string,
    currentAsset: PropTypes.string,
    listLoanOrdersBidsAvailable: PropTypes.func,
    listLoanOrdersAsksAvailable: PropTypes.func,
    doLoanOrderTake: PropTypes.func,
    doLoanOrderCancel: PropTypes.func,
    listSize: PropTypes.number
  };

  static defaultProps = {
    currentAccount: "",
    currentAsset: "",
    listLoanOrdersBidsAvailable: () => [],
    listLoanOrdersAsksAvailable: () => [],
    doLoanOrderTake: () => {},
    doLoanOrderCancel: () => {},
    listSize: 100
  };

  constructor(props) {
    super(props);

    this.state = { ...props.stateDefaults, pageSize: 3, bids: [], asks: [], currentPage: 1 };
  }

  componentDidMount() {
    this._handleReload();
  }

  render() {
    return (
      <div>
        <div>
          <Button icon="reload" onClick={this._handleReload} />
          &nbsp; Order book
        </div>
        <br />
        <CardOrderFillableTitle />
        <Scrollbar noScrollX style={{ minHeight: 250, maxHeight: 400 }}>
          {this.renderLendOrdersList(this.state.bids, false, this._handleLoanOrderTake, this._handleLoanOrderCancel)}
          {this.renderLendOrdersList(this.state.asks, true, this._handleLoanOrderTake, this._handleLoanOrderCancel)}
        </Scrollbar>
      </div>
    );
  }

  renderLendOrdersList(ordersList, isAsk, onTakeAction, onCancelAction) {
    return (
      <List
        size="small"
        dataSource={ordersList}
        locale={{ emptyText: isAsk ? "No asks" : "No bids" }}
        renderItem={item => (
          <Item key={item.loanOrderHash}>
            <CardOrderFillable
              currentAccount={this.props.currentAccount}
              currentAsset={this.props.currentAsset}
              data={item}
              isAsk={isAsk}
              doLoanOrderTake={onTakeAction}
              doLoanOrderCancel={onCancelAction}
            />
          </Item>
        )}
      />
    );
  }

  _sortLoanOrdersComparatorFunction = (a, b) => {
    return a.interestRate !== b.interestRate
      ? b.interestRate - a.interestRate
      : a.loanTokenAmount !== b.loanTokenAmount
        ? b.loanTokenAmount - a.loanTokenAmount
        : a.expirationUnixTimestampSec !== b.expirationUnixTimestampSec
          ? b.expirationUnixTimestampSec - a.expirationUnixTimestampSec
          : 0;
  };

  _handleLoanOrderTake = request => {
    return this.props.doLoanOrderTake(request).then(result => {
      this._handleReload();
    });
  };

  _handleLoanOrderCancel = request => {
    return this.props.doLoanOrderCancel(request).then(result => {
      this._handleReload();
    });
  };

  _handlePageChange = value => {
    this.setState({ ...this.state, currentPage: value });
  };

  _handleReload = () => {
    const listLoanOrdersBidsAvailablePromise = this.props.listLoanOrdersBidsAvailable(
      e => true,
      this._sortLoanOrdersComparatorFunction,
      this.props.listSize
    );
    listLoanOrdersBidsAvailablePromise.then(result => {
      this.setState({ ...this.state, bids: result });
    });

    const listLoanOrdersAsksAvailablePromise = this.props.listLoanOrdersAsksAvailable(
      e => true,
      this._sortLoanOrdersComparatorFunction,
      this.props.listSize
    );
    listLoanOrdersAsksAvailablePromise.then(result => {
      this.setState({ ...this.state, asks: result });
    });

    Promise.all([listLoanOrdersBidsAvailablePromise, listLoanOrdersAsksAvailablePromise]).then(result => {
      message.success("List of orders has been successfully updated!");
    });
  };
}
