import React, { Component } from "react";

export default class CardOrderFillableTitle extends Component {
  styleColumnRowType = {
    width: 24,
    height: 24,
    float: "left",
    verticalAlign: "middle"
  };

  styleColumnAmount = {
    width: 72,
    height: 24,
    float: "left",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    verticalAlign: "middle"
  };

  styleColumnDate = {
    width: 140,
    height: 24,
    float: "left",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    verticalAlign: "middle"
  };

  styleColumnButton = {
    width: 80,
    float: "left"
  };

  constructor(props) {
    super(props);

    this.state = {};
  }

  render() {
    return (
      <div style={{ height: "24px", width: "400px" }}>
        <div style={this.styleColumnRowType}>&nbsp;</div>
        <div style={this.styleColumnAmount}>Interest:</div>
        <div style={this.styleColumnAmount}>Amount:</div>
        <div style={this.styleColumnDate}>Expires:</div>
        <div style={this.styleColumnButton}>&nbsp;</div>
      </div>
    );
  }
}
