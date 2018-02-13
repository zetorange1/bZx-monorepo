import styled from "styled-components";
import Section, { SectionLabel } from "../../common/FormSection";
import TrackedTokenItem from "./TrackedTokenItem";
import { getIconURL } from "../../common/tokens";

const Container = styled.div`
  width: 100%;
  max-width: 480px;
`;

const TrackedTokens = ({ tokens, trackedTokens, updateTrackedTokens }) => {
  const tokenData = tokens.filter(t => trackedTokens.includes(t.address));
  const tokenDataWithIcon = tokenData.map(t => ({
    ...t,
    iconUrl: getIconURL(t)
  }));
  return (
    <Section>
      <SectionLabel>Tracked tokens</SectionLabel>
      <Container>
        {tokenDataWithIcon.map(token => (
          <TrackedTokenItem
            key={token.address}
            token={token}
            updateTrackedTokens={updateTrackedTokens}
          />
        ))}
      </Container>
    </Section>
  );
};

export default TrackedTokens;
