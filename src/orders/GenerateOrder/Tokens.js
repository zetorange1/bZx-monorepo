import styled from "styled-components";
import Tooltip from "material-ui/Tooltip";
import Input, { InputLabel, InputAdornment } from "material-ui/Input";
import { FormControl, FormHelperText } from "material-ui/Form";

import TokenPicker from "../../common/TokenPicker";
import Section, { SectionLabel } from "../../common/FormSection";
import { getSymbol } from "../../common/tokens";

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

const CenteredFormHelperText = styled(FormHelperText)`
  text-align: center !important;
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
        <FormControl margin="normal" fullWidth>
          <InputLabel>Loan token amount</InputLabel>
          <Input
            value={loanTokenAmount}
            type="number"
            onChange={setStateForInput(`loanTokenAmount`)}
            endAdornment={
              <InputAdornment position="end">
                {getSymbol(tokens, loanTokenAddress)}
              </InputAdornment>
            }
          />
          <FormHelperText component="div">
            <Tooltip
              title={`This amount is the total amount being ${
                role === `trader` ? `borrowed` : `loaned`
              }.`}
            >
              <MoreInfo>More Info</MoreInfo>
            </Tooltip>
          </FormHelperText>
        </FormControl>
      </TokenGroup>

      <TokenGroup>
        <Title>Interest Token</Title>
        <TokenPicker
          tokens={tokens}
          setAddress={setStateForAddress(`interestTokenAddress`)}
          value={interestTokenAddress}
        />
        <FormControl margin="normal" fullWidth>
          <InputLabel>Interest amount (paid per day)</InputLabel>
          <Input
            value={interestAmount}
            type="number"
            onChange={setStateForInput(`interestAmount`)}
            endAdornment={
              <InputAdornment position="end">
                {getSymbol(tokens, interestTokenAddress)}
              </InputAdornment>
            }
          />
          <FormHelperText component="div">
            <Tooltip title="This amount is prorated if the lend order is closed early by the trader, or if the trader's loan is liquidated.">
              <MoreInfo>More Info</MoreInfo>
            </Tooltip>
          </FormHelperText>
        </FormControl>
      </TokenGroup>

      {role === `trader` && (
        <TokenGroup>
          <Title>Collateral Token</Title>
          <TokenPicker
            tokens={tokens}
            setAddress={setStateForAddress(`collateralTokenAddress`)}
            value={collateralTokenAddress}
          />
          <CenteredFormHelperText margin="normal" component="div">
            <Tooltip
              title={
                <div style={{ maxWidth: `240px` }}>
                  This token amount will be calculated when the order is filled
                  (either partially or fully). It will be set to the amount
                  needed to satisfy the initial margin amount to cover the
                  amount of loan token borrowed.
                </div>
              }
            >
              <MoreInfo>More Info</MoreInfo>
            </Tooltip>
          </CenteredFormHelperText>
        </TokenGroup>
      )}
    </Content>
  </Section>
);
