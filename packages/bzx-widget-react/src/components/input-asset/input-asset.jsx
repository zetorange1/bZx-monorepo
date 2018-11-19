import React, { Component } from "react";
import PropTypes from "prop-types";

import Select from "antd/lib/select";
import "./../../styles/components/select/index.less";

export default class InputAsset extends Component {
  static propTypes = {
    options: PropTypes.array,
    value: PropTypes.string,
    onChanged: PropTypes.func
  };

  static defaultProps = {
    options: [],
    value: "",
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
      <Select name="assets" value={this.state.value} onChange={this._handleOnChange} style={{ width: "100%" }}>
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
