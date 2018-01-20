import Section, { SectionLabel, Divider } from "../common/FormSection";

export default class Balances extends React.Component {
  state = {};

  render() {
    return (
      <div>
        <Section>
          <SectionLabel>Ether</SectionLabel>
        </Section>
        <Divider />
        <Section>
          <SectionLabel>Tokens</SectionLabel>
        </Section>
      </div>
    );
  }
}

// - "Balances" - lets the maker or taker of a lend order specify the tokens they want our smart contract to use for the purposes of making or taking an order (similar to the 0x portal)
