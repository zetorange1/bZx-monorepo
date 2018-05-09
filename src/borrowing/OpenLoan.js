import styled from "styled-components";
import MuiCard, {
  CardActions,
  CardContent as MuiCardContent
} from "material-ui/Card";
import Button from "material-ui/Button";

import CollateralOptions from "./CollateralOptions";
import TradeOptions from "./TradeOptions";

import { COLORS } from "../styles/constants";
import { getSymbol } from "../common/tokens";
import { fromBigNumber } from "../common/utils";

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

const Hash = styled.a`
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

const UpperRight = styled.div`
  position: absolute;
  top: 16px;
  right: 16px;

  display: flex;
  flex-direction: column;
  align-items: flex-end;
`;

const LowerUpperRight = styled.div`
  position: absolute;
  top: 72px;
  right: 16px;
`;

export default class OpenLoan extends React.Component {
  state = { expanded: false };

  handleExpandClick = () => this.setState({ expanded: !this.state.expanded });

  render() {
    const { tokens, b0x, accounts, web3 } = this.props;
    const {
      collateralTokenAddressFilled,
      collateralTokenAmountFilled,
      positionTokenAddressFilled,
      positionTokenAmountFilled,
      interestTokenAddress,
      interestTotalAccrued,
      interestPaidSoFar,
      loanTokenAmountFilled,
      loanTokenAddress,
      loanStartUnixTimestampSec,
      loanOrderHash,
      lender
    } = this.props.data;

    const collateralToken = tokens.filter(
      t => t.address === collateralTokenAddressFilled
    )[0];
    const collateralTokenSymbol = collateralToken.symbol;
    const loanTokenSymbol = getSymbol(tokens, loanTokenAddress);
    const interestTokenSymbol = getSymbol(tokens, interestTokenAddress);
    const positionTokenSymbol = getSymbol(tokens, positionTokenAddressFilled);

    const tradeOpened = positionTokenAddressFilled !== loanTokenAddress;

    const loanOpenedDate = new Date(loanStartUnixTimestampSec * 1000);
    return (
      <Card>
        <CardContent>
          <DataPointContainer>
            <Label>Order # </Label>
            <DataPoint title={loanOrderHash}>
              <Hash href="#" target="_blank" rel="noopener noreferrer">
                {loanOrderHash}
              </Hash>
            </DataPoint>
          </DataPointContainer>

          <DataPointContainer>
            <Label>Lender </Label>
            <DataPoint title={lender}>
              <Hash href="#" target="_blank" rel="noopener noreferrer">
                {lender}
              </Hash>
            </DataPoint>
          </DataPointContainer>

          <UpperRight>
            <Label>Loan Opened</Label>
            <div title={loanOpenedDate.toUTCString()}>
              {loanOpenedDate.toLocaleString()}
            </div>
          </UpperRight>

          <hr />

          <DataPointContainer>
            <Label>Collateral</Label>
            <DataPoint>
              {fromBigNumber(collateralTokenAmountFilled, 1e18)}
              {` `}
              {collateralTokenSymbol}
            </DataPoint>
          </DataPointContainer>

          <DataPointContainer>
            <Label>Borrowed</Label>
            <DataPoint>
              {fromBigNumber(loanTokenAmountFilled, 1e18)} {loanTokenSymbol}
            </DataPoint>
          </DataPointContainer>

          <DataPointContainer>
            <Label>Interest paid so far</Label>
            <DataPoint>
              {fromBigNumber(interestPaidSoFar, 1e18)} {interestTokenSymbol}
            </DataPoint>
          </DataPointContainer>

          <DataPointContainer>
            <Label>Interest accrued (total)</Label>
            <DataPoint>
              {fromBigNumber(interestTotalAccrued, 1e18)} {interestTokenSymbol}
            </DataPoint>
          </DataPointContainer>

          <LowerUpperRight>
            <CollateralOptions
              tokens={tokens}
              b0x={b0x}
              accounts={accounts}
              web3={web3}
              loanOrderHash={loanOrderHash}
              collateralToken={collateralToken}
            />
          </LowerUpperRight>
        </CardContent>

        <CardActions>
          <DataPointContainer style={{ marginLeft: `12px` }}>
            <Label>0x trade opened</Label>
            <DataPoint>{Boolean(tradeOpened).toString()}</DataPoint>
          </DataPointContainer>

          <DataPointContainer style={{ marginLeft: `12px` }}>
            <Label>Trade Amount</Label>
            <DataPoint>
              {fromBigNumber(positionTokenAmountFilled, 1e18)}
              {` `}
              {positionTokenSymbol}
            </DataPoint>
          </DataPointContainer>

          <TradeOptions
            tokens={tokens}
            b0x={b0x}
            accounts={accounts}
            web3={web3}
            loanOrderHash={loanOrderHash}
          />
          <Button style={{ marginLeft: `12px` }}>Close Loan</Button>
        </CardActions>
      </Card>
    );
  }
}
