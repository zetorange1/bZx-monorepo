import React, { Component } from "react";
import PropTypes from "prop-types";

import Select from "antd/lib/select";
import "antd/lib/select/style/index.css";

export default class InputPositionType extends Component {
  static propTypes = {
    value: PropTypes.oneOf(["long", "short"]),
    onChanged: PropTypes.func
  };

  static defaultProps = {
    value: "short",
    onChanged: () => {}
  };

  options = [{ id: "long", text: "Leverage Long" }, { id: "short", text: "Leverage Short" }];

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
      <Select name="positionType" value={this.state.value} onChange={this._handleOnChange}>
        {this.options.map(item => (
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
