import MuiButton from "@material-ui/core/Button";
import styled from "styled-components";
import Section, { SectionLabel } from "../common/FormSection";
import TrackedTokenItem from "./TrackedTokenItem";
import { getIconURL } from "../common/tokens";

const Button = styled(MuiButton)`
  margin-right: auto !important;
  margin-bottom: 12px !important;
`;

const Container = styled.div`
  width: 100%;
`;

const TrackedTokens = ({
  tokens,
  trackedTokens,
  updateTrackedTokens,
  bZx,
  accounts,
  web3
}) => {
  const tokenData = tokens.filter(t => trackedTokens.includes(t.address));
  const tokenDataWithIcon = tokenData.map(t => ({
    ...t,
    iconUrl: getIconURL(t)
  }));
  return (
    <Section>
      <SectionLabel>Tracked tokens</SectionLabel>
      <Button variant="raised" onClick={() => updateTrackedTokens(true)}>
        Refresh
      </Button>
      <Container>
        {tokenDataWithIcon.map(token => (
          <TrackedTokenItem
            key={token.address}
            token={token}
            updateTrackedTokens={updateTrackedTokens}
            bZx={bZx}
            accounts={accounts}
            tokens={tokens}
            web3={web3}
          />
        ))}
      </Container>
    </Section>
  );
};

export default TrackedTokens;
