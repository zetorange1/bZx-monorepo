import { Fragment } from "react";
import Button from "@material-ui/core/Button";
import { Menu, MenuItem } from "@material-ui/core";
import Trade0xDialog from "./Trade0xDialog";
import TradeOracleDialog from "./TradeOracleDialog";

export default class TradeOptions extends React.Component {
  state = {
    anchorEl: null,
    show0xDialog: false,
    showOracleDialog: false
  };

  handleClick = event => {
    this.setState({ anchorEl: event.currentTarget });
  };

  handleClose = () => {
    this.setState({ anchorEl: null });
  };

  handle0xTradeClick = () => {
    this.handleClose();
    this.setState({ show0xDialog: true });
  };

  handleOracleTradeClick = () => {
    this.handleClose();
    this.setState({ showOracleDialog: true });
  };

  closeDialog = stateProp => () => this.setState({ [stateProp]: false });

  render() {
    const { anchorEl } = this.state;
    const {
      bZx,
      tokens,
      accounts,
      web3,
      loanOrderHash,
      order,
      positionTokenAddressFilled,
      positionTokenAmountFilled,
      getSingleOrder
    } = this.props;
    return (
      <Fragment>
        <Button
          variant="raised"
          onClick={this.handleClick}
          style={{ marginLeft: `auto` }}
        >
          Execute a Trade
        </Button>
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={this.handleClose}
        >
          <MenuItem onClick={this.handle0xTradeClick}>With a 0x V2 order</MenuItem>
          <MenuItem onClick={this.handleOracleTradeClick}>
            With the Kyber oracle
          </MenuItem>
        </Menu>
        <Trade0xDialog
          open={this.state.show0xDialog}
          onClose={this.closeDialog(`show0xDialog`)}
          bZx={bZx}
          web3={web3}
          tokens={tokens}
          accounts={accounts}
          loanOrderHash={loanOrderHash}
        />
        <TradeOracleDialog
          open={this.state.showOracleDialog}
          onClose={this.closeDialog(`showOracleDialog`)}
          bZx={bZx}
          web3={web3}
          tokens={tokens}
          accounts={accounts}
          loanOrderHash={loanOrderHash}
          order={order}
          getSingleOrder={getSingleOrder}
          positionTokenAddressFilled={positionTokenAddressFilled}
          positionTokenAmountFilled={positionTokenAmountFilled}
        />
      </Fragment>
    );
  }
}
