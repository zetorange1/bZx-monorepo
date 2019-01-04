import { Fragment } from "react";
import styled from "styled-components";
import Button from "@material-ui/core/Button";
import Dialog from "@material-ui/core/Dialog";
import DialogContent from "@material-ui/core/DialogContent";
import { COLORS } from "../styles/constants";
import { fromBigNumber } from "../common/utils";
import { SectionLabel } from "../common/FormSection";
import BZxComponent from "../common/BZxComponent";

const DataPointContainer = styled.div`
  display: flex;
  justify-content: flex-start;
  align-items: center;
`;

const DataPoint = styled.span`
  margin-left: 16px;
`;

const Label = styled.span`
  font-weight: 600;
  color: ${COLORS.gray};
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

export default class PositionExcess extends BZxComponent {
  state = {
    loading: true,
    error: false,
    withdrawAmount: 0,
    positionOffset: 0,
    loanOffset: 0,
    isPositive: null,
    showDialog: false
  };

  componentDidMount = () => {
    this.getPositionOffset();
  };

  componentDidUpdate(prevProps) {
    if (
      prevProps.data &&
      JSON.stringify(prevProps.data) !== JSON.stringify(this.props.data)
    )
      this.getPositionOffset();
  }

  getPositionOffset = async () => {
    const { bZx, web3, loanOrderHash, accounts } = this.props;
    this.setState({ loading: true, error: false });
    try {
      const data = await this.wrapAndRun(bZx.getPositionOffset({
        loanOrderHash,
        trader: accounts[0]
      }));
      console.log(`Amount ->`);
      console.log(data);
      await this.setState({
        loading: false,
        positionOffset: data.positionOffsetAmount,
        withdrawAmount: data.positionOffsetAmount, // TEMP
        loanOffset: data.loanOffsetAmount, // TEMP
        isPositive: data.isPositive
      });
    } catch(e) {
      console.log(e);
      this.setState({ error: true, loading: false });
    }
  };

  withdrawPosition = async () => {
    const { bZx, accounts, loanOrderHash } = this.props;
    const txOpts = {
      from: accounts[0],
      gas: 2000000,
      gasPrice: window.defaultGasPrice.toString()
    };

    if (bZx.portalProviderName !== `MetaMask`) {
      alert(`Please confirm this transaction on your device.`);
    }

    const txObj = await bZx.withdrawPosition({
      loanOrderHash,
      withdrawAmount: this.state.withdrawAmount,
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
              this.closeDialog();
            })
            .then(() => {
              alert(`Execution complete.`);
            })
            .catch(error => {
              console.error(error);
              alert(
                `We were not able to execute your transaction at this time.`
              );
              this.closeDialog();
            });
        })
        .catch(error => {
          console.error(error);
          alert(`The transaction is failing. Please try again later.`);
          this.closeDialog();
        });
    } catch (error) {
      console.error(error);
      alert(`The transaction is failing. Please try again later.`);
      this.closeDialog();
    }
  };

  openDialog = () => this.setState({ showDialog: true });
  closeDialog = () => this.setState({ showDialog: false });

  render() {
    const { loading, error, positionOffset, loanOffset, withdrawAmount, isPositive, showDialog } = this.state;
    const { symbol, decimals, loanTokenSymbol } = this.props;
    return (
      <Fragment>
        <br />
        <DataPointContainer>
          <Label>Position Excess/Deficit</Label>
          {loading && !error ? (
            <DataPointContainer><DataPoint>Loading position excess or deficit...</DataPoint></DataPointContainer>
          ) : 
          error ? (
            <DataPointContainer><DataPoint>Web3 error loading excess or deficit. Please refresh in a few minutes.</DataPoint></DataPointContainer>
          ) : (
            <Fragment>
              <DataPoint>
                {!isPositive && positionOffset.toString() !== `0` && `-`}
                {fromBigNumber(positionOffset, 10 ** decimals)}
                {` ${symbol}`}
                {loanTokenSymbol !== symbol ? (
                  <Fragment>
                    {` (`}
                    {!isPositive && loanOffset.toString() !== `0` && `-`}
                    {fromBigNumber(loanOffset, 10 ** decimals)}
                    {` ${loanTokenSymbol})`}
                  </Fragment>
                ) : `` }
              </DataPoint>
              {isPositive &&
                positionOffset.toString() !== `0` && (
                  <a
                    href="#"
                    style={{ marginLeft: `12px` }}
                    onClick={e => {
                      e.preventDefault();
                      this.openDialog();
                    }}
                  >
                    withdraw
                  </a>
                )}
            </Fragment>
          )}
        </DataPointContainer>
        <Dialog open={showDialog} onClose={this.closeDialog}>
          <DialogContent>
            <SectionLabel>Withdraw Position</SectionLabel>
            <p>
              This will withdraw {fromBigNumber(positionOffset, 10 ** decimals)}
              {` `}
              {symbol} from your loan.
            </p>
            <Button
              onClick={this.withdrawPosition}
              variant="raised"
              color="primary"
            >
              I understand, please proceed.
            </Button>
          </DialogContent>
        </Dialog>
      </Fragment>
    );
  }
}
