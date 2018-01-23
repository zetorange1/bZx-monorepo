import styled from "styled-components";
// import Typography from "material-ui/Typography";
import Button from "material-ui/Button";
import Section, { SectionLabel } from "../../common/FormSection";
import TokenPicker from "../../common/TokenPicker";

const Container = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;

  & > *:first-child {
    margin-bottom: 12px;
  }
`;

export default () => (
  <Section>
    <SectionLabel>Add new tracked token</SectionLabel>
    <Container>
      <TokenPicker setAddress={() => {}} value="WETH_SM_ADDRESS_HERE" />
      <Button raised color="primary">
        Add Token
      </Button>
    </Container>
  </Section>
);
