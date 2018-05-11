import { Fragment } from "react";
import Button from "material-ui/Button";
import Dialog, { DialogContent } from "material-ui/Dialog";
import BigNumber from "bignumber.js";

import { fromBigNumber } from "../common/utils";
import { SectionLabel } from "../common/FormSection";

export default class WithdrawInterest extends React.Component {
  state = { showDialog: false };

  openDialog = () => this.setState({ showDialog: true });
  closeDialog = () => this.setState({ showDialog: false });

  withdrawInterest = async () => {
    const { accounts, web3, b0x, loanOrderHash, trader } = this.props;

    const txOpts = {
      from: accounts[0],
      gas: 1000000,
      gasPrice: web3.utils.toWei(`30`, `gwei`).toString()
    };

    await b0x.payInterest({
      loanOrderHash,
      trader,
      txOpts
    });
  };

  render() {
    const { showDialog } = this.state;
    const { availableForWithdrawal, symbol } = this.props;
    const currentFee = 0.1; // will likely change in the future
    const actualWithdrawalAmount = BigNumber(availableForWithdrawal)
      .times(1 - currentFee)
      .integerValue(BigNumber.ROUND_HALF_DOWN);
    return (
      <Fragment>
        <Button onClick={this.openDialog} variant="raised" color="primary">
          Withdraw
        </Button>
        <Dialog open={showDialog} onClose={this.closeDialog}>
          <DialogContent>
            <SectionLabel>Withdraw Interest</SectionLabel>
            <p>
              Currently, we are taking a fee of{` `}
              <strong>{currentFee * 100}%</strong>. This means that the actual
              withdrawal amount will be:
            </p>
            <p>
              <strong>
                {fromBigNumber(actualWithdrawalAmount, 1e18)} {symbol}
              </strong>
            </p>
            <p>Please note that the fee might change in the future.</p>
            <Button
              onClick={this.executeChange}
              variant="raised"
              color="primary"
            >
              Withdraw Interest
            </Button>
          </DialogContent>
        </Dialog>
      </Fragment>
    );
  }
}
