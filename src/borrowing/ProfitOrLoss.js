import { Fragment } from "react";
import styled from "styled-components";
import Button from "material-ui/Button";
import Dialog, { DialogContent } from "material-ui/Dialog";
import { COLORS } from "../styles/constants";
import { fromBigNumber } from "../common/utils";
import { SectionLabel } from "../common/FormSection";

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

export default class ProfitOrLoss extends React.Component {
  state = {
    loading: true,
    profit: null,
    isProfit: null,
    showDialog: false
  };

  componentDidMount = () => {
    this.getProfitOrLoss();
  };

  getProfitOrLoss = async () => {
    const { b0x, web3, loanOrderHash, accounts } = this.props;
    const txOpts = {
      from: accounts[0],
      gas: 1000000,
      gasPrice: web3.utils.toWei(`5`, `gwei`).toString()
    };
    const data = await b0x.getProfitOrLoss({
      loanOrderHash,
      trader: accounts[0],
      txOpts
    });
    this.setState({
      loading: false,
      profit: data.profitOrLoss,
      isProfit: data.isProfit
    });
  };

  withdrawProfit = async () => {
    const { b0x, accounts, web3, loanOrderHash } = this.props;
    const txOpts = {
      from: accounts[0],
      gas: 1000000,
      gasPrice: web3.utils.toWei(`5`, `gwei`).toString()
    };
    await b0x
      .withdrawProfit({
        loanOrderHash,
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
          `We were not able to execute your transaction. Please check the error logs.`
        );
        this.closeDialog();
      });
    alert(`Execution complete.`);
    this.closeDialog();
  };

  openDialog = () => this.setState({ showDialog: true });
  closeDialog = () => this.setState({ showDialog: false });

  render() {
    const { loading, profit, isProfit, showDialog } = this.state;
    const { symbol } = this.props;
    return (
      <Fragment>
        <br />
        <DataPointContainer>
          <Label>Profit/Loss</Label>
          {loading ? (
            <DataPoint>Loading...</DataPoint>
          ) : (
            <Fragment>
              <DataPoint>
                {!isProfit && profit.toString() !== `0` && `-`}
                {fromBigNumber(profit, 1e18)}
                {` ${symbol}`}
              </DataPoint>
              {isProfit &&
                profit !== 0 && (
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
            <SectionLabel>Withdraw Profit</SectionLabel>
            <p>
              This will withdraw {profit} {symbol} from your loan.
            </p>
            <Button
              onClick={this.withdrawProfit}
              variant="raised"
              color="primary"
            >
              I understand, withdraw profit.
            </Button>
          </DialogContent>
        </Dialog>
      </Fragment>
    );
  }
}
