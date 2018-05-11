import styled from "styled-components";
import MuiCard, { CardContent as MuiCardContent } from "material-ui/Card";
import { fromBigNumber, toBigNumber } from "../common/utils";

import { COLORS } from "../styles/constants";

import WithdrawInterest from "./WithdrawInterest";

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

// const LowerUpperRight = styled.div`
//   position: absolute;
//   top: 72px;
//   right: 16px;
// `;

export default class LoanItem extends React.Component {
  state = { expanded: false };

  handleExpandClick = () => this.setState({ expanded: !this.state.expanded });

  withdrawInterest = () => {
    // do stuff to initiate interest withdrawal here
    alert(`withdraw interest`);
  };

  render() {
    const { tokens, b0x, accounts, web3 } = this.props;
    const {
      collateralTokenAmountFilled,
      collateralTokenAddressFilled,
      interestTokenAddress,
      interestTotalAccrued,
      interestPaidSoFar,
      loanTokenAddress,
      loanTokenAmountFilled,
      positionTokenAddressFilled,
      positionTokenAmountFilled,
      loanOrderHash,
      trader,
      loanStartUnixTimestampSec
    } = this.props.data;

    const getToken = address => tokens.filter(t => t.address === address)[0];

    const collateralToken = getToken(collateralTokenAddressFilled);
    const interestToken = getToken(interestTokenAddress);
    const loanToken = getToken(loanTokenAddress);
    const positionToken = getToken(positionTokenAddressFilled);

    const availableForWithdrawal = toBigNumber(interestTotalAccrued).minus(
      toBigNumber(interestPaidSoFar)
    );

    const loanOpenedDate = new Date(loanStartUnixTimestampSec * 1000);
    return (
      <Card>
        <CardContent>
          <DataPointContainer>
            <Label>Order # </Label>
            <DataPoint>
              <Hash href="#" target="_blank" rel="noopener noreferrer">
                {loanOrderHash}
              </Hash>
            </DataPoint>
          </DataPointContainer>

          <DataPointContainer>
            <Label>Borrower </Label>
            <DataPoint>
              <Hash href="#" target="_blank" rel="noopener noreferrer">
                {trader}
              </Hash>
            </DataPoint>
          </DataPointContainer>

          {/* this.props.closed ? (
            <UpperRight>
              <Label>Loan Closed</Label>
              <div title={loanClosedDate.toUTCString()}>
                {loanClosedDate.toLocaleString()}
              </div>
            </UpperRight>
          ) : (
            <UpperRight>
              <Label>Loan Opened</Label>
              <div title={loanOpenedDate.toUTCString()}>
                {loanOpenedDate.toLocaleString()}
              </div>
            </UpperRight>
          ) */}

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
              {collateralToken.symbol}
            </DataPoint>
          </DataPointContainer>

          <DataPointContainer>
            <Label>Borrowed</Label>
            <DataPoint>
              {fromBigNumber(loanTokenAmountFilled, 1e18)} {loanToken.symbol}
            </DataPoint>
          </DataPointContainer>

          <DataPointContainer>
            <Label>Trade Amount</Label>
            <DataPoint>
              {fromBigNumber(positionTokenAmountFilled, 1e18)}
              {` `}
              {positionToken.symbol}
            </DataPoint>
          </DataPointContainer>

          <br />

          <DataPointContainer>
            <Label>Total interest accrued</Label>
            <DataPoint>
              {fromBigNumber(interestTotalAccrued, 1e18)} {interestToken.symbol}
            </DataPoint>
          </DataPointContainer>

          <DataPointContainer>
            <Label>Total interest withdrawn</Label>
            <DataPoint>
              {fromBigNumber(interestPaidSoFar, 1e18)} {interestToken.symbol}
            </DataPoint>
          </DataPointContainer>

          <DataPointContainer>
            <Label>Available for withdrawal (minus fees)</Label>
            <DataPoint style={{ marginRight: `12px` }}>
              {fromBigNumber(availableForWithdrawal, 1e18)}
              {` `}
              {interestToken.symbol}
            </DataPoint>
          </DataPointContainer>

          <div style={{ marginTop: `12px` }}>
            <WithdrawInterest
              b0x={b0x}
              trader={trader}
              availableForWithdrawal={availableForWithdrawal}
              symbol={interestToken.symbol}
              accounts={accounts}
              web3={web3}
              loanOrderHash={loanOrderHash}
            />
          </div>

          {/* this.props.closed && <br /> */}

          {/* this.props.closed && (
            <DataPointContainer>
              <Label>Loan Opened</Label>
              <DataPoint title={loanOpenedDate.toUTCString()}>
                {loanOpenedDate.toLocaleString()}
              </DataPoint>
            </DataPointContainer>
          ) */}
        </CardContent>
      </Card>
    );
  }
}
