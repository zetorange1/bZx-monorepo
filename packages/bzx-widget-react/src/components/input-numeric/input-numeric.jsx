import React, { Component } from "react";

export default class InputNumeric extends Component {
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
        <input type="number" value={this.state.value} onChange={this._handleInputOnChange} step="any" />
        <button onClick={this._handleButtonResetOnClick}>x</button>
      </div>
    );
  }

  _handleInputOnChange = event => {
    if (event.target.validity.valid) {
      this.setState({ value: event.target.value }, () => this.props.onChanged(this.state.value));
    }
  };

  _handleButtonResetOnClick = () => {
    this.setState({ value: "0" });
  };
}
