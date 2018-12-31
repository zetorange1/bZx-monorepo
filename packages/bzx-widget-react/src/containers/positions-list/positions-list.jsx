import React, { Component } from "react";
import PropTypes from "prop-types";

import Button from "antd/lib/button";
import "./../../styles/components/button/index.less";
import message from "antd/lib/message";
import "./../../styles/components/message/index.less";
import Pagination from "antd/lib/pagination";
import "./../../styles/components/pagination/index.less";
import CardPosition from "../../components/card-position/card-position";
import Scrollbar from "react-scrollbars-custom";
import { EVENT_ASSET_SELECTED } from "@bzxnetwork/bzx-widget-common";

export default class PositionsList extends Component {
  static propTypes = {
    listLoansActive: PropTypes.func,
    onLoanOrderCancel: PropTypes.func,
    onLoanClose: PropTypes.func,
    onLoanTradeWithCurrentAsset: PropTypes.func,
    getTokenNameFromAddress: PropTypes.func,
    getMarginLevels: PropTypes.func,
    getPositionOffset: PropTypes.func,
    getAccount: PropTypes.func,
    widgetEventEmitter: PropTypes.object,
    getCurrentAsset: PropTypes.func,
    isWethToken: PropTypes.func,
    listSize: PropTypes.number,
    getSingleOrder: PropTypes.func
  };

  static defaultProps = {
    listLoansActive: () => [],
    onLoanOrderCancel: () => {},
    onLoanClose: () => {},
    LoanTradeWithCurrentAsset: () => {},
    listSize: 100
  };

  constructor(props) {
    super(props);

    this.state = { ...props.stateDefaults, pageSize: 3, positions: [], currentPage: 1, currentAsset: "" };
  }

  componentDidMount() {
    const currentAsset = this.props.getCurrentAsset();
    this.setState({ ...this.state, currentAsset: currentAsset });

    this.props.widgetEventEmitter.on(EVENT_ASSET_SELECTED, this._handleAssetSelect.bind(this));

    this.props.listLoansActive(this.props.listSize).then(result => {
      this.setState({ ...this.state, positions: result });
    });
  }

  render() {
    return (
      <div>
        <div>
          <Button icon="reload" onClick={this._handleReload} />
          &nbsp; My orders
        </div>
        <br />
        <Scrollbar noScrollX style={{ minHeight: 250, maxHeight: 400 }}>
          {this.renderItems()}
        </Scrollbar>
        <br />
        <div>
          <Pagination
            size="small"
            defaultCurrent={1}
            current={this.state.currentPage}
            pageSize={this.state.pageSize}
            total={this.state.positions.length}
            onChange={this._handlePageChange}
          />
        </div>
      </div>
    );
  }

  renderItems() {
    let skip = this.state.pageSize * (this.state.currentPage - 1);
    let takeUpTo = this.state.pageSize * this.state.currentPage;
    return this.state.positions
      .slice(skip, takeUpTo)
      .map(e => (
        <CardPosition
          key={e.loanOrderHash}
          data={e}
          onLoanOrderCancel={this.props.onLoanOrderCancel}
          onLoanClose={this.props.onLoanClose}
          onLoanTradeWithCurrentAsset={this.props.onLoanTradeWithCurrentAsset}
          getTokenNameFromAddress={this.props.getTokenNameFromAddress}
          getMarginLevels={this.props.getMarginLevels}
          getPositionOffset={this.props.getPositionOffset}
          getAccount={this.props.getAccount}
          currentAsset={this.state.currentAsset}
          isWethToken={this.props.isWethToken}
          getSingleOrder={this.props.getSingleOrder}
        />
      ));
  }

  _handlePageChange = value => {
    this.setState({ ...this.state, currentPage: value });
  };

  _handleReload = () => {
    let reloadPromise = this.props.listLoansActive(this.props.listSize);

    reloadPromise.then(result => {
      this.setState({ ...this.state, positions: result });
    });

    reloadPromise.then(result => {
      message.success("List of positions has been successfully updated");
    });
  };

  _handleAssetSelect = value => {
    this.setState({ ...this.state, currentAsset: value });
  };
}
