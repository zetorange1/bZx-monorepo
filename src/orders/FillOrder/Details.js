import { Fragment } from "react";
import styled from "styled-components";

const Container = styled.div`
  display: flex;
  width: 100%;
  text-align: center;
  padding: 24px 0;
  justify-content: center;
  align-items: center;
  flex-direction: column;
`;

const DataContainer = styled.div`
  display: flex;
`;

const Title = styled.div`
  margin-right: 12px;
  margin-bottom: 12px !important;
  color: rgba(0, 0, 0, 0.54);
  padding: 0;
  font-size: 1rem;
  line-height: 1;
`;

export default ({
  initialMarginAmount,
  maintenanceMarginAmount,
  lenderRelayFee,
  traderRelayFee
}) => (
  <Fragment>
    <Container>
      <DataContainer>
        <Title>Initial Margin Amount</Title>
        <div>{initialMarginAmount}%</div>
      </DataContainer>
      <DataContainer>
        <Title>Maintenance Margin Amount</Title>
        <div>{maintenanceMarginAmount}%</div>
      </DataContainer>
      <DataContainer>
        <Title>Lender Relay Fee</Title>
        <div>{lenderRelayFee}%</div>
      </DataContainer>
      <DataContainer>
        <Title>Trader Relay Fee</Title>
        <div>{traderRelayFee}%</div>
      </DataContainer>
    </Container>
  </Fragment>
);
