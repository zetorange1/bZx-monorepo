import ReactDOM from "react-dom";
import styled from "styled-components";

const Container = styled.div`
  position: absolute;
  padding: 12px;
`;

const NetworkName = styled.span`
  color: ${p => p.color};
`;

const networks = {
  1: { name: "Main Ethereum Network", color: "#038789" },
  3: { name: "Ropsten Test Network", color: "#E91550" },
  4: { name: "Rinkeby Test Network", color: "#EBB33F"},
  42: { name: "Kovan Test Network", color: "#690496"}
};

const NetworkIndicator = ({ networkId }) => {
  const nameExists = networks.hasOwnProperty(networkId)
  const domNode = document.getElementsByClassName("network-indicator")[0];

  let ToRender;
  if (nameExists) {
    ToRender = <Container>Network: <NetworkName color={networks[networkId].color}>{networks[networkId].name}</NetworkName></Container>
  } else {
    ToRender = <Container>Custom Network: {networkId}</Container>
  }

  return ReactDOM.createPortal(ToRender, domNode);
};

export default NetworkIndicator