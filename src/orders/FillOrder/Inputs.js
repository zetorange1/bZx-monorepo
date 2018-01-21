import { Fragment } from "react";
import styled from "styled-components";
import TextField from "material-ui/TextField";
import { SectionLabel } from "../../common/FormSection";

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
  fillOrderAmount,
  marginTokenAddress,
  setFillOrderAmount,
  setMarginTokenAddress
}) => (
  <Fragment>
    <SectionLabel>Fill order options</SectionLabel>
    <Container>
      <DataContainer>
        <Title>Margin Token</Title>
        <TokenPicker
          value={marginTokenAddress}
          setAddress={setMarginTokenAddress}
        />
      </DataContainer>
      <DataContainer>
        <Title>Amount to Fill</Title>
        <TextField
          type="number"
          label="Lending amount"
          value={fillOrderAmount}
          onChange={e => setFillOrderAmount(e.target.value)}
          margin="normal"
          fullWidth
        />
      </DataContainer>
    </Container>
  </Fragment>
);

// marginTokenAddressFilled
// lendTokenAmountFilled
