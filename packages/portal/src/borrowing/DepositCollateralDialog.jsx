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

export default class DepositCollateralDialog extends React.Component {
  state = { amount: `` };

  setAmount = e => this.setState({ amount: e.target.value });

  checkAllowance = async (tokenAddress) => {
    const { accounts, bZx } = this.props;
    const allowance = await bZx.getAllowance({
      tokenAddress,
      ownerAddress: accounts[0].toLowerCase()
    });
    return allowance.toNumber() !== 0;
  };
  
  silentAllowance = async (tokenAddress) => {
    const { accounts, bZx } = this.props;
    const txOpts = {
      from: accounts[0],
      // gas: 1000000,
      gasPrice: window.defaultGasPrice.toString()
    };

    const txObj = await bZx.setAllowanceUnlimited({
      tokenAddress: tokenAddress,
      ownerAddress: accounts[0].toLowerCase(),
      getObject: true,
      txOpts
    });

    try {
      let gas = await txObj.estimateGas(txOpts);
      console.log(gas);
      txOpts.gas = window.gasValue(gas);
      await txObj.send(txOpts);
      return true;
    } catch (error) {
      console.error(error.message);
      return false;
    }
  }

  depositCollateral = async () => {
    const { accounts, web3, bZx, loanOrderHash, collateralToken } = this.props;
    const { amount } = this.state;

    await this.setState({ isSubmitted: true });

    try {
      const a = await this.checkAllowance(collateralToken.address);
      if (!a) {
        if (!(await this.silentAllowance(collateralToken.address))) {
          alert(`Please go to the Balances page and approve `+collateralToken.symbol+`.`);
          this.props.onClose();
          await this.setState({ isSubmitted: false });
          return;
        }
      }
    } catch (error) {
      console.error(error);
      alert(`Please go to the Balances page and approve `+collateralToken.symbol+`.`);
      this.props.onClose();
      await this.setState({ isSubmitted: false });
      return;
    }

    const txOpts = {
      from: accounts[0],
      gas: 2000000,
      gasPrice: window.defaultGasPrice.toString()
    };

    // console.log({
    //   loanOrderHash,
    //   collateralTokenFilled: collateralToken.address,
    //   depositAmount: toBigNumber(amount, 10**collateralToken.decimals),
    //   txOpts
    // });

    if (bZx.portalProviderName !== `MetaMask`) {
      alert(`Please confirm this transaction on your device.`);
    }

    const txObj = await bZx.depositCollateral({
      loanOrderHash,
      depositTokenAddress: collateralToken.address,
      depositAmount: toBigNumber(amount, 10 ** collateralToken.decimals),
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
              this.setState({ isSubmitted: false });
            })
            .catch(error => {
              console.error(error);
              alert(
                `An error occured. Make sure that you have approved the token and have sufficient balance.`
              );
              this.props.onClose();
              this.setState({ isSubmitted: false });
            });
        })
        .catch(error => {
          console.error(error);
          alert(`The transaction is failing. Please try again later.`);
          this.props.onClose();
          this.setState({ isSubmitted: false });
        });
    } catch (error) {
      console.error(error);
      alert(`The transaction is failing. Please try again later.`);
      this.props.onClose();
      this.setState({ isSubmitted: false });
    }
  };

  render() {
    const { collateralToken } = this.props;
    return (
      <Dialog open={this.props.open} onClose={this.props.onClose}>
        <DialogTitle>Deposit Collateral</DialogTitle>
        <DialogContent>
          <p>
            Deposit additional collateral in order to increase your margin %.
          </p>
          <FormControl margin="normal" fullWidth>
            <InputLabel>Amount to deposit</InputLabel>
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
            onClick={this.depositCollateral}
            variant="raised"
            color="primary"
            disabled={this.state.isSubmitted}
            fullWidth
          >
            {this.state.isSubmitted ? `Please Wait` : `Deposit`}
          </Button>
        </DialogContent>
      </Dialog>
    );
  }
}
