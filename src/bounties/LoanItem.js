import { Fragment } from "react";
import styled from "styled-components";
import MuiCard, { CardContent as MuiCardContent } from "material-ui/Card";
import Button from "material-ui/Button";
import BigNumber from "bignumber.js";

import { fromBigNumber } from "../common/utils";

import { COLORS } from "../styles/constants";

const TxHashLink = styled.a.attrs({
  target: `_blank`,
  rel: `noopener noreferrer`
})`
  font-family: monospace;
  display: block;
  text-overflow: ellipsis;
  overflow: auto;
`;

const CardContent = styled(MuiCardContent)`
  position: relative;
`;

const Card = styled(MuiCard)`
  width: 100%;
  margin-bottom: 24px;
`;

const DataPointContainer = styled.div`
  display: flex;
  justify-content: flex-start;
  align-items: center;
`;

const DataPoint = styled.span`
  margin-left: 16px;
`;

const OrderHash = styled.span`
  display: inline-block;
  font-family: monospace;
`;

const HashLink = styled.a`
  display: inline-block;
  font-family: monospace;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 20ch;
`;

const Label = styled.span`
  font-weight: 600;
  color: ${COLORS.gray};
`;

export default class LoanItem extends React.Component {
  state = {
    loadingMargins: true,
    initialMarginAmount: null,
    maintenanceMarginAmount: null,
    currentMarginAmount: null
  };

  componentDidMount = async () => {
    this.getMarginLevels();
  };

  getMarginLevels = async () => {
    const { b0x, data } = this.props;
    this.setState({ loadingMargins: true });
    const marginLevels = await b0x.getMarginLevels({
      loanOrderHash: data.loanOrderHash,
      trader: data.trader
    });
    console.log(marginLevels);
    this.setState({
      loadingMargins: false,
      initialMarginAmount: marginLevels.initialMarginAmount,
      maintenanceMarginAmount: marginLevels.maintenanceMarginAmount,
      currentMarginAmount: marginLevels.currentMarginAmount
    });
  };

  handleExpandClick = () => this.setState({ expanded: !this.state.expanded });

  liquidate = async () => {
    const { b0x, web3, accounts, data } = this.props;
    const { loanOrderHash, trader } = data;

    const txOpts = {
      from: accounts[0],
      gas: 1000000,
      gasPrice: web3.utils.toWei(`5`, `gwei`).toString()
    };

    b0x
      .liquidateLoan({
        loanOrderHash,
        trader,
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
        alert(`We were not able to liquidate this loan.`);
      })
      .then(() => alert(`Loan liquidation execution complete.`));
  };

  render() {
    const { data, b0x } = this.props;
    const {
      loadingMargins,
      initialMarginAmount,
      maintenanceMarginAmount,
      currentMarginAmount
    } = this.state;
    const isSafe = BigNumber(currentMarginAmount)
      .dividedBy(1e18)
      .gt(maintenanceMarginAmount);
    return (
      <Card>
        <CardContent>
          <DataPointContainer>
            <Label>Order # </Label>
            <DataPoint>
              <OrderHash>{data.loanOrderHash}</OrderHash>
            </DataPoint>
          </DataPointContainer>

          <DataPointContainer>
            <Label>Trader </Label>
            <DataPoint>
              <HashLink
                href={`${b0x.etherscanURL}address/${data.trader}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                {data.trader}
              </HashLink>
            </DataPoint>
          </DataPointContainer>

          {loadingMargins ? (
            <DataPointContainer>Loading margin levels...</DataPointContainer>
          ) : (
            <Fragment>
              <DataPointContainer>
                <Label>Initial margin</Label>
                <DataPoint>{initialMarginAmount}%</DataPoint>
              </DataPointContainer>

              <DataPointContainer>
                <Label>Maintenance margin</Label>
                <DataPoint>{maintenanceMarginAmount}%</DataPoint>
              </DataPointContainer>

              <br />

              <DataPointContainer>
                <Label>Current margin level</Label>
                <DataPoint>
                  {fromBigNumber(currentMarginAmount, 1e18)}%
                </DataPoint>
                <DataPoint>{isSafe ? `Safe` : `Unsafe`}</DataPoint>
              </DataPointContainer>
            </Fragment>
          )}

          <DataPointContainer>
            <Button
              style={{ marginTop: `12px` }}
              variant="raised"
              onClick={this.liquidate}
            >
              Liquidate
            </Button>
          </DataPointContainer>
        </CardContent>
      </Card>
    );
  }
}
