import { Fragment } from "react";
import styled from "styled-components";
import { getIconURL } from "../../common/tokens";

const Container = styled.div`
  display: flex;
  width: 100%;
  padding: 24px 0;
  justify-content: center;
  align-items: flex-start;
`;

const TokenContainer = styled.div`
  width: 180px;
  text-align: center;
  box-sizing: border-box;

  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: center;
`;

const Title = styled.div`
  margin-bottom: 24px !important;
  color: rgba(0, 0, 0, 0.54);
  padding: 0;
  font-size: 1rem;
  line-height: 1;
`;

const CoinIcon = styled.img`
  width: 32px;
  margin-top: 6px;
`;

const CoinLabel = styled.div`
  margin-top: 12px;

  color: rgba(0, 0, 0, 0.54);
  padding: 0;
  font-size: 12px;
`;

const CoinAmount = styled.div`
  margin-top: 12px;
`;

export default ({
  tokens,
  role,
  lendTokenAddress,
  lendTokenAmount,
  interestTokenAddress,
  interestAmount,
  marginTokenAddress
}) => {
  const getTokenInfo = address => tokens.filter(t => t.address === address)[0];
  const lendingToken = getTokenInfo(lendTokenAddress);
  const interestToken = getTokenInfo(interestTokenAddress);
  const marginToken = getTokenInfo(marginTokenAddress);
  return (
    <Fragment>
      <Container>
        <TokenContainer>
          <Title>Lending Token</Title>
          <CoinIcon src={getIconURL(lendingToken)} />
          <CoinLabel>{lendingToken.name}</CoinLabel>
          <CoinAmount>
            {lendTokenAmount} {lendingToken.symbol}
          </CoinAmount>
        </TokenContainer>
        <TokenContainer>
          <Title>Interest Token</Title>
          <CoinIcon src={getIconURL(interestToken)} />
          <CoinLabel>{interestToken.name}</CoinLabel>
          <CoinAmount>
            {interestAmount} {interestToken.symbol}
          </CoinAmount>
        </TokenContainer>
        {role === `trader` && (
          <TokenContainer>
            <Title>Margin Token</Title>
            <CoinIcon src={getIconURL(marginToken)} />
            <CoinLabel>{marginToken.name}</CoinLabel>
          </TokenContainer>
        )}
      </Container>
    </Fragment>
  );
};
