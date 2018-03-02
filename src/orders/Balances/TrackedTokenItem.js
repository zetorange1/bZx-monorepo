import styled from "styled-components";
import Button from "material-ui/Button";
import Icon from "material-ui/Icon";
import IconButton from "material-ui/IconButton";
import Input, { InputLabel, InputAdornment } from "material-ui/Input";
import { FormControl } from "material-ui/Form";
import TextField from "material-ui/TextField";
import Dialog, {
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle
} from "material-ui/Dialog";
import { COLORS } from "../../styles/constants";
import { removeTrackedToken } from "../../common/trackedTokens";

const Container = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 24px;

  & > * {
    margin-right: 12px;
  }
`;

const TokenInfo = styled.div`
  width: 120px;
  display: flex;
  align-items: center;
`;

const TokenIcon = styled.img`
  height: 24px;
  width: 24px;
  margin-right: 12px;
`;

const Name = styled.div`
  font-size: 12px;
  color: ${COLORS.gray};
`;

const BalanceAmount = styled.div``;

const ButtonGroup = styled.div`
  margin-left: auto;
  display: flex;
  align-items: center;

  & > *:first-child {
    margin-right: 12px;
  }
`;

export default class TrackedTokenItems extends React.Component {
  state = {
    showSendDialog: false,
    recipientAddress: ``,
    sendAmount: ``,
    approved: null
  };

  async componentDidMount() {
    this.checkAllowance();
  }

  setStateForInput = key => e => this.setState({ [key]: e.target.value });

  checkAllowance = async () => {
    const { b0x, token, accounts } = this.props;
    const allowance = await b0x.getAllowance({
      tokenAddress: token.address,
      ownerAddress: accounts[0].toLowerCase(),
      spenderAddress: `0x04758f1f88a9cea9bdef16d75f44c2f07a255e14`
    });
    this.setState({ approved: allowance.toNumber() !== 0 });
  };

  toggleSendDialog = () =>
    this.setState(p => ({ showSendDialog: !p.showSendDialog }));

  sendTokens = () => {
    // const { recipientAddress, sendAmount } = this.state;
    // TODO - send actual tokens
  };

  handleRemoveToken = () => {
    removeTrackedToken(this.props.token.address);
    this.props.updateTrackedTokens();
  };

  approve = async () => {
    const { b0x, token, accounts } = this.props;
    await b0x.setAllowanceUnlimited({
      tokenAddress: token.address,
      ownerAddress: accounts[0].toLowerCase(),
      spenderAddress: `0x04758f1f88a9cea9bdef16d75f44c2f07a255e14`
    });
    this.checkAllowance();
  };

  unapprove = () => {
    // TODO - fill this out
    alert(`unapprove token`);
  };

  renderAllowance = () => {
    const { approved } = this.state;
    if (approved === null) {
      return <div>Checking</div>;
    }
    if (approved === true) {
      return (
        <Button variant="raised" onClick={this.unapprove}>
          Un-approve
        </Button>
      );
    }
    return (
      <Button variant="raised" onClick={this.approve}>
        Approve
      </Button>
    );
  };

  render() {
    const { name, symbol, iconUrl, amount } = this.props.token;
    return (
      <Container>
        <TokenInfo>
          <TokenIcon src={iconUrl} />
          <Name>{name}</Name>
        </TokenInfo>
        <BalanceAmount>
          {amount} {symbol}
        </BalanceAmount>
        <ButtonGroup>
          {this.renderAllowance()}
          <Button
            variant="raised"
            color="primary"
            onClick={this.toggleSendDialog}
          >
            Send
          </Button>
          <IconButton onClick={this.handleRemoveToken}>
            <Icon>close</Icon>
          </IconButton>
        </ButtonGroup>
        <Dialog
          open={this.state.showSendDialog}
          onClose={this.toggleSendDialog}
        >
          <DialogTitle>Send {name}</DialogTitle>
          <DialogContent>
            <DialogContentText>
              This will trigger a request to send your tokens to another
              account. You will have to approve this action on MetaMask.
            </DialogContentText>
            <TextField
              autoFocus
              margin="normal"
              label="Recipient Address"
              fullWidth
              value={this.state.recipientAddress}
              onChange={this.setStateForInput(`recipientAddress`)}
            />
            <FormControl fullWidth>
              <InputLabel>Send Amount</InputLabel>
              <Input
                value={this.state.sendAmount}
                type="number"
                onChange={this.setStateForInput(`sendAmount`)}
                endAdornment={
                  <InputAdornment position="end">{symbol}</InputAdornment>
                }
              />
            </FormControl>
          </DialogContent>
          <DialogActions>
            <Button onClick={this.toggleSendDialog}>Cancel</Button>
            <Button onClick={this.sendTokens} color="primary">
              Send
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    );
  }
}
