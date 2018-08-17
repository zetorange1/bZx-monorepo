import { Fragment } from "react";
import styled from "styled-components";
import Button from "material-ui/Button";
import Dialog, { DialogContent } from "material-ui/Dialog";
import BigNumber from "bignumber.js";

import { fromBigNumber } from "../common/utils";
import { SectionLabel } from "../common/FormSection";

const TxHashLink = styled.a.attrs({
  target: `_blank`,
  rel: `noopener noreferrer`
})`
  font-family: monospace;
  display: block;
  text-overflow: ellipsis;
  overflow: auto;
}
`;

export default class WithdrawInterest extends React.Component {
  state = { showDialog: false };

  openDialog = () => this.setState({ showDialog: true });
  closeDialog = () => this.setState({ showDialog: false });

  withdrawInterest = async () => {
    const { accounts, web3, bZx, loanOrderHash, trader } = this.props;

    const txOpts = {
      from: accounts[0],
      gas: 1000000,
      gasPrice: web3.utils.toWei(`5`, `gwei`).toString()
    };

    if (bZx.portalProviderName !== `MetaMask`) {
      alert(`Please confirm this transaction on your device.`);
    }

    const txObj = await bZx.payInterest({
      loanOrderHash,
      trader,
      getObject: true,
      txOpts
    });

    try {
      await txObj
        .estimateGas(txOpts)
        .then(gas => {
          console.log(gas);
          txOpts.gas = window.gasValue(gas);
          txObj
            .send(txOpts)
            .once(`transactionHash`, hash => {
              alert(`Transaction submitted, transaction hash:`, {
                component: () => (
                  <TxHashLink href={`${bZx.etherscanURL}tx/${hash}`}>
                    {hash}
                  </TxHashLink>
                )
              });
            })
            .then(() => {
              alert(`Execution complete.`);
              this.closeDialog();
            })
            .catch(error => {
              console.error(error);
              alert(
                `We were not able to execute your transaction at this time.`
              );
              this.closeDialog();
            });
        })
        .catch(error => {
          console.error(error);
          alert(`The transaction is failing. Please try again later.`);
          this.closeDialog();
        });
    } catch (error) {
      console.error(error);
      alert(`The transaction is failing. Please try again later.`);
      this.closeDialog();
    }
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
        <Button
          onClick={this.openDialog}
          variant="raised"
          color="primary"
          disabled={!BigNumber(availableForWithdrawal).gt(0)}
        >
          Withdraw
        </Button>
        <Dialog open={showDialog} onClose={this.closeDialog}>
          <DialogContent>
            <SectionLabel>Withdraw Interest</SectionLabel>
            <p>
              Currently, we are taking a fee of{` `}
              <strong>{currentFee * 100}%</strong>. This means that the actual
              withdrawal amount will be at least:
            </p>
            <p>
              <strong>
                {fromBigNumber(actualWithdrawalAmount, 1e18)} {symbol}
              </strong>
            </p>
            <p>Please note that the fee might change in the future.</p>
            <Button
              onClick={this.withdrawInterest}
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
