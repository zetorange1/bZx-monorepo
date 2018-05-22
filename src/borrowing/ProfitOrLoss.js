import styled from "styled-components";
import { COLORS } from "../styles/constants";
import { fromBigNumber } from "../common/utils";

const DataPointContainer = styled.div`
  display: flex;
  justify-content: flex-start;
  align-items: center;
`;

const DataPoint = styled.span`
  margin-left: 16px;
`;

const Label = styled.span`
  font-weight: 600;
  color: ${COLORS.gray};
`;

export default class ProfitOrLoss extends React.Component {
  state = { loading: true, profit: null, isProfit: null };

  componentDidMount = () => {
    this.getProfitOrLoss();
  };

  getProfitOrLoss = async () => {
    const { b0x, web3, loanOrderHash, accounts } = this.props;
    const txOpts = {
      from: accounts[0],
      gas: 1000000,
      gasPrice: web3.utils.toWei(`5`, `gwei`).toString()
    };
    const data = await b0x.getProfitOrLoss({
      loanOrderHash,
      trader: accounts[0],
      txOpts
    });
    this.setState({
      loading: false,
      profit: data.profitOrLoss,
      isProfit: data.isProfit
    });
  };

  render() {
    const { loading, profit, isProfit } = this.state;
    return (
      <DataPointContainer>
        <Label>Profit/Loss</Label>
        {loading ? (
          <DataPoint>Loading...</DataPoint>
        ) : (
          <DataPoint>
            {!isProfit && `-`}
            {fromBigNumber(profit, 1e18)}
          </DataPoint>
        )}
      </DataPointContainer>
    );
  }
}
