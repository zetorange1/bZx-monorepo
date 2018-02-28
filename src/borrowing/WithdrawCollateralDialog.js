import Dialog, { DialogTitle, DialogContent } from "material-ui/Dialog";
import Input, { InputLabel, InputAdornment } from "material-ui/Input";
import { FormControl } from "material-ui/Form";
import Button from "material-ui/Button";

export default class WithdrawCollateralDialog extends React.Component {
  state = { amount: 0 };

  setAmount = e => this.setState({ amount: e.target.value });

  render() {
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
              endAdornment={<InputAdornment position="end">SYM</InputAdornment>}
            />
          </FormControl>
          <br />
          <Button variant="raised" color="primary" fullWidth>
            Withdraw
          </Button>
        </DialogContent>
      </Dialog>
    );
  }
}
