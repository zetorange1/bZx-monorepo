import Section, { SectionLabel } from "../common/FormSection";
import OpenLoan from "./OpenLoan";
import ClosedLoan from "./ClosedLoan";

const openLoans = [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }];

const closedLoans = [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }];

export default ({ tokens }) => (
  <div>
    <Section>
      <SectionLabel>Open Loans</SectionLabel>
      {openLoans.map(x => (
        <OpenLoan key={x.id} tokens={tokens} zeroExTradeOpened />
      ))}
      {openLoans.map(x => <OpenLoan key={x.id} tokens={tokens} />)}
    </Section>
    <Section>
      <SectionLabel>Closed Loans</SectionLabel>
      {closedLoans.map(x => <ClosedLoan key={x.id} />)}
    </Section>
  </div>
);
