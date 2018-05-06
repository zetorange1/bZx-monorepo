/* eslint-disable */
import styled from "styled-components";
import MuiCard, {
  CardActions,
  CardContent as MuiCardContent
} from "material-ui/Card";
import Button from "material-ui/Button";
import Icon from "material-ui/Icon";
import IconButton from "material-ui/IconButton";
import Collapse from "material-ui/transitions/Collapse";

import CollateralOptions from "./CollateralOptions";

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

const Textarea = styled.textarea`
  width: 100%;
  height: 120px;
  margin-bottom: 16px;
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

    const collateralToken = tokens.filter(t => t.address === collateralTokenAddressFilled)[0];
    const collateralTokenSymbol = collateralToken.symbol;
    const loanTokenSymbol = getSymbol(tokens, loanTokenAddress);
    const interestTokenSymbol = getSymbol(tokens, interestTokenAddress);
    const positionTokenSymbol = getSymbol(tokens, positionTokenAddressFilled);

    const tradeOpened = positionTokenAddressFilled !== loanTokenAddress;

    const loanOpenedDate = new Date(loanStartUnixTimestampSec * 1000);
    if (this.props.hideDetails) {
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
              <Label>Lender </Label>
              <DataPoint>
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
          </CardContent>
        </Card>
      );
    }
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
<<<<<<< Updated upstream
            <CollateralOptions tokens={tokens} b0x={b0x} accounts={accounts} web3={web3} loanOrderHash={loanOrderHash} />
=======
            <CollateralOptions
              tokens={this.props.tokens}
              collateralToken={collateralToken}
            />
>>>>>>> Stashed changes
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
              {fromBigNumber(positionTokenAmountFilled, 1e18)}{" "}
              {positionTokenSymbol}
            </DataPoint>
          </DataPointContainer>

          <Button
            style={{ marginLeft: `auto` }}
            onClick={this.handleExpandClick}
          >
            Manage 0x trade
          </Button>
          <IconButton onClick={this.handleExpandClick}>
            <Icon>
              {this.state.expanded
                ? `keyboard_arrow_up`
                : `keyboard_arrow_down`}
            </Icon>
          </IconButton>
        </CardActions>
        <Collapse in={this.state.expanded} timeout="auto" unmountOnExit>
          {tradeOpened ? (
            <CardContent>
              <Button variant="raised" color="primary">
                Close trade with Kyber market order
              </Button>
              <p>Or, you may paste in a 0x order object:</p>
              <Textarea />
              <Button variant="raised">Close with 0x counter-trade</Button>
            </CardContent>
          ) : (
            <CardContent>
              <p>Paste in a 0x order here to open a trade with loaned funds:</p>
              <Textarea />
              <Button variant="raised" color="primary">
                Open a 0x trade
              </Button>
            </CardContent>
          )}
        </Collapse>
      </Card>
    );
  }
}
