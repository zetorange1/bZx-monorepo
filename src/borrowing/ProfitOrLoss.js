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

  withdrawProfit = () => {
    alert(`withdraw profit`);
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
                {!isProfit && `-`}
                {fromBigNumber(profit, 1e18)}
                {` ${symbol}`}
              </DataPoint>
              {isProfit && (
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
