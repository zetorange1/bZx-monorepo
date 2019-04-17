import styled from "styled-components";
import MuiButton from "@material-ui/core/Button";
import FormControlLabel from "@material-ui/core/FormControlLabel";
import Checkbox from "@material-ui/core/Checkbox";
import Section from "../../common/FormSection";

const Button = styled(MuiButton)`
  width: 100%;
  max-width: 480px;
`;

const Submission = ({ onSubmit, setPushOnChainCheckbox, pushOnChain, sendToRelayExchange }) => (
  <Section>
    <div>
      <FormControlLabel
        control={
          <Checkbox 
            checked={pushOnChain}
            onChange={setPushOnChainCheckbox}
          />
        }
        label="Push order on chain"
      />
      {/*disabled={sendToRelayExchange}*/}
    </div>
    <Button variant="raised" color="primary" onClick={onSubmit}>
      {pushOnChain ? `Push On Chain` : `Sign Order`}
    </Button>
  </Section>
);

export default Submission;
