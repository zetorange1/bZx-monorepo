import styled from "styled-components";
import Dialog, { DialogTitle, DialogContent } from "material-ui/Dialog";
import Input, { InputLabel, InputAdornment } from "material-ui/Input";
import { FormControl } from "material-ui/Form";
import Button from "material-ui/Button";
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

export default class WithdrawCollateralDialog extends React.Component {
  state = { amount: `` };

  setAmount = e => this.setState({ amount: e.target.value });

  withdrawCollateral = async () => {
    const { b0x, accounts, web3, loanOrderHash, collateralToken } = this.props;
    const txOpts = {
      from: accounts[0],
      gas: 1000000,
      gasPrice: web3.utils.toWei(`5`, `gwei`).toString()
    };
    await b0x
      .withdrawExcessCollateral({
        loanOrderHash,
        collateralTokenFilled: collateralToken.address,
        withdrawAmount: toBigNumber(this.state.amount, 1e18),
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
        alert(
          `We were not able to execute your transaction. Please check the error logs.`
        );
        this.props.onClose();
      });
    alert(`Execution complete.`);
    this.props.onClose();
  };

  render() {
    const { collateralToken } = this.props;
    return (
      <Dialog open={this.props.open} onClose={this.props.onClose}>
        <DialogTitle>Withdraw Collateral</DialogTitle>
        <DialogContent>
          <p>
            If the value of your collateral is above the initial margin amount,
            you may choose to withdraw some of this collateral up to that
            amount.
          </p>
          <FormControl margin="normal" fullWidth>
            <InputLabel>Amount to withdraw</InputLabel>
            <Input
              value={this.state.amount}
              type="number"
              onChange={this.setAmount}
              endAdornment={
                <InputAdornment position="end">
                  {collateralToken.symbol}
                </InputAdornment>
              }
            />
          </FormControl>
          <br />
          <Button
            onClick={this.withdrawCollateral}
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
