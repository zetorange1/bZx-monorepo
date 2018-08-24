import styled from "styled-components";

const CancelButton = styled.a.attrs({
  target: `_blank`,
  rel: `noopener noreferrer`
})`
  text-decoration: none;
  display: inherit;
`;

const CancelButtonLabel = styled.div`
  color: red;
`;

export default class NoProviderMessage extends React.Component {
  handleClearProvider = event => {
    event.preventDefault();
    this.props.clearProvider();
  };

  render() {
    const { providerName } = this.props;
    switch (providerName) {
      case `Ledger`:
        return (
          <div>
            We were unable to access your Ledger wallet.
            <br />
            <br />
            In order to interact with this dApp, please ensure the device is
            connected to the Ethereum app and you have enabled Contract data and
            Browser support under settings. Then refresh this page to try again.
            <br />
            <br />
            <div style={{ display: `inline-block` }}>
              You can also
              {` `}
              <CancelButton href="" onClick={this.handleClearProvider}>
                <CancelButtonLabel>choose</CancelButtonLabel>
              </CancelButton>
              {` `}a different provider.
            </div>
          </div>
        );
        break; // eslint-disable-line no-unreachable
      case `Trezor`:
        return (
          <div>
            We were unable to access your {providerName} wallet.
            <br />
            <br />
            In order to interact with this dApp, please ensure the device is
            connected and authenticated, then refresh this page to try again.
            <br />
            <br />
            <div style={{ display: `inline-block` }}>
              You can also
              {` `}
              <CancelButton href="" onClick={this.handleClearProvider}>
                <CancelButtonLabel>choose</CancelButtonLabel>
              </CancelButton>
              {` `}a different provider.
            </div>
          </div>
        );
        break; // eslint-disable-line no-unreachable
      case `MetaMask`:
      default:
        return (
          <div>
            We were unable to access an Ethereum wallet you control.
            <br />
            <br />
            In order to interact with this dApp, please install the
            {` `}
            <a
              href="https://metamask.io"
              target="_blank"
              rel="noopener noreferrer"
            >
              MetaMask
            </a>
            {` `}
            extension in your browser, and refresh this page.
            <br />
            <br />
            <div style={{ display: `inline-block` }}>
              You can also
              {` `}
              <CancelButton href="" onClick={this.handleClearProvider}>
                <CancelButtonLabel>choose</CancelButtonLabel>
              </CancelButton>
              {` `}a different provider.
            </div>
          </div>
        );
        break; // eslint-disable-line no-unreachable
    }
  }
}
