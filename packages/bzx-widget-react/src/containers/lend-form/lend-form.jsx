import React, { Component } from "react";
import PropTypes from "prop-types";

import Button from "antd/lib/button";
import "./../../styles/components/button/index.less";
import Checkbox from "antd/lib/checkbox/Checkbox";
import "./../../styles/components/checkbox/index.less";
import Popconfirm from "antd/lib/popconfirm";
import "./../../styles/components/popover/index.less";

import InputQty from "../../components/input-qty/input-qty";
import InputInterestRate from "../../components/input-interest-rate/input-interest-rate";
import InputDuration from "../../components/input-duration/input-duration";
import InputRatio from "../../components/input-ratio/input-ratio";
import InputRelay from "../../components/input-relay/input-relay";
import message from "antd/lib/message";

export default class LendForm extends Component {
  static propTypes = {
    stateDefaults: PropTypes.object,
    formOptions: PropTypes.object,
    onApprove: PropTypes.func
  };

  static defaultProps = {
    relaysList: [],
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
          <label>Interest Rate:</label>
          <InputInterestRate
            value={this.state.interestRate}
            onChanged={this._handleInterestRateChanged}
            min={this.props.formOptions.interestRateMin}
            max={this.props.formOptions.interestRateMax}
          />
        </div>

        <br />

        <div>
          <label>Duration (days):</label>
          <div style={{ paddingLeft: "8px", paddingRight: "12px" }}>
            <InputDuration value={this.state.duration} onChanged={this._handleDurationChanged} min={this.props.formOptions.durationMin} max={this.props.formOptions.durationMax} />
          </div>
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
          <label>Augur relays:</label>
          <InputRelay
            options={[...this.props.formOptions.relays]}
            value={this.state.relays}
            onChanged={this._handleRelaysChanged}
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

  _handleInterestRateChanged = value => {
    this.setState({ ...this.state, interestRate: value });
  };

  _handleDurationChanged = value => {
    this.setState({ ...this.state, duration: value });
  };

  _handleRatioChanged = value => {
    this.setState({ ...this.state, ratio: value });
  };

  _handleRelaysChanged = value => {
    this.setState({ ...this.state, relays: value });
  };

  _handlePushOrderOnChain = event => {
    this.setState({ ...this.state, pushOnChain: event.target.checked });
  };

  _handleApproveClicked = () => {
    this.setState({ ...this.state, isInProgress: true });

    let resultPromise = this.props.onApprove({ ...this.state });
    resultPromise
      .then(
        value => message.success(`Lend order placement was successful! TX: ${value}`),
        value => message.error(`Lend order placement failed: ${value}!`)
      );
    resultPromise
      .then(
        () => this.setState({ ...this.state, isInProgress: false }),
        () => this.setState({ ...this.state, isInProgress: false })
      );
  };
}
