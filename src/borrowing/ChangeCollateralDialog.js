import Dialog, { DialogTitle, DialogContent } from "material-ui/Dialog";

export default class ChangeCollateralDialog extends React.Component {
  state = {};
  render() {
    return (
      <Dialog open={this.props.open} onClose={this.props.onClose}>
        <DialogTitle>Change Collateral Dialog</DialogTitle>
        <DialogContent>
          <p>Something cool.</p>
        </DialogContent>
      </Dialog>
    );
  }
}
