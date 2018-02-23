import Dialog from "material-ui/Dialog";

export default class ChangeCollateralDialog extends React.Component {
  state = {};
  render() {
    return (
      <Dialog open={this.props.open} onClose={this.props.onClose}>
        Change Collateral Dialog
      </Dialog>
    );
  }
}
