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

export default class WithdrawCollateralDialog extends React.Component {
  state = { amount: `` };

  setAmount = e => this.setState({ amount: e.target.value });

  withdrawCollateral = async () => {
    const { bZx, accounts, web3, loanOrderHash, collateralToken } = this.props;
    const txOpts = {
      from: accounts[0],
      gas: 10000000,
      gasPrice: window.defaultGasPrice.toString()
    };

    if (bZx.portalProviderName !== `MetaMask`) {
      alert(`Please confirm this transaction on your device.`);
    }
    console.log(this.state.amount);
    const txObj = await bZx.withdrawExcessCollateral({
      loanOrderHash,
      collateralTokenFilled: collateralToken.address,
      withdrawAmount: toBigNumber(
        this.state.amount,
        10 ** collateralToken.decimals
      ),
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
              this.props.onClose();
            })
            .catch(error => {
              console.error(error);
              alert(
                `We were not able to execute your transaction at this time.`
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
    const { collateralToken, excessCollateral } = this.props;
    return (
      <Dialog open={this.props.open} onClose={this.props.onClose}>
        <DialogTitle>Withdraw Collateral</DialogTitle>
        <DialogContent>
          <p>
            If the value of your collateral is above the initial margin amount,
            you may choose to withdraw some of the excess amount. If you specify too much, 
            only the excess is withdrawn.
            <br/><br/>
            Current Excess: {excessCollateral ? `${excessCollateral}` : `0`} {collateralToken.symbol}
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
