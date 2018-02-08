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
  state = { showSendDialog: false, recipientAddress: ``, sendAmount: `` };

  setStateForInput = key => e => this.setState({ [key]: e.target.value });

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
          <Button raised onClick={() => {}}>
            Approve
          </Button>
          <Button raised color="primary" onClick={this.toggleSendDialog}>
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
