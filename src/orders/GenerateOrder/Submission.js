import styled from "styled-components";
import MuiButton from "material-ui/Button";
import Section from "../../common/FormSection";

const Button = styled(MuiButton)`
  width: 100%;
  max-width: 480px;
`;

const Submission = ({ onSubmit }) => (
  <Section>
    <Button raised color="primary" onClick={onSubmit}>
      Sign Order
    </Button>
  </Section>
);

export default Submission;
