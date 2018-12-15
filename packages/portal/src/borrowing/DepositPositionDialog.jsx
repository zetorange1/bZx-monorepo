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

export default class DepositPositionDialog extends React.Component {
  state = { amount: `` };

  setAmount = e => this.setState({ amount: e.target.value });

  depositPosition = async () => {
    const { accounts, web3, bZx, loanOrderHash, positionToken } = this.props;
    const { amount } = this.state;

    const txOpts = {
      from: accounts[0],
      gas: 2000000,
      gasPrice: window.defaultGasPrice.toString()
    };

    // console.log({
    //   loanOrderHash,
    //   positionTokenFilled: positionToken.address,
    //   depositAmount: toBigNumber(amount, 10**positionToken.decimals),
    //   txOpts
    // });

    if (bZx.portalProviderName !== `MetaMask`) {
      alert(`Please confirm this transaction on your device.`);
    }

    const txObj = await bZx.depositPosition({
      loanOrderHash,
      depositTokenAddress: positionToken.address,
      depositAmount: toBigNumber(amount, 10 ** positionToken.decimals),
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
    const { positionToken } = this.props;
    return (
      <Dialog open={this.props.open} onClose={this.props.onClose}>
        <DialogTitle>Deposit Position</DialogTitle>
        <DialogContent>
          <p>
            Despoit position token that was previously withdrawn when the loan was overcollaterized.
          </p>
          <FormControl margin="normal" fullWidth>
            <InputLabel>Amount to deposit</InputLabel>
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
            onClick={this.depositPosition}
            variant="raised"
            color="primary"
            fullWidth
          >
            Deposit
          </Button>
        </DialogContent>
      </Dialog>
    );
  }
}
