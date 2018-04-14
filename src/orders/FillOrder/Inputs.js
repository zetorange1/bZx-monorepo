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
  width: 180px;
  margin: 24px;
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

export default ({
  tokens,
  fillOrderAmount,
  collateralTokenAddress,
  loanTokenAddress,
  setFillOrderAmount,
  setCollateralTokenAddress
}) => {
  const symbol = getSymbol(tokens, loanTokenAddress);
  return (
    <Fragment>
      <Container>
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
        </DataContainer>
        <DataContainer>
          <Title>Loan Amount to Fill</Title>
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
              <Tooltip title="This is the amount borrowed. It cannot be larger than the amount being loaned above.">
                <MoreInfo>More Info</MoreInfo>
              </Tooltip>
            </FormHelperText>
          </FormControl>
        </DataContainer>
      </Container>
    </Fragment>
  );
};

// {
//   "b0xAddress": "0x4d3d5c850dd5bd9d6f4adda3dd039a3c8054ca29",
//   "makerAddress": "0x5409ed021d9299bf6814279a6a1411a7e866a631",
//   "makerRole": "0",
//   "networkId": 50,
//   "loanTokenAddress": "0x6000eca38b8b5bba64986182fe2a69c57f6b5414",
//   "interestTokenAddress": "0x6000eca38b8b5bba64986182fe2a69c57f6b5414",
//   "collateralTokenAddress": "0x6000eca38b8b5bba64986182fe2a69c57f6b5414",
//   "feeRecipientAddress": "0x0000000000000000000000000000000000000000",
//   "oracleAddress": "0x8ea76477cfaca8f7ea06477fd3c09a740ac6012a",
//   "loanTokenAmount": "40",
//   "interestAmount": "41",
//   "initialMarginAmount": "40",
//   "maintenanceMarginAmount": "20",
//   "lenderRelayFee": "0",
//   "traderRelayFee": "0",
//   "expirationUnixTimestampSec": "1522395146",
//   "salt": "45629222935198982854169792985347749558750808557895357318468689301872462703618",
//   "signature": "0xcada7a2f63f8936d03a01fee5a9a9fe6fb6bc9089644f7e6251ec5212067b96a1af283dd23773e348dd731ae8f3e77707f70bff8f23821e9f5c91b9e4a4060611b"
// }
