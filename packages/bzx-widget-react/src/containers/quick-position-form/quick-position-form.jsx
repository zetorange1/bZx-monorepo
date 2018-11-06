import React, { Component } from "react";
import PropTypes from "prop-types";

import Button from "antd/lib/button";
import "antd/lib/button/style/index.css";
import Checkbox from "antd/lib/checkbox/Checkbox";
import "antd/lib/checkbox/style/index.css";

import InputQty from "../../components/input-qty/input-qty";
import InputRatio from "../../components/input-ratio/input-ratio";
import InputPositionType from "../../components/input-position-type/input-position-type";

export default class QuickPositionForm extends Component {
  static propTypes = {
    onApprove: PropTypes.func
  };

  static defaultProps = {
    onApprove: () => {}
  };

  constructor(props) {
    super(props);

    this.state = {
      qty: "1",
      positionType: "long",
      ratio: 2,
      pushOnChain: false
    };
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
          <InputRatio options={[1, 2, 3]} value={this.state.ratio} onChanged={this._handleRatioChanged} />
        </div>

        <br />

        <div>
          <Checkbox value={this.state.pushOnChain} onChange={this._handlePushOrderOnChain}>
            Push order on-chain
          </Checkbox>
        </div>

        <br />

        <div>
          <Button type="primary" block onClick={this._handleApproveClicked}>Approve</Button>
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

  _handlePushOrderOnChain = value => {
    this.setState({ ...this.state, pushOnChain: value });
  };

  _handleApproveClicked = () => {
    this.props.onApprove(this.state);
  };
}
