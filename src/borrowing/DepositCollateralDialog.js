import Dialog, { DialogTitle, DialogContent } from "material-ui/Dialog";
import Input, { InputLabel, InputAdornment } from "material-ui/Input";
import { FormControl } from "material-ui/Form";
import Button from "material-ui/Button";

export default class DepositCollateralDialog extends React.Component {
  state = { amount: 0 };

  setAmount = e => this.setState({ amount: e.target.value });

  render() {
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
              endAdornment={<InputAdornment position="end">SYM</InputAdornment>}
            />
            <br />
            <Button variant="raised" color="primary">
              Deposit
            </Button>
          </FormControl>
        </DialogContent>
      </Dialog>
    );
  }
}
