import styled from "styled-components";
import MuiCard, { CardContent as MuiCardContent } from "material-ui/Card";

const CardContent = styled(MuiCardContent)`
  position: relative;
`;

const Card = styled(MuiCard)`
  width: 100%;
  margin-bottom: 24px;
`;

const Pre = styled.pre`
  overflow: auto;
  background: #ddd;
  padding: 12px;
`;

export default class OrderItem extends React.Component {
  // state = { loanPositions: [] };

  async componentDidMount() {
    // const { b0x, accounts } = this.props;
    // const loanPositions = await b0x.getLoanPositions({
    //   loanPartyAddress: accounts[0].toLowerCase(),
    //   start: 0,
    //   count: 10
    // });
    // console.log(`loanPositions`, loanPositions);
    // this.setState({ loanPositions });
  }

  render() {
    const { order, accounts } = this.props;
    // const { loanPositions } = this.state;
    const isMaker = order.makerRole === accounts[0].toLowerCase();
    return (
      <Card>
        <CardContent>
          <div>Your role: {isMaker ? `Maker` : `Lender`}</div>
          <Pre>{JSON.stringify(order, null, 4)}</Pre>
          {/* <Pre>{JSON.stringify(loanPositions, null, 4)}</Pre> */}
        </CardContent>
      </Card>
    );
  }
}
