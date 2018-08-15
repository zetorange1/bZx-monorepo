import { Fragment } from "react";
import styled from "styled-components";
import Tooltip from "material-ui/Tooltip";
import Input, { InputLabel, InputAdornment } from "material-ui/Input";
import { FormControl, FormHelperText } from "material-ui/Form";
import { getSymbol } from "../../common/tokens";

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

export default ({
  tokens,
  fillOrderAmount,
  loanTokenAddress,
  setFillOrderAmount
}) => {
  const symbol = getSymbol(tokens, loanTokenAddress);
  return (
    <Fragment>
      <Container>
        <DataContainer>
          <Title>Amount to Cancel</Title>
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
              <Tooltip
                title={
                  <div style={{ maxWidth: `300px` }}>
                    This sets the amount to be cancel. It cannot be larger than
                    the available amount being loaned above.
                  </div>
                }
              >
                <MoreInfo>More Info</MoreInfo>
              </Tooltip>
            </FormHelperText>
          </FormControl>
        </DataContainer>
      </Container>
    </Fragment>
  );
};
