import styled from "styled-components";
import Button from "material-ui/Button";
import Icon from "material-ui/Icon";
import Tooltip from "material-ui/Tooltip";
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
import { COLORS } from "../styles/constants";
import {
  removeTrackedToken,
  PERMA_TOKEN_SYMBOLS,
  FAUCET_TOKEN_SYMBOLS
} from "../common/trackedTokens";
import { fromBigNumber, toBigNumber } from "../common/utils";

const Container = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 24px;

  & > * {
    margin-right: 12px;
  }
`;

const TokenInfo = styled.a.attrs({
  target: `_blank`,
  rel: `noopener noreferrer`
})`
  display: block;
  width: 120px;
  display: flex;
  align-items: center;
  text-decoration: none;
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

const TooltipText = styled.div`
  font-family: monospace;
  font-size: 12px;
`;

const TxHashLink = styled.a.attrs({
  target: `_blank`,
  rel: `noopener noreferrer`
})`
  font-family: monospace;
  display: block;
  text-overflow: ellipsis;
  overflow: auto;
}
`;

export default class TrackedTokenItems extends React.Component {
  state = {
    showSendDialog: false,
    showRequestDialog: false,
    recipientAddress: ``,
    sendAmount: ``,
    approved: null,
    balance: null,
    approvalLoading: false
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
    this.setState({ balance: fromBigNumber(balance, 1e18) });
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
    this.setState({
      approved: allowance.toNumber() !== 0,
      approvalLoading: false
    });
  };

  toggleSendDialog = () =>
    this.setState(p => ({ showSendDialog: !p.showSendDialog }));

  toggleRequestDialog = () =>
    this.setState(p => ({ showRequestDialog: !p.showRequestDialog }));

  sendTokens = async () => {
    const { b0x, token, accounts, updateTrackedTokens } = this.props;
    const { recipientAddress, sendAmount } = this.state;
    if (b0x.portalProviderName !== `MetaMask`) {
      alert(`Please confirm this transaction on your device.`);
    }
    b0x
      .transferToken({
        tokenAddress: token.address,
        to: recipientAddress.toLowerCase(),
        amount: toBigNumber(sendAmount, 1e18),
        txOpts: { from: accounts[0] }
      })
      .once(`transactionHash`, hash => {
        alert(`Transaction submitted, transaction hash:`, {
          component: () => (
            <TxHashLink href={`${b0x.etherscanURL}tx/${hash}`}>
              {hash}
            </TxHashLink>
          )
        });
      })
      .on(`error`, error => {
        console.error(error.message);
        if (error.message.includes(`Condition of use not satisfied`)) {
          alert();
        }
      });
    this.setState({ showSendDialog: false });
    setTimeout(() => updateTrackedTokens(true), 5000);
  };

  requestToken = async () => {
    const { b0x, token, accounts, updateTrackedTokens } = this.props;
    console.log(`requesting token from testnet faucet`);
    console.log(token);
    if (b0x.portalProviderName !== `MetaMask`) {
      alert(`Please confirm this transaction on your device.`);
    }
    b0x
      .requestFaucetToken({
        tokenAddress: token.address,
        receiverAddress: accounts[0],
        txOpts: { from: accounts[0] }
      })
      .once(`transactionHash`, hash => {
        alert(`Transaction submitted, transaction hash:`, {
          component: () => (
            <TxHashLink href={`${b0x.etherscanURL}tx/${hash}`}>
              {hash}
            </TxHashLink>
          )
        });
      })
      .on(`error`, error => {
        console.error(error.message);
        if (error.message.includes(`Condition of use not satisfied`)) {
          alert();
        }
      });
    this.setState({ showRequestDialog: false });
    setTimeout(() => updateTrackedTokens(true), 5000);
  };

  handleRemoveToken = () => {
    removeTrackedToken(this.props.tokens, this.props.token.address);
    this.props.updateTrackedTokens();
  };

