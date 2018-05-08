/* globals document */
import ReactDOM from "react-dom";
import styled from "styled-components";

const Container = styled.div`
  position: absolute;
  padding: 12px;
`;

const NetworkName = styled.span`
  color: ${p => p.color};
`;

const AddressLink = styled.a.attrs({
  target: `_blank`,
  rel: `noopener noreferrer`
})`
  //display: inline-block;
  //font-family: monospace;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 20ch;
  color: rgba(0, 0, 0, 1);
  font-weight: bold;
  text-decoration: none;
`;

const networks = {
  1: { name: `Main Ethereum Network`, color: `#038789` },
  3: { name: `Ropsten Test Network`, color: `#E91550` },
  4: { name: `Rinkeby Test Network`, color: `#EBB33F` },
  42: { name: `Kovan Test Network`, color: `#690496` }
};

const currentAccount = addr => `${addr.substr(0, 8)} ... ${addr.substr(-6)}`;

const NetworkIndicator = ({ networkId, accounts, etherscanURL }) => {
  // eslint-disable-next-line no-prototype-builtins
  const nameExists = networks.hasOwnProperty(networkId);
  const domNode = document.getElementsByClassName(`network-indicator`)[0];

  let ToRender;
  if (nameExists) {
    ToRender = (
      <div>
        <Container>
          Network:{` `}
          <NetworkName color={networks[networkId].color}>
            {networks[networkId].name}
          </NetworkName>
        </Container>
        <br />
        <Container style={{ "padding-top": `20px` }}>
          Address:{` `}
          <AddressLink href={`${etherscanURL}address/${accounts[0]}`}>
            {currentAccount(accounts[0])}
          </AddressLink>
        </Container>
      </div>
    );
  } else {
    ToRender = <Container>Custom Network: {networkId}</Container>;
  }

  return ReactDOM.createPortal(ToRender, domNode);
};

export default NetworkIndicator;
