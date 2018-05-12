import { Fragment } from "react";
import Button from "material-ui/Button";
import Dialog, { DialogContent } from "material-ui/Dialog";
import { SectionLabel } from "../common/FormSection";

export default class CloseLoan extends React.Component {
  state = { showDialog: false };

  openDialog = () => this.setState({ showDialog: true });
  closeDialog = () => this.setState({ showDialog: false });

  closeLoan = () => {
    // TODO - execute smart contract function
  };

  render() {
    return (
      <Fragment>
        <Button
          onClick={this.openDialog}
          variant="raised"
          style={{ marginLeft: `12px` }}
        >
          Close Loan
        </Button>
        <Dialog open={this.state.showDialog} onClose={this.closeDialog}>
          <DialogContent>
            <SectionLabel>Close Loan</SectionLabel>
            <p>Description here</p>
            <Button onClick={this.closeLoan} variant="raised" color="primary">
              Close Loan
            </Button>
          </DialogContent>
        </Dialog>
      </Fragment>
    );
  }
}
