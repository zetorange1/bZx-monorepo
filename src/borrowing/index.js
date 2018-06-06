import styled from "styled-components";
import MuiButton from "material-ui/Button";

import Section, { SectionLabel } from "../common/FormSection";
import OpenedLoan from "./OpenLoanItem";
import ClosedLoan from "./ClosedLoanItem";

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
    const openLoans = loans.filter(p => p.active === 1);
    const closedLoans = loans.filter(p => p.active === 0);
    if (loans.length === 0) {
      return <div>No loans found.</div>;
    }
    return (
      <div>
        <InfoContainer>
          <ShowCount>
            Showing last {count} loans ({loans.length} loans found).
          </ShowCount>
          <Button onClick={this.increaseCount} variant="raised" color="primary">
            Show more
          </Button>
          <Button onClick={this.getLoans} variant="raised" disabled={loading}>
            {loading ? `Refreshing...` : `Refresh`}
          </Button>
        </InfoContainer>
        <br />
        <Section>
          <SectionLabel>Open Loans ({openLoans.length})</SectionLabel>
          {openLoans.map(data => (
            <OpenedLoan
              key={data.loanOrderHash + data.trader}
              b0x={b0x}
              tokens={tokens}
              accounts={accounts}
              data={data}
              web3={web3}
            />
          ))}
        </Section>
        <Section>
          <SectionLabel>Closed Loans ({closedLoans.length})</SectionLabel>
          {closedLoans.map(data => (
            <ClosedLoan
              key={data.loanOrderHash + data.trader}
              b0x={b0x}
              tokens={tokens}
              accounts={accounts}
              data={data}
            />
          ))}
          {closedLoans.length === 0 && `None`}
        </Section>
      </div>
    );
  }
}
