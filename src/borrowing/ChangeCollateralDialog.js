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
`;

export default class ChangeCollateralDialog extends React.Component {
  state = {
    tokenAddress: this.props.tokens[0].address,
    approvalLoading: false,
    tokenApproved: false
  };

  componentDidMount = async () => {
    this.checkAllowance();
  };

  setTokenAddress = tokenAddress => {
    this.setState({ tokenAddress }, () => {
      this.checkAllowance();
    });
  };

  checkAllowance = async () => {
    const { tokenAddress } = this.state;
    const { b0x, accounts, tokens } = this.props;
    const token = tokens.filter(t => t.address === tokenAddress)[0];
    console.log(`checking allowance`);
    console.log(token.name, token.address);
    const allowance = await b0x.getAllowance({
      tokenAddress: token.address,
      ownerAddress: accounts[0].toLowerCase()
    });
    console.log(`Allowance:`, allowance.toNumber());
    this.setState({
      tokenApproved: allowance.toNumber() !== 0,
      approvalLoading: false
    });
  };

  approveToken = async () => {
    const { tokenAddress } = this.state;
    const { b0x, tokens, accounts } = this.props;
    const token = tokens.filter(t => t.address === tokenAddress)[0];
    console.log(`approving allowance`);
    console.log(token.name, token.address);
    this.setState({ approvalLoading: true });
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
      })
      .on(`error`, error => {
        console.error(error.message);
      });
    setTimeout(() => this.checkAllowance(), 5000);
  };

  executeChange = async () => {
    const { b0x, web3, accounts, loanOrderHash } = this.props;
    const { tokenAddress } = this.state;
    const txOpts = {
      from: accounts[0],
      gas: 1000000,
      gasPrice: web3.utils.toWei(`5`, `gwei`).toString()
    };

    console.log(`Executing change:`);
    console.log({
      loanOrderHash,
      collateralTokenFilled: tokenAddress,
      txOpts
    });
    await b0x
      .changeCollateral({
        loanOrderHash,
        collateralTokenFilled: tokenAddress,
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
        alert(
          `We were not able to execute your transaction. Please check that you have sufficient tokens.`
        );
        this.props.onClose();
      });
    alert(`Execution complete.`);
    this.props.onClose();
  };

  render() {
    const { approvalLoading, tokenApproved } = this.state;
    return (
      <Dialog open={this.props.open} onClose={this.props.onClose}>
        <DialogTitle>Change Collateral</DialogTitle>
        <DialogContent>
          <Section>
            <SectionLabel>1. Choose your new collateral token</SectionLabel>
            <TokenPicker
              tokens={this.props.tokens}
              setAddress={this.setTokenAddress}
              value={this.state.tokenAddress}
            />
          </Section>
          <Divider />
          <Section>
            <SectionLabel>2. Approve the token</SectionLabel>
            {approvalLoading ? (
              <Button variant="raised" disabled>
                Approving...
              </Button>
            ) : (
              <Button
                variant="raised"
                onClick={this.approveToken}
                disabled={tokenApproved}
              >
                {tokenApproved ? `Token Approved` : `Approve Token`}
              </Button>
            )}
          </Section>
          <Divider />
          <Section>
            <SectionLabel>3. Execute the change</SectionLabel>
            <p>
              When you click the button below, we will attempt to transfer an
              amount equal to the required initial margin amount for the loan.
              Your old collateral token will automatically be refunded to your
              account.
            </p>
            <Button
              onClick={this.executeChange}
              variant="raised"
              color="primary"
              disabled={!tokenApproved}
            >
              Execute change
            </Button>
          </Section>
        </DialogContent>
      </Dialog>
    );
  }
}
