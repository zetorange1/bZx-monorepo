import styled from "styled-components";
import Dialog, { DialogTitle, DialogContent } from "material-ui/Dialog";
import Button from "material-ui/Button";
import TokenPicker from "../common/TokenPicker";
import Section, { SectionLabel, Divider } from "../common/FormSection";

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

const defaultToken = tokens => {
  let token = tokens.filter(t => t.symbol === `KNC`);
  if (token.length > 0) {
    token = token[0]; // eslint-disable-line prefer-destructuring
  } else {
    token = tokens[0]; // eslint-disable-line prefer-destructuring
  }
  return token;
};

export default class TradeOracleDialog extends React.Component {
  state = {
    tokenAddress: defaultToken(this.props.tokens).address
  };

  setTokenAddress = tokenAddress => this.setState({ tokenAddress });

  executeChange = async () => {
    const { bZx, web3, accounts, loanOrderHash } = this.props;
    const { tokenAddress } = this.state;

    const notAllowed = {
      1: [`ZRX`, `BZRXFAKE`],
      3: [`ZRX`, `BZRX`],
      4: [],
      42: [`ZRX`, `WETH`]
    };
    const tradeToken = this.props.tokens.filter(
      t => t.address === tokenAddress
    )[0];
    if (
      notAllowed[bZx.networkId] &&
      notAllowed[bZx.networkId].includes(tradeToken && tradeToken.symbol)
    ) {
      alert(
        `Token ${
          tradeToken.symbol
        } is not yet supported for trading with this oracle. Please choose a different token.`
      );
      return;
    }

    const txOpts = {
      from: accounts[0],
      gas: 1000000,
      gasPrice: web3.utils.toWei(`5`, `gwei`).toString()
    };

    console.log(`Executing trade with Kyber:`);
    console.log({
      orderHash: loanOrderHash,
      tradeTokenAddress: tokenAddress,
      txOpts
    });

    if (bZx.portalProviderName !== `MetaMask`) {
      alert(`Please confirm this transaction on your device.`);
    }

    const txObj = await bZx.tradePositionWithOracle({
      orderHash: loanOrderHash,
      tradeTokenAddress: tokenAddress,
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
              alert(`Trade execution complete. Please refresh to see changes.`);
              this.props.onClose();
            })
            .catch(error => {
              console.error(error);
              alert(`We were not able to execute this trade.`);
              this.props.onClose();
            });
        })
        .catch(error => {
          console.error(error);
          alert(
            `The transaction is failing. This trade cannot be executed at this time.`
          );
          this.props.onClose();
        });
    } catch (error) {
      console.error(error);
      alert(
        `The transaction is failing. This trade cannot be executed at this time.`
      );
      this.props.onClose();
    }
  };

  render() {
    return (
      <Dialog open={this.props.open} onClose={this.props.onClose}>
        <DialogTitle>Execute Trade with Kyber Oracle</DialogTitle>
        <DialogContent>
          <Section>
            <SectionLabel>1. Choose your target token</SectionLabel>
            <TokenPicker
              tokens={this.props.tokens}
              setAddress={this.setTokenAddress}
              value={this.state.tokenAddress}
            />
          </Section>
          <Divider />
          <Section>
            <SectionLabel>2. Execute the trade</SectionLabel>
            <p>
              When you click the button below, we will attempt to execute a
              market order trade via Kyber for your target token.
            </p>
            <Button
              onClick={this.executeChange}
              variant="raised"
              color="primary"
            >
              Execute trade with Kyber
            </Button>
          </Section>
        </DialogContent>
      </Dialog>
    );
  }
}
