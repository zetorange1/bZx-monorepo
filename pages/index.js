import React from "react";
import Router from "next/router";

export default class Index extends React.Component {
  componentDidMount() {
    Router.push(`/balances`);
  }
  render() {
    return null;
  }
}
