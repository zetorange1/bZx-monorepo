import Dialog from "material-ui/Dialog";

export default class DepositCollateralDialog extends React.Component {
  state = {};
  render() {
    return (
      <Dialog open={this.props.open} onClose={this.props.onClose}>
        Deposit Collateral Dialog
      </Dialog>
    );
  }
}
