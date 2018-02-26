import Dialog, { DialogTitle, DialogContent } from "material-ui/Dialog";
import Button from "material-ui/Button";
import TokenPicker from "../common/TokenPicker";
import Section, { SectionLabel, Divider } from "../common/FormSection";

export default class ChangeCollateralDialog extends React.Component {
  state = { tokenAddress: this.props.tokens[0].address };

  setTokenAddress = tokenAddress => this.setState({ tokenAddress });

  render() {
    return (
      <Dialog open={this.props.open} onClose={this.props.onClose}>
        <DialogTitle>Change Collateral</DialogTitle>
        <DialogContent>
          <Section>
            <SectionLabel>1. Choose your new collateral token</SectionLabel>
            <TokenPicker
              tokens={this.props.tokens}
              setAddress={this.setTokenAddress}
              value={this.state.tokenAddress}
            />
          </Section>
          <Divider />
          <Section>
            <SectionLabel>2. Approve the token</SectionLabel>
            <Button variant="raised">Approve</Button>
          </Section>
          <Divider />
          <Section>
            <SectionLabel>3. Execute the change</SectionLabel>
            <p>
              When you click the button below, we will attempt to transfer an
              amount equal to the required initial margin amount for the loan.
              Your old collateral token will automatically be refunded to your
              account.
            </p>
            <Button variant="raised" color="primary">
              Execute change
            </Button>
          </Section>
        </DialogContent>
      </Dialog>
    );
  }
}
