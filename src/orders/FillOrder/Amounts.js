import { Fragment } from "react";
import styled from "styled-components";

const Container = styled.div`
  display: flex;
  width: 100%;
  text-align: center;
  padding: 24px 0;
  justify-content: center;
  align-items: center;
`;

const DataContainer = styled.div`
  width: 120px;
`;

const Title = styled.div`
  margin-bottom: 24px !important;
  color: rgba(0, 0, 0, 0.54);
  padding: 0;
  font-size: 1rem;
  line-height: 1;
`;

export default () => (
  <Fragment>
    <Container>
      <DataContainer>
        <Title>Initial Margin Amount</Title>
        <div>40%</div>
      </DataContainer>
      <DataContainer>
        <Title>Liquidation Margin Amount</Title>
        <div>20%</div>
      </DataContainer>
      <DataContainer>
        <Title>Lender Relay Fee</Title>
        <div>10%</div>
      </DataContainer>
      <DataContainer>
        <Title>Trader Relay Fee</Title>
        <div>10%</div>
      </DataContainer>
    </Container>
  </Fragment>
);
