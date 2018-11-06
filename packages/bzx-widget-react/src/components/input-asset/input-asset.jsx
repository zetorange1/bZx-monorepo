import React, { Component } from "react";
import PropTypes from "prop-types";

import Select from "antd/lib/select";
import "antd/lib/select/style/index.css";

export default class InputAsset extends Component {
  static propTypes = {
    options: PropTypes.array,
    value: PropTypes.string,
    onChanged: PropTypes.func
  };

  static defaultProps = {
    options: [{ id: "eth", text: "ETH" }],
    value: "eth",
    onChanged: () => {}
  };

  options = [{ id: null, text: "" }];

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
      <Select name="assets" value={this.state.value} onChange={this._handleOnChange}>
        {this.options.map(item => (
          <Select.Option key={item.id} value={item.id}>
            {item.text}
          </Select.Option>
        ))}
        {this.props.options.map(item => (
          <Select.Option key={item.id} value={item.id}>
            {item.text}
          </Select.Option>
        ))}
      </Select>
    );
  }

  _handleOnChange = value => {
    this.setState({ value: value }, () => this.props.onChanged(this.state.value));
  };
}
