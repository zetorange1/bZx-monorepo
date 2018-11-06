import React, { Component } from "react";
import PropTypes from "prop-types";

import InputNumber from "antd/lib/input-number";
import "antd/lib/input-number/style/index.css";

export default class InputInterestRate extends Component {
  static propTypes = {
    min: PropTypes.number,
    max: PropTypes.number,
    defaultValue: PropTypes.number,
    value: PropTypes.number,
    onChanged: PropTypes.func
  };

  static defaultProps = {
    min: 1,
    max: 20,
    defaultValue: 10,
    value: 1,
    onChanged: () => {}
  };

  constructor(props) {
    super(props);

    this.state = {
      value: props.value
    };
  }

  componentWillReceiveProps(nextProps) {
    this.setState({
      value: nextProps.value
    });
  }

  render() {
    return (
      <div>
        <InputNumber
          min={this.props.min}
          max={this.props.max}
          defaultValue={this.props.defaultValue}
          value={this.state.value}
          formatter={value => `${value}%`}
          parser={value => value.replace("%", "")}
          onChange={this._handleInputOnChange}
        />
      </div>
    );
  }

  _handleInputOnChange = value => {
    this.setState({ value: value }, () => this.props.onChanged(this.state.value));
  };
}
