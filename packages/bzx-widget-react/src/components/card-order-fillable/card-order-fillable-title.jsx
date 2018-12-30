import React, { Component } from "react";
import PropTypes from "prop-types";

export default class CardOrderFillableTitle extends Component {
  static propTypes = {
    isAsk: PropTypes.bool,
    data: PropTypes.object,
    doLoanOrderTake: PropTypes.func,
    getTokenNameFromAddress: PropTypes.func,
    getMarginLevels: PropTypes.func,
    getProfitOrLoss: PropTypes.func
  };

  styleRowType = {
    width: "24px",
    height: "24px",
    float: "left",
    verticalAlign: "middle"
  };

  styleColumnAmount = {
    width: "15%",
    height: "24px",
    float: "left",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    verticalAlign: "middle"
  };

  styleColumnDate = {
    width: "35%",
    height: "24px",
    float: "left",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    verticalAlign: "middle"
  };

  styleColumnButton = {
    width: "20%",
    float: "left"
  };

  constructor(props) {
    super(props);

    this.state = {};
  }

  render() {
    return (
      <div style={{ height: "32px" }}>
        <div style={this.styleRowType}>&nbsp;</div>
        <div style={this.styleColumnAmount}>Interest:</div>
        <div style={this.styleColumnAmount}>Amount:</div>
        <div style={this.styleColumnDate}>Expires:</div>
        <div style={this.styleColumnButton}>&nbsp;</div>
      </div>
    );
  }
}
