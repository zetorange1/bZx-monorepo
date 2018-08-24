/* globals document */
import { Fragment } from "react";
import ReactDOM from "react-dom";
import styled from "styled-components";
import packageJson from "../../package.json";

const AddressLink = styled.a.attrs({
  target: `_blank`,
  rel: `noopener noreferrer`
})`
  color: white;
  display: inline-block;
  margin-bottom: 3px;
  text-decoration: none;
`;

const ChangeButton = styled.a.attrs({
  target: `_blank`,
  rel: `noopener noreferrer`
})`
  text-decoration: none;
`;

const ChangeButtonLabel = styled.div`
  margin-top: 6px;
  margin-left: 6px;
  color: white;
  padding: 0;
  font-size: 9px;
`;

const networks = {
  1: { name: `Main Net`, color: `#038789` },
  3: { name: `Ropsten Testnet`, color: `#E91550` },
  4: { name: `Rinkeby Testnet`, color: `#EBB33F` },
  42: { name: `Kovan Testnet`, color: `#690496` }
};

const currentAccount = addr => `${addr.substr(0, 8)} ... ${addr.substr(-6)}`;

const NetworkIndicator = ({
  networkId,
  accounts,
  etherscanURL,
  providerName,
  clearProvider
}) => {
  // eslint-disable-next-line no-prototype-builtins
  const nameExists = networks.hasOwnProperty(networkId);
  const domNode = document.getElementsByClassName(`network-indicator`)[0];

  const addressLink = `${etherscanURL}address/${accounts[0]}`;
  const addressText = currentAccount(accounts[0]);

  const handleClearProvider = event => {
    event.preventDefault();
    clearProvider();
  };

  const ToRender = (
    <Fragment>
      <div className="portal-version">Version Alpha {packageJson.version}</div>
      {nameExists ? (
        <div className="network-name">{networks[networkId].name}</div>
      ) : (
        <div className="network">Private Network {networkId}</div>
      )}
      <AddressLink href={addressLink}>{addressText}</AddressLink>
      {providerName && (
        <div style={{ display: `flex` }}>
          Using {providerName}
          <ChangeButton href="" onClick={handleClearProvider}>
            <ChangeButtonLabel>Change</ChangeButtonLabel>
          </ChangeButton>
        </div>
      )}
    </Fragment>
  );
  return ReactDOM.createPortal(ToRender, domNode);
};

export default NetworkIndicator;
