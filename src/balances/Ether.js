import styled from "styled-components";
import Button from "material-ui/Button";
import Input, { InputLabel, InputAdornment } from "material-ui/Input";
import { FormControl } from "material-ui/Form";
import Dialog, {
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle
} from "material-ui/Dialog";
import Section, { SectionLabel } from "../common/FormSection";
import { toBigNumber } from "../common/utils";

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
    showWrapDialog: false,
    showUnWrapDialog: false,
    wrapAmount: ``
  };

  async componentDidMount() {
    const { web3, accounts } = this.props;
    const balanceInWei = await web3.eth.getBalance(accounts[0]);
    this.setState({ ethBalance: balanceInWei / 1e18 });
  }

  setWrapAmount = e => this.setState({ wrapAmount: e.target.value });

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
      gasPrice: web3.utils.toWei(`5`, `gwei`).toString()
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
          txOpts.gas = window.gasValue(gas);
          txObj
            .send({ ...txOpts, value: toBigNumber(wrapAmount, 1e18) })
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
    const showEthBalance = this.state.ethBalance !== null;
    return (
      <Section>
        <SectionLabel>Ether</SectionLabel>
        <Container>
          {showEthBalance ? (
            <StyledDiv>
              Your current Ether balance is{` `}
              <strong>{this.state.ethBalance.toString()} ETH</strong>.
            </StyledDiv>
          ) : (
            <StyledDiv>
              Your current Ether balance is <strong>loading...</strong>.
            </StyledDiv>
          )}
          <StyledDiv>
            But instead of ETH, you will need{` `}
            <a
              href="https://weth.io/"
              target="_blank"
              rel="noreferrer noopener"
            >
              Wrapped Ether (WETH)
            </a>
            {` `}
            to trade on bZx.
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
            <DialogTitle>Wrap Ether</DialogTitle>
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
