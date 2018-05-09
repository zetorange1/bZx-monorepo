import styled from "styled-components";
import MuiButton from "material-ui/Button";

import Section, { SectionLabel } from "../common/FormSection";
import OpenLoan from "./OpenLoan";
// import ClosedLoan from "./ClosedLoan";

const InfoContainer = styled.div`
  display: flex;
  align-items: center;
`;

const ShowCount = styled.div`
  display: inline-block;
  margin: 6px;
`;

const Button = styled(MuiButton)`
  margin: 6px !important;
`;

export default class Borrowing extends React.Component {
  state = { loans: [], loading: false, count: 10 };

  componentDidMount() {
    this.getLoans();
  }

  getLoans = async () => {
    const { b0x, accounts } = this.props;
    this.setState({ loans: [], loading: true });
    const loans = await b0x.getLoansForTrader({
      address: accounts[0],
      start: 0,
      count: this.state.count
    });
    console.log(loans);
    this.setState({ loans, loading: false });
  };

  increaseCount = () => {
    this.setState(p => ({ count: p.count + 10 }), this.getLoans);
  };

  render() {
    const { b0x, tokens, accounts, web3 } = this.props;
    const { loans, loading, count } = this.state;
    const openPositions = loans.filter(p => p.active === 1);
    // const closedPositions = loans.filter(p => p.active === 0);
    return (
      <div>
        <InfoContainer>
          <ShowCount>
            Showing last {count} loans ({loans.length} loans found).
          </ShowCount>
          <Button onClick={this.increaseCount} variant="raised" color="primary">
            Show more
          </Button>
          <Button onClick={this.getOrders} variant="raised" disabled={loading}>
            {loading ? `Refreshing...` : `Refresh`}
          </Button>
        </InfoContainer>
        <br />
        <Section>
          <SectionLabel>Open Loans</SectionLabel>
          {openPositions.map(data => (
            <OpenLoan
              key={data.loanOrderHash}
              b0x={b0x}
              tokens={tokens}
              accounts={accounts}
              data={data}
              web3={web3}
              zeroExTradeOpened
            />
          ))}
        </Section>
        <Section>
          <SectionLabel>Closed Loans</SectionLabel>
          None
          {/* {closedPositions.map(x => <ClosedLoan key={x.id} />)} */}
        </Section>
      </div>
    );
  }
}
