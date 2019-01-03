import React, { Component } from "react";
import PropTypes from "prop-types";

import Tabs from "antd/lib/tabs";
import "./../../styles/components/tabs/index.less";
import message from "antd/lib/message";
import "./../../styles/components/message/index.less";

import BorrowForm from "../borrow-form/borrow-form";
import LendForm from "../lend-form/lend-form";
import QuickPositionForm from "../quick-position-form/quick-position-form";
import OrdersFillableList from "../orders-fillable-list/orders-fillable-list";
import PositionsList from "../positions-list/positions-list";
import InputAsset from "../../components/input-asset/input-asset";
import {
  EVENT_ACCOUNT_UPDATE,
  EVENT_ASSET_UPDATE,
  EVENT_INIT_FAILED
} from "@bzxnetwork/bzx-widget-common";

export default class BZXWidget extends Component {
  static propTypes = {
    provider: PropTypes.object,
    widgetStyles: PropTypes.object
  };

  state = {
    assets: [],
    currentAsset: "",
    currentAccount: ""
  };

  constructor(props) {
    super(props);

    this.state = {
      assets: this.props.provider.assets,
      currentAsset: this.props.provider.defaultAsset,
      currentAccount: this.props.provider.getAccount()
    };

    this.props.provider.eventEmitter.on(EVENT_ACCOUNT_UPDATE, this._handleAccountUpdate.bind(this));
    this.props.provider.eventEmitter.on(EVENT_ASSET_UPDATE, this._handleAssetsUpdate.bind(this));
    this.props.provider.eventEmitter.on(EVENT_INIT_FAILED, this._handleProviderInitFailed.bind(this));
  }

  assetChanged = value => {
    this.setState({ ...this.state, currentAsset: value });
  };

  render() {
    return (
      <div style={this.props.widgetStyles}>
        <div>
          <InputAsset options={this.state.assets} value={this.state.currentAsset} onChanged={this.assetChanged} />
        </div>

        <br />

        <div>
          <Tabs defaultActiveKey="1" tabPosition="left">
            <Tabs.TabPane tab="Loan request" key="1">
              <LendForm
                onApprove={this._handleLendApprove}
                stateDefaults={this.props.provider.getLendFormDefaults()}
                formOptions={this.props.provider.getLendFormOptions()}
              />
            </Tabs.TabPane>
            <Tabs.TabPane tab="Borrow request" key="2">
              <BorrowForm
                onApprove={this._handleBorrowApprove}
                stateDefaults={this.props.provider.getBorrowFormDefaults()}
                formOptions={this.props.provider.getBorrowFormOptions()}
              />
            </Tabs.TabPane>
            <Tabs.TabPane tab="Quick position" key="3">
              <QuickPositionForm
                onApprove={this._handleQuickPositionApprove}
                stateDefaults={this.props.provider.getQuickPositionFormDefaults()}
                formOptions={this.props.provider.getQuickPositionFormOptions()}
              />
            </Tabs.TabPane>
            <Tabs.TabPane tab="Order book" key="4">
              <OrdersFillableList
                currentAccount={this.state.currentAccount}
                currentAsset={this.state.currentAsset}
                listLoanOrdersBidsAvailable={this.props.provider.listLoanOrdersBidsAvailable}
                listLoanOrdersAsksAvailable={this.props.provider.listLoanOrdersAsksAvailable}
                doLoanOrderTake={this.props.provider.doLoanOrderTake}
                doLoanOrderCancel={this.props.provider.doLoanOrderCancel}
                listSize={100}
              />
            </Tabs.TabPane>
            <Tabs.TabPane tab="My orders" key="5">
              <PositionsList
                currentAccount={this.state.currentAccount}
                currentAsset={this.state.currentAsset}
                onLoanOrderWithdrawProfit={this.props.provider.doLoanOrderWithdrawProfit}
                onLoanOrderCancel={this.props.provider.doLoanOrderCancel}
                onLoanClose={this.props.provider.doLoanClose}
                onLoanTradeWithCurrentAsset={this._handleLoanTradeWithCurrentAsset}
                listLoansActive={this.props.provider.listLoansActive}
                getTokenNameFromAddress={this.props.provider.getTokenNameFromAddress}
                getMarginLevels={this.props.provider.getMarginLevels}
                getPositionOffset={this.props.provider.getPositionOffset}
                isWethToken={this.props.provider.isWethToken}
                getSingleOrder={this.props.provider.getSingleOrder}
              />
            </Tabs.TabPane>
          </Tabs>
        </div>
      </div>
    );
  }

  _handleLoanTradeWithCurrentAsset = value => {
    const request = { ...value, asset: this.state.currentAsset };
    return this.props.provider.doLoanTradeWithCurrentAsset(request);
  };

  _handleLendApprove = value => {
    const request = { ...value, asset: this.state.currentAsset };
    return this.props.provider.doLendOrderApprove(request);
  };

  _handleBorrowApprove = value => {
    const request = { ...value, asset: this.state.currentAsset };
    return this.props.provider.doBorrowOrderApprove(request);
  };

  _handleQuickPositionApprove = value => {
    const request = { ...value, asset: this.state.currentAsset };
    return this.props.provider.doQuickPositionApprove(request);
  };

  _handleAccountUpdate = currentAccount => {
    this.setState({
      ...this.state,
      currentAccount: currentAccount
    });
  };

  _handleAssetsUpdate = (assets, defaultAsset) => {
    this.setState({
      ...this.state,
      assets: assets,
      currentAsset: defaultAsset
    });
  };

  _handleProviderInitFailed = msg => {
    message.error(`Widget initialisation failed: ${msg}!`);
  };
}
