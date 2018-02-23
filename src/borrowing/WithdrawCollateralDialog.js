import Dialog from "material-ui/Dialog";

export default class WithdrawCollateralDialog extends React.Component {
  state = {};
  render() {
    return (
      <Dialog open={this.props.open} onClose={this.props.onClose}>
        Withdraw Collateral Dialog
      </Dialog>
    );
  }
}
