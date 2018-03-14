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

const Hash = styled.a`
  display: inline-block;
  font-family: monospace;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 20ch;
  vertical-align: middle;
`;

const Signature = styled.div`
  display: inline-block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 20ch;
`;

export default ({
  oracles,
  initialMarginAmount,
  maintenanceMarginAmount,
  oracleAddress,
  signature,
  feeRecipientAddress,
  lenderRelayFee,
  traderRelayFee
}) => {
  const oracle = oracles.filter(o => o.address === oracleAddress)[0];
  return (
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
        {feeRecipientAddress !==
          `0x0000000000000000000000000000000000000000` && (
          <Fragment>
            <DataContainer>
              <Title>Lender Relay Fee</Title>
              <div>{lenderRelayFee}%</div>
            </DataContainer>
            <DataContainer>
              <Title>Trader Relay Fee</Title>
              <div>{traderRelayFee}%</div>
            </DataContainer>
          </Fragment>
        )}
        <DataContainer>
          <Title>Oracle</Title>
          <div>
            {oracle.name} (
            <Hash
              href={`https://etherscan.io/address/${oracle.address}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              {oracle.address}
            </Hash>)
          </div>
        </DataContainer>
        <DataContainer>
          <Title>Signature</Title>
          <Signature title={signature}>{signature}</Signature> (hover to see)
        </DataContainer>
      </Container>
    </Fragment>
  );
};
