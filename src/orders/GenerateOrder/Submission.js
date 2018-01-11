import Button from "material-ui/Button";
import Section from "../../common/FormSection";

const Submission = ({ onSubmit }) => (
  <Section>
    {/* <Hash>Order hash: {hash}</Hash> */}
    <Button raised color="primary" onClick={onSubmit}>
      Sign Order
    </Button>
  </Section>
);

export default Submission;
