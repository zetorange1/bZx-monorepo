import styled from "styled-components";
// import Typography from "material-ui/Typography";
import Section, { SectionLabel } from "../../common/FormSection";
import { getTokenInfoWithIcon } from "../../common/tokens";
import TrackedTokenItem from "./TrackedTokenItem";

const Container = styled.div`
  width: 100%;
  max-width: 480px;
`;

const tokenAddresses = [`WETH_SM_ADDRESS_HERE`, `ZRX_SM_ADDRESS_HERE`];

const tempData = tokenAddresses
  .map(getTokenInfoWithIcon)
  .map(t => ({ ...t, amount: 10 }));

export default () => (
  <Section>
    <SectionLabel>Tracked tokens</SectionLabel>
    <Container>
      {tempData.map(token => <TrackedTokenItem token={token} />)}
    </Container>
  </Section>
);
