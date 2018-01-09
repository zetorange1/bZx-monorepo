import styled from "styled-components";
import TextField from "material-ui/TextField";
import TokenPicker from "../../common/TokenPicker";
import Section, { SectionLabel } from "../../common/FormSection";

const Content = styled.div`
  display: flex;
  justify-content: center;
  flex-wrap: wrap;
`;

const TokenGroup = styled.div`
  width: 240px;
  margin: 24px;
  text-align: center;
`;

// TODO - clean up these styles
const Title = styled.div`
  margin-bottom: 24px !important;
  color: rgba(0, 0, 0, 0.54);
  padding: 0;
  font-size: 1rem;
  line-height: 1;
`;

export default ({
  role,
  // state setters
  setStateForAddress,
  setStateForInput,
  // address states
  lendTokenAddress,
  interestTokenAddress,
  marginTokenAddress,
  // amount states
  lendTokenAmount,
  interestAmount
}) => (
  <Section>
    <SectionLabel>Tokens and Token Amounts</SectionLabel>
    <Content>
      <TokenGroup>
        <Title>Lending Token</Title>
        <TokenPicker
          setAddress={setStateForAddress(`lendTokenAddress`)}
          value={lendTokenAddress}
        />
        <TextField
          type="number"
          label="Lend token amount"
          value={lendTokenAmount}
          onChange={setStateForInput(`lendTokenAmount`)}
          margin="normal"
          required
          fullWidth
        />
      </TokenGroup>

      <TokenGroup>
        <Title>Interest Token</Title>
        <TokenPicker
          setAddress={setStateForAddress(`interestTokenAddress`)}
          value={interestTokenAddress}
        />
        <TextField
          type="number"
          id="interestAmount"
          label="Interest amount"
          value={interestAmount}
          onChange={setStateForInput(`interestAmount`)}
          margin="normal"
          helperText="Total paid per day to lender"
          required
          fullWidth
        />
      </TokenGroup>

      {role === `lender` && (
        <TokenGroup>
          <Title>Margin Token</Title>
          <TokenPicker
            setAddress={setStateForAddress(`marginTokenAddress`)}
            value={marginTokenAddress}
          />
        </TokenGroup>
      )}
    </Content>
  </Section>
);
