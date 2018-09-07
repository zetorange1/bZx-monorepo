import { Fragment } from "react";
import styled from "styled-components";
import Dialog from "@material-ui/core/Dialog";
import DialogContent from "@material-ui/core/DialogContent";
import DialogTitle from "@material-ui/core/DialogTitle";
import Button from "@material-ui/core/Button";
import TokenPicker from "../common/TokenPicker";
import Section, { SectionLabel, Divider } from "../common/FormSection";
import { getTokenConversionAmount, fromBigNumber } from "../common/utils";
import { getDecimals } from "../common/tokens";

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
    tradeToken: defaultToken(this.props.tokens),
    expectedAmount: 0
  };

  componentDidMount = async () => {
    await this.setTokenAddress(this.state.tradeToken.address);
  };

  setTokenAddress = async tokenAddress => {
    if (!this.props.order) await this.props.getSingleOrder();
    const tradeToken = this.props.tokens.filter(
      t => t.address === tokenAddress
    )[0];
    let expectedAmount = 0;
    expectedAmount = await getTokenConversionAmount(
      this.props.positionTokenAddressFilled,
      tokenAddress,
      this.props.positionTokenAmountFilled,
      this.props.order.oracleAddress,
      this.props.bZx
    );
    this.setState({
      tradeToken,
      expectedAmount: fromBigNumber(
        expectedAmount,
        10 ** getDecimals(this.props.tokens, tokenAddress)
      )
    });
  };

  executeChange = async () => {
    const { bZx, web3, accounts, loanOrderHash } = this.props;
    const { tradeToken } = this.state;

    const notAllowed = {
      1: [`ZRX`, `BZRXFAKE`],
      3: [`ZRX`, `BZRX`],
      4: [],
      42: [`ZRX`, `WETH`]
    };
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
      tradeTokenAddress: tradeToken.address,
      txOpts
    });

    if (bZx.portalProviderName !== `MetaMask`) {
      alert(`Please confirm this transaction on your device.`);
    }

    const txObj = await bZx.tradePositionWithOracle({
      orderHash: loanOrderHash,
      tradeTokenAddress: tradeToken.address,
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
              tokens={this.props.tokens.filter(
                t =>
                  this.state.tradeToken.address === this.props.positionTokenAddressFilled ||
                    t.address !== this.props.positionTokenAddressFilled
              )}
              setAddress={this.setTokenAddress}
              value={this.state.tradeToken.address}
            />
          </Section>
          <Divider />
          <Section>
            <SectionLabel>2. Execute the trade</SectionLabel>
            <p>
              When you click the button below, we will attempt to execute a
              market order trade via Kyber for your target token.
              {this.state.expectedAmount > 0 ? (
                <Fragment>
                  <br />
                  <br />
                  Estimated purchase amount is {this.state.expectedAmount}
                  {` `}
                  {this.state.tradeToken.symbol}.
                </Fragment>
              ) : (
                <Fragment>
                  <br />
                  <br />
                  Sorry, but Kyber can&apos;t handle this large of a trade for
                  {` `}
                  {this.state.tradeToken.symbol}. Please try again later.
                </Fragment>
              )}
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
