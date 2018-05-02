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
  cursor: pointer;
`;

const MoreInfo = styled.span`
  text-decoration: underline;
  cursor: pointer;
`;

const CenteredFormHelperText = styled(FormHelperText)`
  text-align: center !important;
`;

const FormHelperTextWithDetail = styled(FormHelperText)`
  display: flex;
`;

const RightJustified = styled.div`
  font-size: 0.75rem;
  position: absolute;
  right: 0px;
  max-width: 190px;
  word-break: break-word;
  text-align: right;
`;

const RightJustifiedText = styled.span`
  font-weight: bold;
`;

const AddressLink = styled.a.attrs({
  target: `_blank`,
  rel: `noopener noreferrer`
})`
  //display: inline-block;
  //font-family: monospace;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 20ch;
  color: rgba(0, 0, 0, 0.54);
`;

export default ({
  tokens,
  role,
  // state setters
  setStateForAddress,
  setStateForInput,
  setStateForInterestAmount,
  // address states
  loanTokenAddress,
  interestTokenAddress,
  collateralTokenAddress,
  // amount states
  loanTokenAmount,
  collateralTokenAmount,
  interestAmount,
  interestTotalAmount,
  collateralRefresh,
  etherscanURL
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
        <CenteredFormHelperText margin="normal" component="div">
          <AddressLink href={`${etherscanURL}address/${loanTokenAddress}`}>
            Etherscan
          </AddressLink>
        </CenteredFormHelperText>
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
              title={`${
                role === `trader`
                  ? `This sets the amount to be borrowed.`
                  : `This sets the total amount that can be loaned to one or more traders.`
              }`}
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
        <CenteredFormHelperText margin="normal" component="div">
          <AddressLink href={`${etherscanURL}address/${interestTokenAddress}`}>
            Etherscan
          </AddressLink>
        </CenteredFormHelperText>
        <FormControl margin="normal" fullWidth>
          <InputLabel>Interest amount (per day)</InputLabel>
          <Input
            value={interestAmount}
            type="number"
            onChange={setStateForInterestAmount}
            endAdornment={
              <InputAdornment position="end">
                {getSymbol(tokens, interestTokenAddress)}
              </InputAdornment>
            }
          />
          <FormHelperTextWithDetail component="div">
            <Tooltip title="This sets the interest paid per day and shows the total interest paid out if the loan were to run from now until expiration. The actual amount earned will be less, based on when the loan is opened, the actual amount borrowed, and if the loan is closed early by the trader or is liquidated.">
              <MoreInfo>More Info</MoreInfo>
            </Tooltip>
            <RightJustified>
              <RightJustifiedText>
                {interestTotalAmount} {getSymbol(tokens, interestTokenAddress)}
              </RightJustifiedText>
            </RightJustified>
          </FormHelperTextWithDetail>
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
            <AddressLink
              href={`${etherscanURL}address/${collateralTokenAddress}`}
            >
              Etherscan
            </AddressLink>
          </CenteredFormHelperText>
          <FormControl margin="normal" fullWidth>
            <InputLabel>Collateral token amount</InputLabel>
            <Input
              disabled
              style={{ color: `rgba(0, 0, 0, 0.87)` }}
              value={collateralTokenAmount}
              endAdornment={
                <InputAdornment position="end">
                  {getSymbol(tokens, collateralTokenAddress)}
                </InputAdornment>
              }
            />
            <FormHelperTextWithDetail component="div">
              <Tooltip title="This shows an estimated minimum amount of collateral token required to satify the initial margin amount, based on current token prices provided by the chosen oracle. The actual amount will be calculated when the loan order is taken, and the trader must have at least this amount in their wallet to open the loan. It is advised to have at least 10% more than this, to protect for price fluctuations.">
                <MoreInfo>More Info</MoreInfo>
              </Tooltip>
              <RightJustified>
                <AddressLink href="" onClick={collateralRefresh}>
                  Refresh
                </AddressLink>
              </RightJustified>
            </FormHelperTextWithDetail>
          </FormControl>
        </TokenGroup>
      )}
    </Content>
  </Section>
);
