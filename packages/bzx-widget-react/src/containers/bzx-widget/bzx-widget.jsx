import React, { Component } from "react";
import PropTypes from "prop-types";

import "./../../styles/components/message/index.less";
import Tabs from "antd/lib/tabs";
import "./../../styles/components/tabs/index.less";
import message from "antd/lib/message";

import BorrowForm from "../borrow-form/borrow-form";
import LendForm from "../lend-form/lend-form";
import QuickPositionForm from "../quick-position-form/quick-position-form";
import InputAsset from "../../components/input-asset/input-asset";
import { EVENT_ASSET_UPDATE, EVENT_INIT_FAILED } from "bzx-widget-common/src";

export default class BZXWidget extends Component {
  static propTypes = {
    provider: PropTypes.object,
    widgetStyles: PropTypes.object
  };

  state = {
    assets: [],
    asset: ""
  };

  constructor(props) {
    super(props);

    this.state = { assets: this.props.provider.assets, asset: this.props.provider.defaultAsset };
    this.props.provider.eventEmitter.on(EVENT_ASSET_UPDATE, this._handleAssetsUpdate.bind(this));
    this.props.provider.eventEmitter.on(EVENT_INIT_FAILED, this._handleProviderInitFailed.bind(this));
  }

  assetChanged = value => {
    this.setState({ ...this.state, asset: value });
  };

  render() {
    return (
      <div style={this.props.widgetStyles}>
        <div>
          <InputAsset options={this.state.assets} value={this.state.asset} onChanged={this.assetChanged} />
        </div>
        <div>
          <Tabs defaultActiveKey="1">
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
            <Tabs.TabPane tab="My orders" key="4">

            </Tabs.TabPane>
          </Tabs>
        </div>
      </div>
    );
  }

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
      assets: assets,
      asset: defaultAsset
    });
  };

  _handleProviderInitFailed = (msg) => {
    message.error(`Widget initialisation failed: ${msg}!`)
  }
}
