import { Fragment } from "react";
import Button from "@material-ui/core/Button";
import { Menu, MenuItem } from "@material-ui/core";

import ChangeCollateralDialog from "./ChangeCollateralDialog";
import DepositCollateralDialog from "./DepositCollateralDialog";
import WithdrawCollateralDialog from "./WithdrawCollateralDialog";
import DepositPositionDialog from "./DepositPositionDialog";

export default class LoanMaintenance extends React.Component {
  state = {
    anchorEl: null,
    showChangeCollateralDialog: false,
    showDepositCollateralDialog: false,
    showWithdrawCollateralDialog: false,
    showDepositPositionDialog: false,
  };

  handleClick = event => {
    this.setState({ anchorEl: event.currentTarget });
  };

  handleClose = () => {
    this.setState({ anchorEl: null });
  };

  handleChangeCollateralClick = () => {
    this.handleClose();
    this.setState({ showChangeCollateralDialog: true });
  };

  handleDepositCollateralClick = () => {
    this.handleClose();
    this.setState({ showDepositCollateralDialog: true });
  };

  handleWithdrawCollateralClick = () => {
    this.handleClose();
    this.setState({ showWithdrawCollateralDialog: true });
  };

  handleDepositPositionClick = () => {
    this.handleClose();
    this.setState({ showDepositPositionDialog: true });
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
      collateralToken,
      collateralExcess,
      positionToken,
      currentMarginAmount,
      positionTokenAmountFilled,
      initialMarginAmount
    } = this.props;
    return (
      <Fragment>
        <Button variant="raised" onClick={this.handleClick}>
          Loan Maintenance
        </Button>
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={this.handleClose}
        >
          <MenuItem onClick={this.handleChangeCollateralClick}>
            Change collateral token
          </MenuItem>
          <MenuItem onClick={this.handleDepositCollateralClick}>
            Deposit additional collateral
          </MenuItem>
          <MenuItem onClick={this.handleWithdrawCollateralClick}>
            Withdraw collateral
          </MenuItem>
          <hr style={{width: `90%`}} />
          <MenuItem onClick={this.handleDepositPositionClick}>
            Deposit loan token
          </MenuItem>
        </Menu>
        <ChangeCollateralDialog
          open={this.state.showChangeCollateralDialog}
          onClose={this.closeDialog(`showChangeCollateralDialog`)}
          bZx={bZx}
          web3={web3}
          tokens={tokens}
          accounts={accounts}
          loanOrderHash={loanOrderHash}
        />
        <DepositCollateralDialog
          open={this.state.showDepositCollateralDialog}
          onClose={this.closeDialog(`showDepositCollateralDialog`)}
          bZx={bZx}
          web3={web3}
          tokens={tokens}
          accounts={accounts}
          loanOrderHash={loanOrderHash}
          collateralToken={collateralToken}
        />
        <WithdrawCollateralDialog
          open={this.state.showWithdrawCollateralDialog}
          onClose={this.closeDialog(`showWithdrawCollateralDialog`)}
          bZx={bZx}
          web3={web3}
          tokens={tokens}
          accounts={accounts}
          collateralToken={collateralToken}
          collateralExcess={collateralExcess}
          loanOrderHash={loanOrderHash}
        />
        <DepositPositionDialog
          open={this.state.showDepositPositionDialog}
          onClose={this.closeDialog(`showDepositPositionDialog`)}
          bZx={bZx}
          web3={web3}
          tokens={tokens}
          accounts={accounts}
          loanOrderHash={loanOrderHash}
          positionToken={positionToken}
        />
      </Fragment>
    );
  }
}
