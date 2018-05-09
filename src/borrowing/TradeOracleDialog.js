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

export default class TradeOracleDialog extends React.Component {
  state = { tokenAddress: this.props.tokens[0].address };

  setTokenAddress = tokenAddress => this.setState({ tokenAddress });

  executeChange = async () => {
    const { b0x, web3, accounts, loanOrderHash } = this.props;
    const { tokenAddress } = this.state;
    const txOpts = {
      from: accounts[0],
      gas: 1000000,
      gasPrice: web3.utils.toWei(`30`, `gwei`).toString()
    };

    console.log(`Executing trade with Kyber:`);
    console.log({
      orderHash: loanOrderHash,
      tradeTokenAddress: tokenAddress,
      txOpts
    });
    await b0x
      .tradePositionWithOracle({
        orderHash: loanOrderHash,
        tradeTokenAddress: tokenAddress,
        txOpts
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
        console.error(error);
        alert(`We were not able to execute your transaction.`);
        this.props.onClose();
      });
    alert(`Trade execution complete. Please refresh to see changes.`);
    this.props.onClose();
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
