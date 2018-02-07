import styled from "styled-components";
import TextField from "material-ui/TextField";
import Tooltip from "material-ui/Tooltip";

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

const MoreInfo = styled.span`
  text-decoration: underline;
  cursor: pointer;
`;

export default ({
  tokens,
  role,
  // state setters
  setStateForAddress,
  setStateForInput,
  // address states
  loanTokenAddress,
  interestTokenAddress,
  collateralTokenAddress,
  // amount states
  loanTokenAmount,
  interestAmount
}) => (
  <Section>
    <SectionLabel>Tokens and Token Amounts</SectionLabel>
    <Content>
      <TokenGroup>
        <Title>Loan Token</Title>
        <TokenPicker
          tokens={tokens}
          setAddress={setStateForAddress(`loanTokenAddress`)}
          value={loanTokenAddress}
        />
        <TextField
          type="number"
          label="Loan token amount"
          value={loanTokenAmount}
          onChange={setStateForInput(`loanTokenAmount`)}
          margin="normal"
          fullWidth
        />
      </TokenGroup>

      <TokenGroup>
        <Title>Interest Token</Title>
        <TokenPicker
          tokens={tokens}
          setAddress={setStateForAddress(`interestTokenAddress`)}
          value={interestTokenAddress}
        />
        <TextField
          type="number"
          id="interestAmount"
          label="Interest amount (paid per day)"
          value={interestAmount}
          onChange={setStateForInput(`interestAmount`)}
          margin="normal"
          helperText={
            <Tooltip title="This amount is prorated if the lend order is closed early by the trader, or if the trader's loan is liquidated.">
              <MoreInfo>More Info</MoreInfo>
            </Tooltip>
          }
          fullWidth
        />
      </TokenGroup>

      {role === `trader` && (
        <TokenGroup>
          <Title>Collateral Token</Title>
          <TokenPicker
            tokens={tokens}
            setAddress={setStateForAddress(`collateralTokenAddress`)}
            value={collateralTokenAddress}
          />
        </TokenGroup>
      )}
    </Content>
  </Section>
);
