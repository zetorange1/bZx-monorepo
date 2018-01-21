import Section, { SectionLabel, Divider } from "../../common/FormSection";

import EtherSection from "./Ether";

export default class Balances extends React.Component {
  state = {};

  render() {
    return (
      <div>
        <EtherSection />
        <Divider />
        <Section>
          <SectionLabel>Tracked tokens</SectionLabel>
          <div>
            <p>TODO — show list of tokens currently tracked</p>
          </div>
        </Section>
        <Divider />
        <Section>
          <SectionLabel>Add new tracked token</SectionLabel>
          <div>
            <p>
              TODO — show a token picker with list of tokens not currently
              tracked
            </p>
          </div>
        </Section>
      </div>
    );
  }
}

// - "Balances" - lets the maker or taker of a lend order specify the tokens they want our smart contract to use for the purposes of making or taking an order (similar to the 0x portal)
