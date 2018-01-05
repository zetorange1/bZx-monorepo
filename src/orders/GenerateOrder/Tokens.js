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

const Title = styled.div`
  margin-bottom: 24px !important;
  color: rgba(0, 0, 0, 0.54);
  padding: 0;
  font-size: 1rem;
  font-family: -apple-system, system-ui, BlinkMacSystemFont, "Segoe UI", Roboto,
    "Helvetica Neue", Arial, sans-serif;
  line-height: 1;
`;

export default ({
  role,
  setStateFor,
  lendTokenAddress,
  interestTokenAddress,
  marginTokenAddress
}) => (
  <Section>
    <SectionLabel>Tokens and Token Amounts</SectionLabel>
    <Content>
      <TokenGroup>
        <Title>Lending Token</Title>
        <TokenPicker
          onChange={setStateFor(`lendTokenAddress`)}
          value={lendTokenAddress}
        />
        <TextField
          type="number"
          id="lendTokenAmount"
          label="Lend token amount"
          defaultValue="42"
          margin="normal"
          required
          fullWidth
        />
      </TokenGroup>

      <TokenGroup>
        <Title>Interest Token</Title>
        <TokenPicker
          onChange={setStateFor(`interestTokenAddress`)}
          value={interestTokenAddress}
        />
        <TextField
          type="number"
          id="interestAmount"
          label="Interest amount"
          defaultValue="42"
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
            onChange={setStateFor(`marginTokenAddress`)}
            value={marginTokenAddress}
          />
        </TokenGroup>
      )}
    </Content>
  </Section>
);
