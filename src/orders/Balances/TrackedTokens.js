import styled from "styled-components";
// import Typography from "material-ui/Typography";
import Section, { SectionLabel } from "../../common/FormSection";
import { getTokenInfoWithIcon } from "../../common/tokens";
import TrackedTokenItem from "./TrackedTokenItem";
import { getTrackedTokens } from "./utils";

const Container = styled.div`
  width: 100%;
  max-width: 480px;
`;

export default class TrackedTokens extends React.Component {
  state = { trackedTokens: [] };

  componentDidMount() {
    const tokens = getTrackedTokens();
    this.setState({ trackedTokens: tokens });
  }

  render() {
    const tokenData = this.state.trackedTokens
      .map(getTokenInfoWithIcon)
      .map(t => ({ ...t, amount: 10 }));
    return (
      <Section>
        <SectionLabel>Tracked tokens</SectionLabel>
        <Container>
          {tokenData.map(token => <TrackedTokenItem token={token} />)}
        </Container>
      </Section>
    );
  }
}