  approve = async () => {
    const { b0x, token, accounts } = this.props;
    console.log(`approving allowance`);
    console.log(token.name, token.address);
    this.setState({ approvalLoading: true });
    if (b0x.portalProviderName !== `MetaMask`) {
      alert(`Please confirm this transaction on your device.`);
    }
    await b0x
      .setAllowanceUnlimited({
        tokenAddress: token.address,
        ownerAddress: accounts[0].toLowerCase()
      })
      .once(`transactionHash`, hash => {
        alert(`Transaction submitted, transaction hash:`, {
          component: () => (
            <TxHashLink href={`${b0x.etherscanURL}tx/${hash}`}>
              {hash}
            </TxHashLink>
          )
        });
        setTimeout(() => this.checkAllowance(), 5000);
      })
      .on(`error`, error => {
        console.error(error.message);
        if (error.message.includes(`Condition of use not satisfied`)) {
          alert();
        }
        this.setState({ approvalLoading: false });
      });
  };

  unapprove = async () => {
    const { b0x, token, accounts } = this.props;
    console.log(`unapproving allowance`);
    console.log(token.name, token.address);
    this.setState({ approvalLoading: true });
    if (b0x.portalProviderName !== `MetaMask`) {
      alert(`Please confirm this transaction on your device.`);
    }
    await b0x
      .resetAllowance({
        tokenAddress: token.address,
        ownerAddress: accounts[0].toLowerCase()
      })
      .once(`transactionHash`, hash => {
        alert(`Transaction submitted, transaction hash:`, {
          component: () => (
            <TxHashLink href={`${b0x.etherscanURL}tx/${hash}`}>
              {hash}
            </TxHashLink>
          )
        });
        setTimeout(() => this.checkAllowance(), 5000);
      })
      .on(`error`, error => {
        console.error(error.message);
        if (error.message.includes(`Condition of use not satisfied`)) {
          alert();
        }
        this.setState({ approvalLoading: false });
      });
  };

  renderAllowance = () => {
    const { approved, approvalLoading } = this.state;
    if (approved === null) {
      return <div>Checking</div>;
    }
    if (approved === true) {
      return (
        <Button
          variant="raised"
          onClick={this.unapprove}
          disabled={approvalLoading}
        >
          Un-approve
        </Button>
      );
    }
    return (
      <Button
        variant="raised"
        onClick={this.approve}
        disabled={approvalLoading}
      >
        Approve
      </Button>
    );
  };

  render() {
    const { name, symbol, iconUrl, address } = this.props.token;
    const { balance } = this.state;
    const isPermaToken = PERMA_TOKEN_SYMBOLS.includes(symbol);
    const isFaucetToken =
      FAUCET_TOKEN_SYMBOLS[this.props.b0x.networkName] !== undefined &&
      FAUCET_TOKEN_SYMBOLS[this.props.b0x.networkName].includes(symbol);
    return (
      <Container>
        <TokenInfo href={`${this.props.b0x.etherscanURL}token/${address}`}>
          <TokenIcon src={iconUrl} />
          <Name>{name}</Name>
        </TokenInfo>
        {balance !== null ? (
          <Tooltip title={<TooltipText>{address}</TooltipText>}>
            <BalanceAmount>
              {balance.toString()} {symbol}
            </BalanceAmount>
          </Tooltip>
        ) : (
          <div>loading...</div>
        )}
        <ButtonGroup>
          <Button
            variant="raised"
            onClick={this.toggleRequestDialog}
            style={{
              visibility: !isFaucetToken ? `hidden` : `unset`,
              display: !isFaucetToken ? `none` : `unset`
            }}
          >
            Request
          </Button>
          {this.renderAllowance()}
          <Button
            variant="raised"
            color="primary"
            onClick={this.toggleSendDialog}
            style={{ marginLeft: `12px` }}
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
              This token will be sent to another account. Please specify the
              recipient address and amount to send.
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
        <Dialog
          open={this.state.showRequestDialog}
          onClose={this.toggleRequestDialog}
        >
          <DialogTitle>Request {name} from Faucet</DialogTitle>
          <DialogContent>
            <DialogContentText>
              This will request that 1 (one) {symbol} be transfered to your
              wallet. If you have requested this token recently, then this
              transaction may fail.
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={this.toggleRequestDialog}>Cancel</Button>
            <Button onClick={this.requestToken} color="primary">
              Request
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    );
  }
}
