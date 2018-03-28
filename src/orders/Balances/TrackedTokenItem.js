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
import {
  removeTrackedToken,
  PERMA_TOKEN_SYMBOLS
} from "../../common/trackedTokens";

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
    approved: null,
    balance: null
  };

  async componentDidMount() {
    this.checkAllowance();
    this.getBalance();
  }

  setStateForInput = key => e => this.setState({ [key]: e.target.value });

  getBalance = async () => {
    const { b0x, token, accounts } = this.props;
    const balance = await b0x.getBalance({
      tokenAddress: token.address,
      ownerAddress: accounts[0].toLowerCase()
    });
    console.log(`balance of`, token.name, balance.toNumber());
    this.setState({ balance: balance.toNumber() / 1e18 });
  };

  checkAllowance = async () => {
    const { b0x, token, accounts } = this.props;
    console.log(`checking allowance`);
    console.log(token.name, token.address);
    const allowance = await b0x.getAllowance({
      tokenAddress: token.address,
      ownerAddress: accounts[0].toLowerCase()
    });
    console.log(`Allowance:`, allowance.toNumber());
    this.setState({ approved: allowance.toNumber() !== 0 });
  };

  toggleSendDialog = () =>
    this.setState(p => ({ showSendDialog: !p.showSendDialog }));

  sendTokens = async () => {
    const { b0x, token, accounts, updateTrackedTokens } = this.props;
    const { recipientAddress, sendAmount } = this.state;
    const receipt = await b0x.transferToken({
      tokenAddress: token.address,
      to: recipientAddress.toLowerCase(),
      amount: sendAmount * 1e18,
      txOpts: { from: accounts[0] }
    });
    console.log(receipt);
    this.setState({ showSendDialog: false });
    alert(`Sent!`);
    setTimeout(() => updateTrackedTokens(true), 5000);
  };

  handleRemoveToken = () => {
    removeTrackedToken(this.props.tokens, this.props.token.address);
    this.props.updateTrackedTokens();
  };

  approve = async () => {
    const { b0x, token, accounts } = this.props;
    await b0x.setAllowanceUnlimited({
      tokenAddress: token.address,
      ownerAddress: accounts[0].toLowerCase()
    });
    setTimeout(() => this.checkAllowance(), 5000);
  };

  unapprove = async () => {
    const { b0x, token, accounts } = this.props;
    await b0x.resetAllowance({
      tokenAddress: token.address,
      ownerAddress: accounts[0].toLowerCase()
    });
    setTimeout(() => this.checkAllowance(), 5000);
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
    const { name, symbol, iconUrl } = this.props.token;
    const { balance } = this.state;
    const isPermaToken = PERMA_TOKEN_SYMBOLS.includes(symbol);
    return (
      <Container>
        <TokenInfo>
          <TokenIcon src={iconUrl} />
          <Name>{name}</Name>
        </TokenInfo>
        {balance !== null ? (
          <BalanceAmount>
            {balance.toString()} {symbol}
          </BalanceAmount>
        ) : (
          <div>loading...</div>
        )}
        <ButtonGroup>
          {this.renderAllowance()}
          <Button
            variant="raised"
            color="primary"
            onClick={this.toggleSendDialog}
          >
            Send
          </Button>
          <IconButton
            onClick={this.handleRemoveToken}
            style={{
              visibility: isPermaToken ? `hidden` : `unset`
            }}
          >
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
