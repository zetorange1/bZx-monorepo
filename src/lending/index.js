import Section, { SectionLabel, Divider } from "../common/FormSection";
import LoanItem from "./LoanItem";

const openLoans = [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }];

const closedLoans = [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }];

export default () => (
  <div>
    <Section>
      <SectionLabel>Open Loans</SectionLabel>
      {openLoans.map(x => <LoanItem key={x.id} />)}
    </Section>
    <Divider />
    <Section>
      <SectionLabel>Closed Loans</SectionLabel>
      {closedLoans.map(x => <LoanItem key={x.id} />)}
    </Section>
  </div>
);
