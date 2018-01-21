import styled from "styled-components";
import Typography from "material-ui/Typography";
import Section, { SectionLabel } from "../../common/FormSection";

const Container = styled.div`
  width: 100%;
  text-align: left;
`;

export default () => (
  <Section>
    <SectionLabel>Tracked tokens</SectionLabel>
    <div>
      <p>TODO — show list of tokens currently tracked</p>
    </div>
  </Section>
);
