import styled from "styled-components";
import MuiButton from "material-ui/Button";
import FormControlLabel from "material-ui/Form";
import Checkbox from "material-ui/Checkbox";
import Section from "../../common/FormSection";

const Button = styled(MuiButton)`
  width: 100%;
  max-width: 480px;
`;

const Submission = ({ onSubmit, pushOnChainCheckbox, pushOnChain }) => (
  <Section>
    <div>
      <FormControlLabel
        control={
          <Checkbox checked={pushOnChain} onChange={pushOnChainCheckbox} />
        }
        label="Push order on chain"
      />
    </div>
    <Button variant="raised" color="primary" onClick={onSubmit}>
      {pushOnChain ? `Sign Order and Push` : `Sign Order`}
    </Button>
  </Section>
);

export default Submission;
