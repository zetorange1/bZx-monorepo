import React, { Component } from "react";
import PropTypes from "prop-types";

import Tabs from "antd/es/tabs";
import "antd/es/tabs/style/index.css";

import BorrowForm from "../borrow-form/borrow-form";
import LendForm from "../lend-form/lend-form";
import QuickPositionForm from "../quick-position-form/quick-position-form";
import InputAsset from "../../components/input-asset/input-asset";
import DummyProvider from "../../providers/dummy_provider";

export default class BZXWidget extends Component {
  static propTypes = {
    provider: PropTypes.object
  };

  static defaultProps = {
    provider: new DummyProvider()
  };

  widgetStyles = {
    padding: "20px",
    margin: "20px",
    width: "480px",
  };

  state = {
    asset: "eth",
  };

  assetChanged = value => {
    this.setState({ ...this.state, asset: value });
  };

  render() {
    return (
      <div style={this.widgetStyles}>
        <div>
          <InputAsset value={this.state.asset} onChanged={this.assetChanged} />
        </div>
        <div>
          <Tabs defaultActiveKey="1">
            <Tabs.TabPane tab="Lend" key="1">
              <LendForm onApprove={this._handleLendApprove} />
            </Tabs.TabPane>
            <Tabs.TabPane tab="Borrow" key="2">
              <BorrowForm  onApprove={this._handleBorrowApprove} />
            </Tabs.TabPane>
            <Tabs.TabPane tab="Quick position" key="3">
              <QuickPositionForm  onApprove={this._handleQuickPositionApprove} />
            </Tabs.TabPane>
          </Tabs>
        </div>
      </div>
    );
  }

  _handleLendApprove = value => {
    const request = { ...value, asset: this.state.asset };
    this.props.provider.onLendOrderApprove(request, value => console.log(`Widget LendApprove callback TX: ${value}`));
  };

  _handleBorrowApprove = value => {
    const request = { ...value, asset: this.state.asset };
    this.props.provider.onBorrowOrderApprove(request, value => console.log(`Widget BorrowApprove callback TX: ${value}`));
  };

  _handleQuickPositionApprove = value => {
    const request = { ...value, asset: this.state.asset };
    this.props.provider.onQuickPositionApprove(request, value => console.log(`Widget LendApprove callback TX: ${value}`));
  };
}
