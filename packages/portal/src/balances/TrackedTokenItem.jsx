import styled from "styled-components";
import Button from "@material-ui/core/Button";
import Icon from "@material-ui/core/Icon";
import Tooltip from "@material-ui/core/Tooltip";
import IconButton from "@material-ui/core/IconButton";
import Input from "@material-ui/core/Input";
import InputLabel from "@material-ui/core/InputLabel";
import InputAdornment from "@material-ui/core/InputAdornment";
import FormControl from "@material-ui/core/FormControl";
import TextField from "@material-ui/core/TextField";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogContentText from "@material-ui/core/DialogContentText";
import DialogTitle from "@material-ui/core/DialogTitle";
import { COLORS } from "../styles/constants";
import {
  removeTrackedToken,
  PERMA_TOKEN_SYMBOLS,
  FAUCET_TOKEN_SYMBOLS
} from "../common/trackedTokens";
import { fromBigNumber, toBigNumber } from "../common/utils";
import BZxComponent from "../common/BZxComponent";

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

export default class TrackedTokenItem extends BZxComponent {
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
    const { bZx, token, accounts } = this.props;
    
    const balance = await window.pqueueTokens.add(() => this.wrapAndRun(bZx.getBalance({
      tokenAddress: token.address,
      ownerAddress: accounts[0].toLowerCase()
    })));
    console.log(`balance of`, token.name, balance.toNumber());
    this.setState({
      balance: fromBigNumber(balance, 10 ** token.decimals)
    });
  };

  checkAllowance = async () => {
    const { bZx, token, accounts } = this.props;
    console.log(`checking allowance`);
    console.log(token.name, token.address);
    const allowance = await window.pqueueTokens.add(() => this.wrapAndRun(bZx.getAllowance({
      tokenAddress: token.address,
      ownerAddress: accounts[0].toLowerCase()
    })));
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
    const { web3, bZx, token, accounts, updateTrackedTokens } = this.props;
    const { recipientAddress, sendAmount } = this.state;

    if (bZx.portalProviderName !== `MetaMask`) {
      alert(`Please confirm this transaction on your device.`);
    }

    const txOpts = {
      from: accounts[0],
      gas: 2000000,
      gasPrice: window.defaultGasPrice.toString()
    };

    const txObj = await bZx.transferToken({
      tokenAddress: token.address,
      to: recipientAddress.toLowerCase(),
      amount: toBigNumber(sendAmount, 10 ** token.decimals),
      getObject: true,
      txOpts
    });

    try {
      await txObj
        .estimateGas(txOpts)
        .then(gas => {
          console.log(gas);
          txOpts.gas = window.gasValue(gas);
          txObj
            .send(txOpts)
            .once(`transactionHash`, hash => {
              alert(`Transaction submitted, transaction hash:`, {
                component: () => (
                  <TxHashLink href={`${bZx.etherscanURL}tx/${hash}`}>
                    {hash}
                  </TxHashLink>
                )
              });
              this.setState({ showSendDialog: false });
            })
            .then(() => {
              alert(`The tokens have been sent.`);
              updateTrackedTokens(true);
            })
            .catch(error => {
              console.error(error.message);
              if (
                error.message.includes(`denied transaction signature`) ||
                error.message.includes(`Condition of use not satisfied`) ||
                error.message.includes(`Invalid status`)
              ) {
                alert();
              } else {
                alert(
                  `The transaction is failing. Please check the amount and try again.`
                );
              }
              this.setState({ showSendDialog: false });
            });
        })
        .catch(error => {
          console.error(error.message);
          if (
            error.message.includes(`denied transaction signature`) ||
            error.message.includes(`Condition of use not satisfied`) ||
            error.message.includes(`Invalid status`)
          ) {
            alert();
          } else {
            alert(
              `The transaction is failing. Please check the amount and try again.`
            );
          }
          this.setState({ showSendDialog: false });
        });
    } catch (error) {
      console.error(error.message);
      if (
        error.message.includes(`denied transaction signature`) ||
        error.message.includes(`Condition of use not satisfied`) ||
        error.message.includes(`Invalid status`)
      ) {
        alert();
      } else {
        alert(
          `The transaction is failing. Please check the amount and try again.`
        );
      }
      this.setState({ showSendDialog: false });
    }
  };

  requestToken = async () => {
    const { web3, bZx, token, accounts, updateTrackedTokens } = this.props;

    console.log(`requesting token from testnet faucet`);
    console.log(token);

    if (bZx.portalProviderName !== `MetaMask`) {
      alert(`Please confirm this transaction on your device.`);
    }

    const txOpts = {
      from: accounts[0],
      // gas: 100000,
      gasPrice: window.defaultGasPrice.toString()
    };

    const txObj = await bZx.requestFaucetToken({
      tokenAddress: token.address,
      receiverAddress: accounts[0],
      getObject: true,
      txOpts
    });

    try {
      await txObj
        .estimateGas(txOpts)
        .then(gas => {
          console.log(gas);
          txOpts.gas = window.gasValue(gas);
          txObj
            .send(txOpts)
            .once(`transactionHash`, hash => {
              alert(`Transaction submitted, transaction hash:`, {
                component: () => (
                  <TxHashLink href={`${bZx.etherscanURL}tx/${hash}`}>
                    {hash}
                  </TxHashLink>
                )
              });
              this.setState({ showRequestDialog: false });
            })
            .then(() => {
              alert(`Your request is complete.`);
              updateTrackedTokens(true);
            })
            .catch(error => {
              console.error(error.message);
              if (
                error.message.includes(`denied transaction signature`) ||
                error.message.includes(`Condition of use not satisfied`) ||
                error.message.includes(`Invalid status`)
              ) {
                alert();
              } else {
                alert(
                  `The transaction is failing. If you requested from the faucet recently, please try again later.`
                );
              }
              this.setState({ showRequestDialog: false });
            });
        })
        .catch(error => {
          console.error(error.message);
          if (
            error.message.includes(`denied transaction signature`) ||
            error.message.includes(`Condition of use not satisfied`) ||
            error.message.includes(`Invalid status`)
          ) {
            alert();
          } else {
            alert(
              `The transaction is failing. If you requested from the faucet recently, please try again later.`
            );
          }
          this.setState({ showRequestDialog: false });
        });
    } catch (error) {
      console.error(error.message);
      if (
        error.message.includes(`denied transaction signature`) ||
        error.message.includes(`Condition of use not satisfied`) ||
        error.message.includes(`Invalid status`)
      ) {
        alert();
      } else {
        alert(
          `The transaction is failing. If you requested from the faucet recently, please try again later.`
        );
      }
      this.setState({ showRequestDialog: false });
    }
  };

  handleRemoveToken = () => {
    removeTrackedToken(this.props.tokens, this.props.token.address);
    this.props.updateTrackedTokens();
  };

  approve = async () => {
    const { bZx, token, web3, accounts } = this.props;
    console.log(`approving allowance`);
    console.log(token.name, token.address);
    this.setState({ approvalLoading: true });

    if (bZx.portalProviderName !== `MetaMask`) {
      alert(`Please confirm this transaction on your device.`);
    }

    const txOpts = {
      from: accounts[0],
      // gas: 1000000,
      gasPrice: window.defaultGasPrice.toString()
    };

    const txObj = await bZx.setAllowanceUnlimited({
      tokenAddress: token.address,
      ownerAddress: accounts[0].toLowerCase(),
      getObject: true,
      txOpts
    });

    try {
      await txObj
        .estimateGas(txOpts)
        .then(gas => {
          console.log(gas);
          txOpts.gas = window.gasValue(gas);
          txObj
            .send(txOpts)
            .once(`transactionHash`, hash => {
              alert(`Transaction submitted, transaction hash:`, {
                component: () => (
                  <TxHashLink href={`${bZx.etherscanURL}tx/${hash}`}>
                    {hash}
                  </TxHashLink>
                )
              });
            })
            .then(() => {
              alert(`Your token is approved.`);
              this.checkAllowance();
            })
            .catch(error => {
              console.error(error.message);
              if (
                error.message.includes(`denied transaction signature`) ||
                error.message.includes(`Condition of use not satisfied`) ||
                error.message.includes(`Invalid status`)
              ) {
                alert();
              } else {
                alert(`The transaction is failing. Please try again later.`);
              }
              this.setState({ approvalLoading: false });
            });
        })
        .catch(error => {
          console.error(error.message);
          if (
            error.message.includes(`denied transaction signature`) ||
            error.message.includes(`Condition of use not satisfied`) ||
            error.message.includes(`Invalid status`)
          ) {
            alert();
          } else {
            alert(`The transaction is failing. Please try again later.`);
          }
          this.setState({ approvalLoading: false });
        });
    } catch (error) {
      console.error(error.message);
      if (
        error.message.includes(`denied transaction signature`) ||
        error.message.includes(`Condition of use not satisfied`) ||
        error.message.includes(`Invalid status`)
      ) {
        alert();
      } else {
        alert(`The transaction is failing. Please try again later.`);
      }
      this.setState({ approvalLoading: false });
    }
  };

  unapprove = async () => {
    const { bZx, token, web3, accounts } = this.props;
    console.log(`unapproving allowance`);
    console.log(token.name, token.address);
    this.setState({ approvalLoading: true });

    if (bZx.portalProviderName !== `MetaMask`) {
      alert(`Please confirm this transaction on your device.`);
    }

    const txOpts = {
      from: accounts[0],
      // gas: 1000000,
      gasPrice: window.defaultGasPrice.toString()
    };

    const txObj = await bZx.resetAllowance({
      tokenAddress: token.address,
      ownerAddress: accounts[0].toLowerCase(),
      getObject: true
    });

    try {
      await txObj
        .estimateGas(txOpts)
        .then(gas => {
          console.log(gas);
          txOpts.gas = window.gasValue(gas);
          txObj
            .send(txOpts)
            .once(`transactionHash`, hash => {
              alert(`Transaction submitted, transaction hash:`, {
                component: () => (
                  <TxHashLink href={`${bZx.etherscanURL}tx/${hash}`}>
                    {hash}
                  </TxHashLink>
                )
              });
            })
            .then(() => {
              alert(`Your token is un-approved.`);
              this.checkAllowance();
            })
            .catch(error => {
              console.error(error.message);
              if (
                error.message.includes(`denied transaction signature`) ||
                error.message.includes(`Condition of use not satisfied`) ||
                error.message.includes(`Invalid status`)
              ) {
                alert();
              } else {
                alert(`The transaction is failing. Please try again later.`);
              }
              this.setState({ approvalLoading: false });
            });
        })
        .catch(error => {
          console.error(error.message);
          if (
            error.message.includes(`denied transaction signature`) ||
            error.message.includes(`Condition of use not satisfied`) ||
            error.message.includes(`Invalid status`)
          ) {
            alert();
          } else {
            alert(`The transaction is failing. Please try again later.`);
          }
          this.setState({ approvalLoading: false });
        });
    } catch (error) {
      console.error(error.message);
      if (
        error.message.includes(`denied transaction signature`) ||
        error.message.includes(`Condition of use not satisfied`) ||
        error.message.includes(`Invalid status`)
      ) {
        alert();
      } else {
        alert(`The transaction is failing. Please try again later.`);
      }
      this.setState({ approvalLoading: false });
    }
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
      FAUCET_TOKEN_SYMBOLS[this.props.bZx.networkName] !== undefined &&
      FAUCET_TOKEN_SYMBOLS[this.props.bZx.networkName].includes(symbol);
    return (
      <Container>
        <TokenInfo href={`${this.props.bZx.etherscanURL}token/${address}?a=${this.props.accounts[0]}`}>
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
            disabled={symbol === `BZRX`}
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
