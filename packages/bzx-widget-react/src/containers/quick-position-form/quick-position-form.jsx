import React, { Component } from "react";
import PropTypes from "prop-types";

import Button from "antd/lib/button";
import "./../../styles/components/button/index.less";
import Checkbox from "antd/lib/checkbox/Checkbox";
import "./../../styles/components/checkbox/index.less";
import Popconfirm from "antd/lib/popconfirm";
import "./../../styles/components/popover/index.less";

import InputQty from "../../components/input-qty/input-qty";
import InputRatio from "../../components/input-ratio/input-ratio";
import InputPositionType from "../../components/input-position-type/input-position-type";
import message from "antd/lib/message";

export default class QuickPositionForm extends Component {
  static propTypes = {
    stateDefaults: PropTypes.object,
    formOptions: PropTypes.object,
    onApprove: PropTypes.func
  };

  static defaultProps = {
    onApprove: () => {}
  };

  constructor(props) {
    super(props);

    this.state = { ...props.stateDefaults, isInProgress: false };
  }

  render() {
    return (
      <div>
        <div>
          <label>Quantity:</label>
          <InputQty value={this.state.qty} onChanged={this._handleQtyChanged} />
        </div>

        <br />

        <div>
          <label>Position Type:</label>
          <InputPositionType value={this.state.positionType} onChanged={this._handlePositionTypeChanged} />
        </div>

        <br />

        <div>
          <InputRatio
            options={[...this.props.formOptions.ratios]}
            value={this.state.ratio}
            onChanged={this._handleRatioChanged}
          />
        </div>

        <br />

        <div>
          <Checkbox checked={this.state.pushOnChain} onChange={this._handlePushOrderOnChain}>
            Push order on-chain
          </Checkbox>
        </div>

        <br />

        <div>
          <Popconfirm placement="topRight" title="This will start operations that will affect your balance!" onConfirm={this._handleApproveClicked} okText="Yes, I agree" cancelText="No, I don't agree">
            <Button type="primary" block loading={this.state.isInProgress}>
              Approve
            </Button>
          </Popconfirm>
        </div>
      </div>
    );
  }

  _handleQtyChanged = value => {
    this.setState({ ...this.state, qty: value });
  };

  _handlePositionTypeChanged = value => {
    this.setState({ ...this.state, positionType: value });
  };

  _handleRatioChanged = value => {
    this.setState({ ...this.state, ratio: value });
  };

  _handlePushOrderOnChain = event => {
    this.setState({ ...this.state, pushOnChain: event.target.checked });
  };

  _handleApproveClicked = () => {
    this.setState({ ...this.state, isInProgress: true });

    let resultPromise = this.props.onApprove({ ...this.state });
    resultPromise
      .then(
        value => message.success(`Quick position placement was successful! TX: ${value}`),
        value => message.error(`Quick position placement failed: ${value}!`)
      );
    resultPromise
      .then(
        () => this.setState({ ...this.state, isInProgress: false }),
        () => this.setState({ ...this.state, isInProgress: false })
      );
  };
}
