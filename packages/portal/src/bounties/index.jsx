import styled from "styled-components";
import MuiButton from "@material-ui/core/Button";

import Section, { SectionLabel } from "../common/FormSection";
import LoanItem from "./LoanItem";

import BZxComponent from "../common/BZxComponent";

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

export default class Bounties extends BZxComponent {
  state = { loans: [], loading: false, error: false, count: 10 };

  componentDidMount() {
    this.getLoans();
  }

  getLoans = async () => {
    const { bZx } = this.props;
    this.setState({ loading: true });
    try {
      const loans = await this.wrapAndRun(bZx.getActiveLoans({
        start: 0,
        count: this.state.count
      }));
      console.log(loans);
      this.setState({ loans, loading: false, error: false });
    } catch(e) {
      console.log(e);
      this.setState({ error: true, loading: false, loans: [] });
    }
  };

  increaseCount = () => {
    this.setState(p => ({ count: p.count + 10 }), this.getLoans);
  };

  render() {
    const { bZx, tokens, accounts, web3, setCurrentLoan, changeCard } = this.props;
    const { loans, loading, error, count } = this.state;
    if (error) {
      return (
        <div>
          <InfoContainer>
            <ShowCount>Web3 error loading loans. Please refresh in a few minutes.</ShowCount>
            <Button onClick={this.getLoans} variant="raised" disabled={false}>
              Refresh
            </Button>
          </InfoContainer>
        </div>
      );
    } else if (loans.length === 0) {
      return (
        <div>
          <InfoContainer>
            <ShowCount>No loans found.</ShowCount>
            <Button onClick={this.getLoans} variant="raised" disabled={loading}>
              {loading ? `Refreshing...` : `Refresh`}
            </Button>
          </InfoContainer>
        </div>
      );
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
          <SectionLabel>Active Loans ({loans.length})</SectionLabel>
          {loans.map(data => (
            <LoanItem
              key={data.loanOrderHash + data.trader}
              bZx={bZx}
              tokens={tokens}
              accounts={accounts}
              data={data}
              web3={web3}
              setCurrentLoan={setCurrentLoan}
              changeCard={changeCard}
            />
          ))}
        </Section>
      </div>
    );
  }
}
