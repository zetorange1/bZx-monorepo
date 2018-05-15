import { Fragment } from "react";
import styled from "styled-components";
import Tooltip from "material-ui/Tooltip";
import Input, { InputLabel, InputAdornment } from "material-ui/Input";
import { FormControl, FormHelperText } from "material-ui/Form";
import { getSymbol } from "../../common/tokens";

import TokenPicker from "../../common/TokenPicker";

const Container = styled.div`
  display: flex;
  width: 100%;
  text-align: center;
  padding: 24px 0;
  justify-content: center;
  align-items: center;
`;

const DataContainer = styled.div`
  width: 230px;
  margin: 24px;
  text-align: center;
`;

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
  b0x,
  tokens,
  fillOrderAmount,
  collateralTokenAddress,
  loanTokenAddress,
  collateralTokenAmount,
  collateralRefresh,
  setFillOrderAmount,
  setCollateralTokenAddress
}) => {
  const symbol = getSymbol(tokens, loanTokenAddress);
  return (
    <Fragment>
      <Container>
        <DataContainer>
          <Title>Amount to Borrow</Title>
          <FormControl>
            <InputLabel>Loan amount</InputLabel>
            <Input
              type="number"
              value={fillOrderAmount}
              onChange={e => setFillOrderAmount(e.target.value)}
              endAdornment={
                <InputAdornment position="end">{symbol}</InputAdornment>
              }
            />
            <FormHelperText component="div">
              <Tooltip title="This sets the amount to be borrowed. It cannot be larger than the amount being loaned above.">
                <MoreInfo>More Info</MoreInfo>
              </Tooltip>
            </FormHelperText>
          </FormControl>
        </DataContainer>
        <DataContainer>
          <Tooltip
            title={
              <div style={{ maxWidth: `240px` }}>
                This token amount will be calculated when the order is filled
                (either partially or fully). It will be set to the amount needed
                to satisfy the initial margin amount to cover the amount of loan
                token borrowed.
              </div>
            }
          >
            <Title>Collateral Token</Title>
          </Tooltip>
          <TokenPicker
            tokens={tokens}
            value={collateralTokenAddress}
            setAddress={setCollateralTokenAddress}
          />
          <CenteredFormHelperText component="div">
            <AddressLink
              href={`${b0x.etherscanURL}/address/${collateralTokenAddress}`}
            >
              Etherscan
            </AddressLink>
          </CenteredFormHelperText>
        </DataContainer>
        <DataContainer>
          <Title>Collateral Amount</Title>
          <FormControl>
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
        </DataContainer>
      </Container>
    </Fragment>
  );
};
