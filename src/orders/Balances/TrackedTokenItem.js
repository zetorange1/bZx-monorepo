import styled from "styled-components";
import Button from "material-ui/Button";
import Icon from "material-ui/Icon";
import IconButton from "material-ui/IconButton";
import { COLORS } from "../../styles/constants";

const Container = styled.div`
  display: flex;
  align-items: center;
  margin-bottom: 24px;

  & > * {
    margin-right: 12px;
  }
`;

const TokenInfo = styled.div`
  width: 120px;
  display: flex;
  align-items: center;
`;

const TokenIcon = styled.img`
  height: 24px;
  width: 24px;
  margin-right: 12px;
`;

const Name = styled.div`
  font-size: 12px;
  color: ${COLORS.gray};
`;

const BalanceAmount = styled.div``;

const ButtonGroup = styled.div`
  margin-left: auto;
  display: flex;
  align-items: center;

  & > *:first-child {
    margin-right: 12px;
  }
`;

export default ({ token }) => {
  const { name, symbol, iconUrl, amount } = token;
  return (
    <Container>
      <TokenInfo>
        <TokenIcon src={iconUrl} />
        <Name>{name}</Name>
      </TokenInfo>
      <BalanceAmount>
        {amount} {symbol}
      </BalanceAmount>
      <ButtonGroup>
        <Button raised onClick={() => {}}>
          Approve
        </Button>
        <Button raised color="primary" onClick={() => {}}>
          Send
        </Button>
        <IconButton>
          <Icon>close</Icon>
        </IconButton>
      </ButtonGroup>
    </Container>
  );
};
