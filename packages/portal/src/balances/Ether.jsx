import styled from "styled-components";
import Button from "@material-ui/core/Button";
import Input from "@material-ui/core/Input";
import InputLabel from "@material-ui/core/InputLabel";
import InputAdornment from "@material-ui/core/InputAdornment";
import FormControl from "@material-ui/core/FormControl";
import Dialog from "@material-ui/core/Dialog";
import DialogActions from "@material-ui/core/DialogActions";
import DialogContent from "@material-ui/core/DialogContent";
import DialogContentText from "@material-ui/core/DialogContentText";
import DialogTitle from "@material-ui/core/DialogTitle";
import Section, { SectionLabel } from "../common/FormSection";
import { fromBigNumber, toBigNumber } from "../common/utils";

const Container = styled.div`
  width: 100%;
  text-align: left;
`;

const StyledDiv = styled.div`
  margin: 0;
  display: block;
  color: rgba(0, 0, 0, 0.87);
  font-size: 0.875rem;
  font-weight: 400;
  font-family: "Raleway", sans-serif;
  line-height: 1.46429em;
  margin-bottom: 0.35em;
`;

const ButtonGroup = styled.div`
  margin-left: auto;
  display: flex;
  align-items: center;

  & > *:first-child {
    margin-right: 12px;
  }
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

export default class Ether extends React.Component {
  state = {
    ethBalance: null,
    wethBalance: null,
    showWrapDialog: false,
    showUnWrapDialog: false,
    wrapAmount: ``
  };

  async componentDidMount() {
    await this.updateBalances();
  }

  async componentDidUpdate(prevProps) {
    if (
      prevProps.lastTokenRefresh &&
      prevProps.lastTokenRefresh !== this.props.lastTokenRefresh
    )
      await this.updateBalances();
  }

  getWethBalance = async () => {
    const { bZx, tokens, accounts } = this.props;
    const token = await tokens.filter(t => t.symbol === `WETH`)[0];
    const balance = await bZx.getBalance({
      tokenAddress: token.address,
      ownerAddress: accounts[0].toLowerCase()
    });
    console.log(`balance of`, token.name, balance.toNumber());
    this.setState({ wethBalance: fromBigNumber(balance, 1e18) });
  };

  setWrapAmount = e => this.setState({ wrapAmount: e.target.value });

  updateBalances = async () => {
    const { web3, accounts } = this.props;
    const balanceInWei = await web3.eth.getBalance(accounts[0]);
    await this.getWethBalance();
    this.setState({ ethBalance: balanceInWei / 1e18 });
  };

  toggleWrapDialog = () =>
    this.setState(p => ({ showWrapDialog: !p.showWrapDialog }));

  toggleUnWrapDialog = () =>
    this.setState(p => ({ showUnWrapDialog: !p.showUnWrapDialog }));

  wrapEth = async () => {
    const { web3, bZx, accounts } = this.props;
    const { wrapAmount } = this.state;

    if (bZx.portalProviderName !== `MetaMask`) {
      alert(`Please confirm this transaction on your device.`);
    }

    const txOpts = {
      from: accounts[0],
      // gas: 1000000,
      gasPrice: web3.utils.toWei(`5`, `gwei`).toString(),
      value: toBigNumber(wrapAmount, 1e18)
    };

    const txObj = await bZx.wrapEth({
      amount: toBigNumber(wrapAmount, 1e18),
      getObject: true,
      txOpts
    });

    try {
      await txObj
        .estimateGas(txOpts)
        .then(gas => {
          console.log(gas);
          txOpts.gas = window.gasValue(gas)+10000; // WETH deposit gas estimate seems to often be under
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
              this.setState({ wrapAmount: ``, showWrapDialog: false });
            })
            .then(async () => {
              alert(`Your ether is wrapped.`);
              const balanceInWei = await web3.eth.getBalance(accounts[0]);
              await this.setState({ ethBalance: balanceInWei / 1e18 });
              await this.props.updateTrackedTokens(true);
            })
            .catch(error => {
              console.error(error.message);
              if (
                error.message.includes(`denied transaction signature`) ||
                error.message.includes(`Condition of use not satisfied`) ||
                error.message.includes(`Invalid status`)
              ) {
                alert();
              }
              this.setState({ wrapAmount: ``, showWrapDialog: false });
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
          }
          this.setState({ wrapAmount: ``, showWrapDialog: false });
        });
    } catch (error) {
      console.error(error.message);
      if (
        error.message.includes(`denied transaction signature`) ||
        error.message.includes(`Condition of use not satisfied`) ||
        error.message.includes(`Invalid status`)
      ) {
        alert();
      }
      this.setState({ wrapAmount: ``, showWrapDialog: false });
    }
  };

  unwrapEth = async () => {
    const { web3, bZx, accounts } = this.props;
    const { wrapAmount } = this.state;

    if (bZx.portalProviderName !== `MetaMask`) {
      alert(`Please confirm this transaction on your device.`);
    }

    const txOpts = {
      from: accounts[0],
      // gas: 1000000,
      gasPrice: web3.utils.toWei(`5`, `gwei`).toString()
    };

    const txObj = await bZx.unwrapEth({
      amount: toBigNumber(wrapAmount, 1e18),
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
              this.setState({ wrapAmount: ``, showUnWrapDialog: false });
            })
            .then(async () => {
              alert(`Your ether is unwrapped.`);
              const balanceInWei = await web3.eth.getBalance(accounts[0]);
              await this.setState({ ethBalance: balanceInWei / 1e18 });
              await this.props.updateTrackedTokens(true);
            })
            .catch(error => {
              console.error(error.message);
              if (
                error.message.includes(`denied transaction signature`) ||
                error.message.includes(`Condition of use not satisfied`) ||
                error.message.includes(`Invalid status`)
              ) {
                alert();
              }
              this.setState({ wrapAmount: ``, showUnWrapDialog: false });
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
          }
          this.setState({ wrapAmount: ``, showUnWrapDialog: false });
        });
    } catch (error) {
      console.error(error.message);
      if (
        error.message.includes(`denied transaction signature`) ||
        error.message.includes(`Condition of use not satisfied`) ||
        error.message.includes(`Invalid status`)
      ) {
        alert();
      }
      this.setState({ wrapAmount: ``, showUnWrapDialog: false });
    }
  };

  render() {
    return (
      <Section>
        <SectionLabel>ETH to WETH</SectionLabel>
        <Container>
          {this.state.ethBalance != null ? (
            <StyledDiv>
              Your current ETH balance is
              {` `}
              <strong>{this.state.ethBalance.toString()} ETH</strong>.
            </StyledDiv>
          ) : (
            <StyledDiv>
              Your current Ether balance is <strong>loading...</strong>.
            </StyledDiv>
          )}
          {this.state.wethBalance != null ? (
            <StyledDiv>
              Your current WETH balance is
              {` `}
              <strong>{this.state.wethBalance.toString()} WETH</strong>.
            </StyledDiv>
          ) : (
            <StyledDiv>
              Your current WETH balance is <strong>loading...</strong>.
            </StyledDiv>
          )}
          <br />
          <StyledDiv>
            You will need to WRAP your ETH to {` `}
            <a
              href="https://weth.io/"
              target="_blank"
              rel="noreferrer noopener"
            >
              WETH
            </a>
            {` `}
            to use it with bZx.
            <br />
            You can UNWRAP your WETH at anytime to get your ETH back.
          </StyledDiv>
          <br />
          <StyledDiv>
            <ButtonGroup>
              <Button
                variant="raised"
                color="primary"
                onClick={this.toggleWrapDialog}
                style={{ marginLeft: `12px` }}
              >
                Wrap ETH
              </Button>
              <Button
                variant="raised"
                color="primary"
                onClick={this.toggleUnWrapDialog}
                style={{ marginLeft: `12px` }}
              >
                UnWrap ETH
              </Button>
            </ButtonGroup>
          </StyledDiv>
          <Dialog
            open={this.state.showWrapDialog}
            onClose={this.toggleWrapDialog}
          >
            <DialogTitle>Wrap ETH</DialogTitle>
            <DialogContent>
              <DialogContentText>
                This will wrap ETH into the WETH token. Please specify the the
                amount of Ether you want to wrap.
              </DialogContentText>
              <FormControl fullWidth>
                <InputLabel>Wrap Amount</InputLabel>
                <Input
                  value={this.state.wrapAmount}
                  type="number"
                  onChange={this.setWrapAmount}
                  endAdornment={
                    <InputAdornment position="end">ETH</InputAdornment>
                  }
                />
              </FormControl>
            </DialogContent>
            <DialogActions>
              <Button onClick={this.toggleWrapDialog}>Cancel</Button>
              <Button onClick={this.wrapEth} color="primary">
                Wrap
              </Button>
            </DialogActions>
          </Dialog>
          <Dialog
            open={this.state.showUnWrapDialog}
            onClose={this.toggleUnWrapDialog}
          >
            <DialogTitle>Unwrap ETH</DialogTitle>
            <DialogContent>
              <DialogContentText>
                This will unwrap ETH from the WETH token. Please specify the the
                amount of WETH you want to unwrap.
              </DialogContentText>
              <FormControl fullWidth>
                <InputLabel>Unwrap Amount</InputLabel>
                <Input
                  value={this.state.wrapAmount}
                  type="number"
                  onChange={this.setWrapAmount}
                  endAdornment={
                    <InputAdornment position="end">WETH</InputAdornment>
                  }
                />
              </FormControl>
            </DialogContent>
            <DialogActions>
              <Button onClick={this.toggleUnWrapDialog}>Cancel</Button>
              <Button onClick={this.unwrapEth} color="primary">
                Unwrap
              </Button>
            </DialogActions>
          </Dialog>
        </Container>
      </Section>
    );
  }
}
