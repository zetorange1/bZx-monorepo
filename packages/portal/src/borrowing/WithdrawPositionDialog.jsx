import { Fragment } from "react";
import styled from "styled-components";
import Dialog from "@material-ui/core/Dialog";
import DialogContent from "@material-ui/core/DialogContent";
import DialogTitle from "@material-ui/core/DialogTitle";
import Input from "@material-ui/core/Input";
import InputLabel from "@material-ui/core/InputLabel";
import InputAdornment from "@material-ui/core/InputAdornment";
import FormControl from "@material-ui/core/FormControl";
import Button from "@material-ui/core/Button";
import { toBigNumber } from "../common/utils";

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

export default class WithdrawPositionDialog extends React.Component {
  state = { amount: `` };

  setAmount = e => this.setState({ amount: e.target.value });

  withdrawPosition = async () => {
    const { accounts, bZx, loanOrderHash, positionToken } = this.props;
    let { amount } = this.state;

    const txOpts = {
      from: accounts[0],
      gas: 2000000,
      gasPrice: window.defaultGasPrice.toString()
    };

    if (bZx.portalProviderName !== `MetaMask`) {
      alert(`Please confirm this transaction on your device.`);
    }

    const txObj = await bZx.withdrawPosition({
      loanOrderHash,
      withdrawAmount: toBigNumber(amount, 10 ** positionToken.decimals).toFixed(0),
      getObject: true,
      txOpts
    });
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
              alert(`Execution complete.`);
              this.props.onClose();
            })
            .catch(error => {
              console.error(error);
              alert(
                `An error occured. Make sure that you have approved the token and have sufficient balance.`
              );
              this.props.onClose();
            });
        })
        .catch(error => {
          console.error(error);
          alert(`The transaction is failing. Please try again later.`);
          this.props.onClose();
        });
    } catch (error) {
      console.error(error);
      alert(`The transaction is failing. Please try again later.`);
      this.props.onClose();
    }
  };

  render() {
    let { 
      positionToken,
      currentMarginAmount,
      positionTokenAmountFilled,
      initialMarginAmount
    } = this.props;
    positionTokenAmountFilled = toBigNumber(positionTokenAmountFilled);
    return (
      <Dialog open={this.props.open} onClose={this.props.onClose}>
        <DialogTitle>Withdraw Position</DialogTitle>
        <DialogContent>
          <p>
            You can withdraw any amount of position token as long as your collateral remains at or above initial margin.
            { positionTokenAmountFilled && initialMarginAmount && currentMarginAmount ? (
              <Fragment>
                <br/><br/>
                Available for Withdrawl: {positionTokenAmountFilled.minus(positionTokenAmountFilled.times(initialMarginAmount).times(10 ** 18).div(currentMarginAmount)).div(10 ** positionToken.decimals).toString()} {positionToken.symbol}
              </Fragment>
            ) : `` }
          </p>
          <FormControl margin="normal" fullWidth>
            <InputLabel>Amount to withdraw</InputLabel>
            <Input
              value={this.state.amount}
              type="number"
              onChange={this.setAmount}
              endAdornment={
                <InputAdornment position="end">
                  {positionToken.symbol}
                </InputAdornment>
              }
            />
          </FormControl>
          <br />
          <Button
            onClick={this.withdrawPosition}
            variant="raised"
            color="primary"
            fullWidth
          >
            Withdraw
          </Button>
        </DialogContent>
      </Dialog>
    );
  }
}
