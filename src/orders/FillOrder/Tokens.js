import { Fragment } from "react";
import styled from "styled-components";
// import Typography from "material-ui/Typography";
import { getTokenInfoWithIcon } from "../../common/tokens";

const Container = styled.div`
  display: flex;
  width: 100%;
  padding: 24px 0;
  justify-content: center;
  align-items: center;
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

export default () => {
  const lendingToken = getTokenInfoWithIcon(`WETH_SM_ADDRESS_HERE`);
  const interestToken = getTokenInfoWithIcon(`ZRX_SM_ADDRESS_HERE`);
  const marginToken = getTokenInfoWithIcon(`MKR_SM_ADDRESS_HERE`);
  return (
    <Fragment>
      {/* <Typography type="title" gutterBottom>
        Tokens
      </Typography> */}
      <Container>
        <TokenContainer>
          <Title>Lending Token</Title>
          <CoinIcon src={lendingToken.iconUrl} />
          <CoinLabel>{lendingToken.label}</CoinLabel>
          <CoinAmount>10 {lendingToken.symbol}</CoinAmount>
        </TokenContainer>
        <TokenContainer>
          <Title>Interest Token</Title>
          <CoinIcon src={interestToken.iconUrl} />
          <CoinLabel>{interestToken.label}</CoinLabel>
          <CoinAmount>10 {interestToken.symbol}</CoinAmount>
        </TokenContainer>
        <TokenContainer>
          <Title>Margin Token</Title>
          <CoinIcon src={marginToken.iconUrl} />
          <CoinLabel>{marginToken.label}</CoinLabel>
          <CoinAmount>10 {marginToken.symbol}</CoinAmount>
        </TokenContainer>
      </Container>
    </Fragment>
  );
};
