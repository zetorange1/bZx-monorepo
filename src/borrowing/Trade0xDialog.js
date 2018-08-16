import styled from "styled-components";
import Dialog, { DialogTitle, DialogContent } from "material-ui/Dialog";
import Button from "material-ui/Button";
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

const TextArea = styled.textarea`
  margin: 12px 0;
  width: 480px;
  max-width: 100%;
  font-family: monospace;
`;

export default class Trade0xDialog extends React.Component {
  state = { value: `` };

  handleChange = e => this.setState({ value: e.target.value });

  executeTrade = async () => {
    const { web3, bZx, accounts, loanOrderHash } = this.props;
    const { value } = this.state;

    let order0x;
    try {
      order0x = JSON.parse(value);
    } catch (error) {
      console.error(error);
      alert(`Error parsing your JSON order object.`);
      return;
    }

    const txOpts = {
      from: accounts[0],
      gas: 1000000,
      gasPrice: web3.utils.toWei(`5`, `gwei`).toString()
    };

    console.log(`Executing 0x trade`);
    console.log({
      order0x,
      orderHashBZx: loanOrderHash,
      getObject: true,
      txOpts
    });

    if (bZx.portalProviderName !== `MetaMask`) {
      alert(`Please confirm this transaction on your device.`);
    }

    const txObj = await bZx.tradePositionWith0x({
      order0x,
      orderHashBZx: loanOrderHash,
      getObject: true,
      txOpts
    });

    try {
      await txObj
        .estimateGas(txOpts)
        .then(gas => {
          console.log(gas);
          txOpts.gas = gas;
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
    const { value } = this.state;
    return (
      <Dialog open={this.props.open} onClose={this.props.onClose}>
        <DialogTitle>Execute Trade with 0x Order</DialogTitle>
        <DialogContent>
          <Section>
            <SectionLabel>1. Paste in your 0x order</SectionLabel>
            <TextArea
              cols="30"
              rows="10"
              value={value}
              onChange={this.handleChange}
            />
          </Section>
          <Divider />
          <Section>
            <SectionLabel>2. Execute the trade</SectionLabel>
            <p>
              This function is for the user to present a pre-existing 0x order
              found elsewhere to bZx, so bZx can be the taker on behalf of the
              user.
            </p>
            <Button
              onClick={this.executeTrade}
              variant="raised"
              color="primary"
            >
              Execute trade
            </Button>
          </Section>
        </DialogContent>
      </Dialog>
    );
  }
}
