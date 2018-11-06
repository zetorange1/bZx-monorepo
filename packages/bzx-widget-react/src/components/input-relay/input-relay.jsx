import React, { Component } from "react";
import PropTypes from "prop-types";

import Checkbox from "antd/lib/checkbox";
import "antd/lib/checkbox/style/index.css";

export default class InputRelay extends Component {
  static propTypes = {
    options: PropTypes.arrayOf(PropTypes.string),
    defaultValue: PropTypes.arrayOf(PropTypes.string),
    value: PropTypes.arrayOf(PropTypes.string),
    onChanged: PropTypes.func
  };

  static defaultProps = {
    options: [],
    defaultValue: [],
    value: [],
    onChanged: () => {}
  };

  constructor(props) {
    super(props);

    this.state = {
      value: props.value,
      indeterminate: false,
      checkAll: false
    };
  }

  componentWillReceiveProps(nextProps) {
    this.setState({
      value: nextProps.value,
      indeterminate: !!nextProps.value.length && nextProps.value.length < nextProps.options.length,
      checkAll: nextProps.value.length === nextProps.options.length
    });
  }

  render() {
    return (
      <div>
        <div style={{ borderBottom: "1px solid #E9E9E9" }}>
          <Checkbox
            indeterminate={this.state.indeterminate}
            onChange={this._handlerOnCheckAll}
            checked={this.state.checkAll}
          >
            Check all
          </Checkbox>
        </div>
        <br />
        <Checkbox.Group options={this.props.options} value={this.state.value} onChange={this._handlerOnChange} />
      </div>
    );
  }

  _handlerOnChange = nextValue => {
    this.setState(
      {
        value: nextValue,
        indeterminate: !!nextValue.length && nextValue.length < this.props.options.length,
        checkAll: nextValue.length === this.props.options.length
      },
      () => this.props.onChanged(this.state.value)
    );
  };

  _handlerOnCheckAll = event => {
    this.setState(
      {
        value: event.target.checked ? this.props.options : [],
        indeterminate: false,
        checkAll: event.target.checked
      },
      () => this.props.onChanged(this.state.value)
    );
  };
}
