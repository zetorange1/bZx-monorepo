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
import { EVENT_ASSET_UPDATE, EVENT_INIT_FAILED, EVENT_ASSET_SELECTED } from "@bzxnetwork/bzx-widget-common";
import EventEmitter from "events";

export default class BZXWidget extends Component {
  static propTypes = {
    provider: PropTypes.object,
    widgetStyles: PropTypes.object
  };

  state = {
    assets: [],
    asset: ""
  };

  widgetEventEmitter = new EventEmitter();

  constructor(props) {
    super(props);

    this.state = { assets: this.props.provider.assets, asset: this.props.provider.defaultAsset };
    this.props.provider.eventEmitter.on(EVENT_ASSET_UPDATE, this._handleAssetsUpdate.bind(this));
    this.props.provider.eventEmitter.on(EVENT_INIT_FAILED, this._handleProviderInitFailed.bind(this));

    this.widgetEventEmitter.emit(EVENT_ASSET_SELECTED, this.props.provider.defaultAsset);
  }

  assetChanged = value => {
    this.setState({ ...this.state, asset: value });
    this.widgetEventEmitter.emit(EVENT_ASSET_SELECTED, value);
  };

  render() {
    return (
      <div style={this.props.widgetStyles}>
        <div>
          <InputAsset options={this.state.assets} value={this.state.asset} onChanged={this.assetChanged} />
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
                doLoanOrderTake={this.props.provider.doLoanOrderTake}
                listLoanOrdersBidsAvailable={this.props.provider.listLoanOrdersBidsAvailable}
                listLoanOrdersAsksAvailable={this.props.provider.listLoanOrdersAsksAvailable}
                getTokenNameFromAddress={this.props.provider.getTokenNameFromAddress}
                getMarginLevels={this.props.provider.getMarginLevels}
                getProfitOrLoss={this.props.provider.getProfitOrLoss}
                getAccount={this.props.provider.getAccount}
                widgetEventEmitter={this.widgetEventEmitter}
                getCurrentAsset={this.getCurrentAsset}
              />
            </Tabs.TabPane>
            <Tabs.TabPane tab="My orders" key="5">
              <PositionsList
                onLoanOrderCancel={this.props.provider.doLoanOrderCancel}
                onLoanClose={this.props.provider.doLoanClose}
                onLoanTradeWithCurrentAsset={this._handleLoanTradeWithCurrentAsset}
                listLoansActive={this.props.provider.listLoansActive}
                getTokenNameFromAddress={this.props.provider.getTokenNameFromAddress}
                getMarginLevels={this.props.provider.getMarginLevels}
                getProfitOrLoss={this.props.provider.getProfitOrLoss}
                getAccount={this.props.provider.getAccount}
                widgetEventEmitter={this.widgetEventEmitter}
                getCurrentAsset={this.getCurrentAsset}
                isWethToken={this.props.provider.isWethToken}
                getSingleOrder={this.props.provider.getSingleOrder}
              />
            </Tabs.TabPane>
          </Tabs>
        </div>
      </div>
    );
  }

  getCurrentAsset = () => {
    return this.state.asset;
  };

  _handleLoanTradeWithCurrentAsset = value => {
    const request = { ...value, asset: this.state.asset };
    return this.props.provider.doLoanTradeWithCurrentAsset(request);
  };

  _handleLendApprove = value => {
    const request = { ...value, asset: this.state.asset };
    return this.props.provider.doLendOrderApprove(request);
  };

  _handleBorrowApprove = value => {
    const request = { ...value, asset: this.state.asset };
    return this.props.provider.doBorrowOrderApprove(request);
  };

  _handleQuickPositionApprove = value => {
    const request = { ...value, asset: this.state.asset };
    return this.props.provider.doQuickPositionApprove(request);
  };

  _handleAssetsUpdate = (assets, defaultAsset) => {
    this.setState({
      ...this.state,
      assets: assets,
      asset: defaultAsset
    });
  };

  _handleProviderInitFailed = msg => {
    message.error(`Widget initialisation failed: ${msg}!`);
  };
}
