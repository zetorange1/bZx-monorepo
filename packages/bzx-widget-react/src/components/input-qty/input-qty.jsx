import React, { Component } from "react";
import PropTypes from "prop-types";

import Input from "antd/lib/input";
import "./../../styles/components/input/index.less";

export default class InputQty extends Component {
  static propTypes = {
    defaultValue: PropTypes.string,
    value: PropTypes.string,
    onChanged: PropTypes.func
  };

  static defaultProps = {
    defaultValue: "10",
    value: "1",
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
      <Input defaultValue={this.props.defaultValue} value={this.state.value} onChange={this._handleInputOnChange} />
    );
  }

  _handleInputOnChange = event => {
    this.setState({ value: event.target.value }, () => this.props.onChanged(this.state.value));
  };
}
