import React, { Component } from "react";
import PropTypes from "prop-types";

import Radio from "antd/lib/radio";
import "./../../styles/components/radio/index.less";

export default class InputRatio extends Component {
  static propTypes = {
    options: PropTypes.arrayOf(PropTypes.number),
    value: PropTypes.number,
    onChanged: PropTypes.func
  };

  static defaultProps = {
    options: [1, 2, 3],
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
      <Radio.Group value={this.state.value} onChange={this._handlerOnChange}>
        {this.props.options.map(item => (
          <Radio.Button key={item} value={item}>
            {item}X
          </Radio.Button>
        ))}
      </Radio.Group>
    );
  }

  _handlerOnChange = event => {
    this.setState({ value: event.target.value }, () => this.props.onChanged(this.state.value));
  };
}
