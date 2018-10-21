import { Fragment } from "react";
import styled from "styled-components";
import Button from "@material-ui/core/Button";
import { Dialog, DialogTitle, DialogContent } from "@material-ui/core";
import { SectionLabel } from "../common/FormSection";
import FormControl from "@material-ui/core/FormControl";
import Input from "@material-ui/core/Input";
import InputLabel from "@material-ui/core/InputLabel";
import InputAdornment from "@material-ui/core/InputAdornment";
import { toBigNumber, fromBigNumber } from "../common/utils";

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
  state = { showDialog: false, closeAmount: ``, fullClose: false };

  setAmount = e => this.setState({ closeAmount: e.target.value });

  openDialog = () => this.setState({ showDialog: true });
  closeDialog = () => this.setState({ showDialog: false });

  closeLoan = async () => {
    await this.setState({ closeAmount: ``, fullClose: true });
    await this.closeLoanPart();
  };

  closeLoanPart = async () => {
    const { closeAmount, fullClose } = this.state;
    const { 
      bZx, 
      web3, 
      accounts, 
      loanOrderHash, 
      loanToken,
      loanTokenAmountFilled 
    } = this.props;

    const closeAmountBN = closeAmount ? toBigNumber(closeAmount, 10 ** loanToken.decimals) : toBigNumber(0);

    if (!fullClose && (closeAmountBN.lte(0) || closeAmountBN.gte(loanTokenAmountFilled)))
      return;

    const txOpts = {
      from: accounts[0],
      gas: 2000000,
      gasPrice: window.defaultGasPrice.toString()
    };

    if (bZx.portalProviderName !== `MetaMask`) {
      alert(`Please confirm this transaction on your device.`);
    }
    
    let txObj;
    if (fullClose) {
      txObj = await bZx.closeLoan({
        loanOrderHash,
        getObject: true
      });
    } else {
      txObj = await bZx.closeLoanPartially({
        loanOrderHash,
        closeAmount: closeAmountBN,
        getObject: true
      });
    }
    console.log(txOpts);

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
              alert(`Loan closure complete.`);
              this.closeDialog();
            })
            .finally(() => {
              this.setState({ closeAmount: ``, fullClose: false });
            })
            .catch(error => {
              console.error(error);
              alert(`We were not able to close your loan.`);
              this.closeDialog();
            });
        })
        .catch(error => {
          console.error(error);
          alert(
            `The transaction is failing. This loan cannot be closed at this time.`
          );
          this.closeDialog();
        });
    } catch (error) {
      console.error(error);
      alert(
        `The transaction is failing. This loan cannot be closed at this time.`
      );
      this.closeDialog();
    }
  };

  render() {
    const { loanToken, loanTokenAmountFilled } = this.props;
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
              This will close part or all of your loan by closing any open positions 
              and returning the loaned token to the lender. If your position has a loss, 
              some of the stored collateral will be spent to make the lender whole. 
              Any unused interest and collateral will be returned to you.
            </p>
            <p>Enter the amount of loan token you want to return to the lender 
              and click "Close Part of Loan", or click "Close Entire Loan" to close the entire loan.
              <br/><br/>
              Amount borrowed: {fromBigNumber(loanTokenAmountFilled, 10 ** loanToken.decimals)}
              {` `}
              {loanToken.symbol}
            </p>
            <FormControl margin="normal" fullWidth>
            <InputLabel>Amount to close</InputLabel>
            <Input
              value={this.state.closeAmount}
              type="number"
              onChange={this.setAmount}
              endAdornment={
                <InputAdornment position="end">
                  {loanToken.symbol}
                </InputAdornment>
              }
            /><br/>
            <Button onClick={this.closeLoanPart} variant="raised" color="primary">
              Close Part of Loan
            </Button>
            <br/><br/>
            <Button onClick={this.closeLoan} variant="raised" color="primary">
              Close Entire Loan
            </Button>  
            </FormControl>        
          </DialogContent>
        </Dialog>
      </Fragment>
    );
  }
}
