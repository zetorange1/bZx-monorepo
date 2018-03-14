import { Fragment } from "react";
import styled from "styled-components";
import Input, { InputLabel, InputAdornment } from "material-ui/Input";
import { FormControl } from "material-ui/Form";
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
          <Title>Collateral Token</Title>
          <TokenPicker
            tokens={tokens}
            value={collateralTokenAddress}
            setAddress={setCollateralTokenAddress}
          />
        </DataContainer>
        <DataContainer>
          <Title>Amount to Fill</Title>
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
          </FormControl>
        </DataContainer>
      </Container>
    </Fragment>
  );
};
