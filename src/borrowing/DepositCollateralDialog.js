import Dialog, { DialogTitle, DialogContent } from "material-ui/Dialog";
import Input, { InputLabel, InputAdornment } from "material-ui/Input";
import { FormControl } from "material-ui/Form";
import Button from "material-ui/Button";
import { toBigNumber } from "../common/utils";

export default class DepositCollateralDialog extends React.Component {
  state = { amount: 0 };

  setAmount = e => this.setState({ amount: e.target.value });

  depositCollateral = async () => {
    const { b0x, loanOrderHash, collateralToken } = this.props;
    const { amount } = this.state;

    // b0x.depositCollateral({
    //   loanOrderHash,
    //   collateralTokenFilled: collateralToken.address,
    //   depositAmount: toBigNumber(amount, 1e18),
    //   txOpts: {}
    // });
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
          <Button variant="raised" color="primary" fullWidth>
            Deposit
          </Button>
        </DialogContent>
      </Dialog>
    );
  }
}
