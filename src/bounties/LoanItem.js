import styled from "styled-components";
import MuiCard, { CardContent as MuiCardContent } from "material-ui/Card";
import Button from "material-ui/Button";

import { COLORS } from "../styles/constants";

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
  state = { expanded: false };

  handleExpandClick = () => this.setState({ expanded: !this.state.expanded });

  liquidate = () => {
    // do stuff to initiate liquidation
    alert(`liquidate loan`);
  };

  render() {
    const { data, b0x } = this.props;
    const marginLevel = 1.2;
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

          <DataPointContainer>
            <Label>Margin Level </Label>
            <DataPoint>{marginLevel * 100}%</DataPoint>
          </DataPointContainer>

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
