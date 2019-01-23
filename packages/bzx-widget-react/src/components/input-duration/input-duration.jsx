import React, { Component } from "react";
import PropTypes from "prop-types";

import Slider from "antd/lib/slider";
import "./../../styles/components/slider/index.less";
import "./../../styles/components/tooltip/index.less";

export default class InputDuration extends Component {
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
      <Slider
        defaultValue={this.props.defaultValue}
        min={this.props.min}
        max={this.props.max}
        onChange={this._handlerOnChange}
        value={typeof this.state.value === "number" ? this.state.value : 0}
      />
    );
  }

  _handlerOnChange = value => {
    this.setState({ value: value }, () => this.props.onChanged(this.state.value));
  };
}
