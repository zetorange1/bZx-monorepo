import React, { Component } from "react";
import PropTypes from "prop-types";

import Tabs from "antd/es/tabs";
import "./../../styles/components/tabs/index.less";

import BorrowForm from "../borrow-form/borrow-form";
import LendForm from "../lend-form/lend-form";
import QuickPositionForm from "../quick-position-form/quick-position-form";
import InputAsset from "../../components/input-asset/input-asset";

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
    this.props.provider.onAssetsUpdate = this._handleAssetsUpdate.bind(this);
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
            <Tabs.TabPane tab="Lend" key="1">
              <LendForm
                onApprove={this._handleLendApprove}
                stateDefaults={this.props.provider.getLendFormDefaults()}
                formOptions={this.props.provider.getLendFormOptions()}
              />
            </Tabs.TabPane>
            <Tabs.TabPane tab="Borrow" key="2">
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
          </Tabs>
        </div>
      </div>
    );
  }

  _handleLendApprove = value => {
    const request = { ...value, asset: this.state.asset };
    this.props.provider.doLendOrderApprove(request, value => console.log(`Widget LendApprove callback TX: ${value}`));
  };

  _handleBorrowApprove = value => {
    const request = { ...value, asset: this.state.asset };
    this.props.provider.doBorrowOrderApprove(request, value =>
      console.log(`Widget BorrowApprove callback TX: ${value}`)
    );
  };

  _handleQuickPositionApprove = value => {
    const request = { ...value, asset: this.state.asset };
    this.props.provider.doQuickPositionApprove(request, value =>
      console.log(`Widget LendApprove callback TX: ${value}`)
    );
  };

  _handleAssetsUpdate = (assets, defaultAsset) => {
    this.setState({
      assets: assets,
      asset: defaultAsset
    });
  };
}
