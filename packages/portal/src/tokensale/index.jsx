import styled from "styled-components";
import MuiButton from "@material-ui/core/Button";
import Section, { SectionLabel } from "../common/FormSection";
import BZxComponent from "../common/BZxComponent";
import { COLORS } from "../styles/constants";
import { fromBigNumber, toBigNumber } from "../common/utils";
import { getSymbol, getDecimals } from "../common/tokens";
import { Input, InputLabel, InputAdornment, FormControl, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from "@material-ui/core";

const InfoContainer = styled.div`
  display: flex;
  align-items: center;
`;

const ShowInfo = styled.div`
  display: inline-block;
  margin: 6px;
`;

const Button = styled(MuiButton)`
  margin: 6px !important;
`;

const DataPointContainer = styled.div`
  display: flex;
  justify-content: flex-start;
  align-items: center;
  margin-bottom: 6px;
`;

const DataPoint = styled.span`
  margin-left: 16px;
`;

const Label = styled.span`
  font-weight: 600;
  color: ${COLORS.gray};
`;

const AddressLink = styled.a.attrs({
  target: `_blank`,
  rel: `noopener noreferrer`
})`
  //display: inline-block;
  font-family: monospace;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 20ch;
`;

const TxHashLink = styled.a.attrs({
  target: `_blank`,
  rel: `noopener noreferrer`
})`
  font-family: monospace;
  display: block;
  text-overflow: ellipsis;
  overflow: auto;
}
`;

export default class Tokensale extends BZxComponent {
  state = { 
    loading: false, 
    error: false,
    totalETH: 0, 
    totalTokens: 0,
    totalTokenBonus: 0,
    ethRate: 0,
    tokensaleContract: null,
    bzrxTokenAddress: null,
    showBuyDialog: false,
    buyAmount: 0
  };

  async componentDidMount() {
    const tokensaleContract = await this.props.bZx.getWeb3Contract(`BZRxTokenSale`);
    const bzrxTokenAddress = await this.wrapAndRun(tokensaleContract.methods.bZRxTokenContractAddress().call());
    const currentTokenBonus = await this.wrapAndRun(tokensaleContract.methods.bonusMultiplier().call());
    console.log(`BZRX Token:`, bzrxTokenAddress);

    await this.setState({ 
      tokensaleContract,
      bzrxTokenAddress,
      currentTokenBonus: toBigNumber(currentTokenBonus).minus(100).toString()
    });

    await this.refreshTokenData();
  }

  refreshTokenData = async () => {
    const { bZx, accounts } = this.props;
    const { tokensaleContract } = this.state;
    await this.setState({ loading: true });
    
    console.log(`Tokensale contract:`, tokensaleContract._address);

    try {
      const tokenData = await this.wrapAndRun(tokensaleContract.methods.purchases(accounts[0]).call());
      //console.log(tokenData);

      const ethRate = await this.wrapAndRun(tokensaleContract.methods.getEthRate().call());
      //console.log(ethRate);

      this.setState({ 
        totalETH: tokenData.totalETH,
        totalTokenBonus: tokenData.totalTokenBonus,
        totalTokens: tokenData.totalTokens,
        ethRate,
        loading: false, 
        error: false 
      });
    } catch(e) {
      console.log(e);
      this.setState({ 
        error: true, 
        loading: false, 
        totalETH: 0,
        totalTokenBonus: 0,
        totalTokens: 0,
      });
    }

  }

  setBuyAmount = e => this.setState({ buyAmount: e.target.value });

  toggleBuyDialog = () =>
    this.setState(p => ({ showBuyDialog: !p.showBuyDialog }));

  buyToken = async () => {
    const { web3, bZx, accounts } = this.props;
    const { buyAmount, tokensaleContract } = this.state;

    if (bZx.portalProviderName !== `MetaMask`) {
      alert(`Please confirm this transaction on your device.`);
    }

    const txOpts = {
      from: accounts[0],
      // gas: 1000000,
      gasPrice: window.defaultGasPrice.toString(),
      value: toBigNumber(buyAmount, 1e18)
    };

    const txObj = await tokensaleContract.methods.buyToken();

    try {
      await txObj
        .estimateGas(txOpts)
        .then(gas => {
          console.log(gas);
          txOpts.gas = window.gasValue(gas)+10000;
          txObj
            .send(txOpts)
            .once(`transactionHash`, hash => {
              alert(`Transaction submitted, transaction hash:`, {
                component: () => (
                  <TxHashLink href={`${bZx.etherscanURL}tx/${hash}`}>
                    {hash}
                  </TxHashLink>
                )
              });
              this.setState({ buyAmount: ``, showBuyDialog: false });
            })
            .then(async () => {
              alert(`Your purchase is complete. It may take a few minutes for this page to update.`);
              this.refreshTokenData();
            })
            .catch(error => {
              console.error(error.message);
              if (
                error.message.includes(`denied transaction signature`) ||
                error.message.includes(`Condition of use not satisfied`) ||
                error.message.includes(`Invalid status`)
              ) {
                alert();
              }
              this.setState({ buyAmount: ``, showBuyDialog: false });
            });
        })
        .catch(error => {
          console.error(error.message);
          if (
            error.message.includes(`denied transaction signature`) ||
            error.message.includes(`Condition of use not satisfied`) ||
            error.message.includes(`Invalid status`)
          ) {
            alert();
          }
          this.setState({ buyAmount: ``, showBuyDialog: false });
        });
    } catch (error) {
      console.error(error.message);
      if (
        error.message.includes(`denied transaction signature`) ||
        error.message.includes(`Condition of use not satisfied`) ||
        error.message.includes(`Invalid status`)
      ) {
        alert();
      }
      this.setState({ buyAmount: ``, showBuyDialog: false });
    }
  };

  render() {
    const { bZx, accounts, web3 } = this.props;
    const { 
      loading,
      error,
      totalETH,
      totalTokens,
      totalTokenBonus,
      ethRate,
      tokensaleContract,
      bzrxTokenAddress,
      currentTokenBonus
    } = this.state;
    if (error) {
      return (
        <div>
          <InfoContainer>
            <ShowInfo>Web3 error loading. Please refresh in a few minutes.</ShowInfo>
            <Button onClick={this.refreshTokenData} variant="raised" disabled={false}>
              Refresh
            </Button>
          </InfoContainer>
        </div>
      );
    }

    const tokensaleContractAddress = tokensaleContract ? tokensaleContract._address : null;
    const tokensaleContractLink = `${this.props.bZx.etherscanURL}address/${tokensaleContractAddress}`;
    const bzrxTokenAddressLink = `${this.props.bZx.etherscanURL}token/${bzrxTokenAddress}`;

    return (
      <div>
        <InfoContainer>
          <Button
            onClick={this.refreshTokenData}
            variant="raised"
            disabled={loading}
          >
            {loading ? `Refreshing...` : `Refresh`}
          </Button>
        </InfoContainer>

        <br/>

        <InfoContainer>
          <ShowInfo>

            <DataPointContainer>
              <Label>Tokensale Contract</Label>
              <DataPoint>
                <AddressLink href={tokensaleContractLink}>
                  {tokensaleContractAddress}
                </AddressLink>
              </DataPoint>
            </DataPointContainer>

            <DataPointContainer>
              <Label>BZRX Protocol Token (BZRX)</Label>
              <DataPoint>
                <AddressLink href={bzrxTokenAddressLink}>
                  {bzrxTokenAddress}
                </AddressLink>
              </DataPoint>
            </DataPointContainer>

            <br/>

            <DataPointContainer>
              <Label>Token Tokens Received</Label>
              <DataPoint>
                {fromBigNumber(
                  totalTokens,
                  10 ** 18
                )}
                {` `}
                {`BZRX`}
              </DataPoint>
            </DataPointContainer>

            <DataPointContainer>
              <Label>Bonus Tokens Received</Label>
              <DataPoint>
                {fromBigNumber(
                  totalTokenBonus,
                  10 ** 18
                )}
                {`  `}
                {`BZRX`}
              </DataPoint>
            </DataPointContainer>

            <br/>

            <DataPointContainer>
              <Label>ETH Spent</Label>
              <DataPoint>
                {fromBigNumber(
                  totalETH,
                  10 ** 18
                )}
                {` `}
                {`ETH`}
              </DataPoint>
            </DataPointContainer>

            <DataPointContainer>
              <Label>Current ETH Price</Label>
              <DataPoint>
                ${toBigNumber(
                  fromBigNumber(ethRate, 10 ** 18)
                ).toFixed(2)}
                {` `}
                {`per ETH`}
              </DataPoint>
            </DataPointContainer>

            <br/>

            <DataPointContainer>
              <Button
                variant="raised"
                color="primary"
                onClick={this.toggleBuyDialog}
                style={{ marginLeft: `12px` }}
              >
                Purchase BZRX Token
              </Button>
            </DataPointContainer>


          </ShowInfo>
        </InfoContainer>
        <Dialog
            open={this.state.showBuyDialog}
            onClose={this.toggleBuyDialog}
          >
            <DialogTitle>Purchase BZRX Tokens</DialogTitle>
            <DialogContent>
              <DialogContentText>
                BZRX tokens cost $0.073 each. Please specify the amount of Ether you want
                to send for your purchase. BZRX will be purchased at the current ETH rate 
                (${toBigNumber(
                  fromBigNumber(ethRate, 10 ** 18)
                ).toFixed(2)}
                {` `}
                {`per ETH`}). Your purchase will include an additional token bonus of {currentTokenBonus}%.
              </DialogContentText>
              <br/>
              <FormControl fullWidth>
                <InputLabel>Purchase Amount</InputLabel>
                <Input
                  value={this.state.buyAmount}
                  type="number"
                  onChange={this.setBuyAmount}
                  endAdornment={
                    <InputAdornment position="end">ETH</InputAdornment>
                  }
                />
              </FormControl>
            </DialogContent>
            <DialogActions>
              <Button onClick={this.toggleBuyDialog}>Cancel</Button>
              <Button onClick={this.buyToken} color="primary">
                Buy
              </Button>
            </DialogActions>
          </Dialog>
      </div>
    );
  }
}
