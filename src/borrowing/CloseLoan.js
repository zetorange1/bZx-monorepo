import { Fragment } from "react";
import styled from "styled-components";
import Button from "material-ui/Button";
import Dialog, { DialogContent } from "material-ui/Dialog";
import { SectionLabel } from "../common/FormSection";

const TxHashLink = styled.a.attrs({
  target: `_blank`,
  rel: `noopener noreferrer`
})`
  font-family: monospace;
  display: block;
  text-overflow: ellipsis;
  overflow: auto;
`;

export default class CloseLoan extends React.Component {
  state = { showDialog: false };

  openDialog = () => this.setState({ showDialog: true });
  closeDialog = () => this.setState({ showDialog: false });

  closeLoan = async () => {
    const { b0x, web3, accounts, loanOrderHash } = this.props;

    const txOpts = {
      from: accounts[0],
      gas: 1000000,
      gasPrice: web3.utils.toWei(`30`, `gwei`).toString()
    };

    await b0x
      .closeLoan({
        loanOrderHash,
        txOpts
      })
      .once(`transactionHash`, hash => {
        alert(`Transaction submitted, transaction hash:`, {
          component: () => (
            <TxHashLink href={`${b0x.etherscanURL}tx/${hash}`}>
              {hash}
            </TxHashLink>
          )
        });
      })
      .on(`error`, error => {
        console.error(error);
        alert(`We were not able to close your loan.`);
        this.closeDialog();
      });
    alert(`Loan close execution complete.`);
    this.closeDialog();
  };

  render() {
    return (
      <Fragment>
        <Button
          onClick={this.openDialog}
          variant="raised"
          style={{ marginLeft: `12px` }}
        >
          Close Loan
        </Button>
        <Dialog open={this.state.showDialog} onClose={this.closeDialog}>
          <DialogContent>
            <SectionLabel>Close Loan</SectionLabel>
            <p>
              This will close your loan and the borrowed tokens will be returned
              to the lender. If the position token is not the loan token, then a
              trade will be automatically executed with the Kyber oracle in
              order to make the lender whole. If the lender is still not made
              whole, the collateral token will be sold to cover the losses.
            </p>
            <p>Any unused interest and collateral will be returned to you.</p>
            <Button onClick={this.closeLoan} variant="raised" color="primary">
              I understand, close loan.
            </Button>
          </DialogContent>
        </Dialog>
      </Fragment>
    );
  }
}
