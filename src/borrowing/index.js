/* eslint-disable */
import Section, { SectionLabel } from "../common/FormSection";
import OpenLoan from "./OpenLoan";
import ClosedLoan from "./ClosedLoan";

const openLoans = [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }];

const closedLoans = [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }];

export default class Borrowing extends React.Component {
  state = { positions: [] };

  async componentDidMount() {
    const { b0x, accounts } = this.props;
    const positions = await b0x.getLoansForTrader({
      address: accounts[0],
      start: 0,
      count: 10
    });
    this.setState({ positions });
  }

  render() {
    const { tokens } = this.props;
    const { positions } = this.state;
    const openPositions = positions.filter(p => p.active === 1);
    const closedPositions = positions.filter(p => p.active === 0);
    return (
      <div>
        <Section>
          <SectionLabel>Open Loans</SectionLabel>
          {openPositions.map(data => (
            <OpenLoan
              key={data.loanOrderHash}
              tokens={tokens}
              data={data}
              zeroExTradeOpened
            />
          ))}
        </Section>
        <Section>
          <SectionLabel>Closed Loans</SectionLabel>
          {/* {closedPositions.map(x => <ClosedLoan key={x.id} />)} */}
        </Section>
      </div>
    );
  }
}
