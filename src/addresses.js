import { map, pipe } from "ramda";
import B0x from "./contracts/B0x.json";
import B0xOracle from "./contracts/B0xOracle.json";
import B0xTo0x from "./contracts/B0xTo0x.json";
import B0xToken from "./contracts/B0xToken.json";
import B0xVault from "./contracts/B0xVault.json";
import EIP20 from "./contracts/EIP20.json";
import OracleRegistry from "./contracts/OracleRegistry.json";
import TestToken0 from "./contracts/TestToken0.json";
import TestToken1 from "./contracts/TestToken1.json";
import TestToken2 from "./contracts/TestToken2.json";
import TestToken3 from "./contracts/TestToken3.json";
import TestToken4 from "./contracts/TestToken4.json";
import TestToken5 from "./contracts/TestToken5.json";
import TestToken6 from "./contracts/TestToken6.json";
import TestToken7 from "./contracts/TestToken7.json";
import TestToken8 from "./contracts/TestToken8.json";
import TestToken9 from "./contracts/TestToken9.json";
import TokenRegistry from "./contracts/TokenRegistry.json";

const formatData = raw =>
  pipe(
    map(contract => contract.address),
    map(address => address.toLowerCase())
  )(raw);

export const getAddresses = () => {
  const data = {
    B0x,
    B0xOracle,
    B0xTo0x,
    B0xToken,
    B0xVault,
    EIP20,
    OracleRegistry,
    TestToken0,
    TestToken1,
    TestToken2,
    TestToken3,
    TestToken4,
    TestToken5,
    TestToken6,
    TestToken7,
    TestToken8,
    TestToken9,
    TokenRegistry
  };
  return formatData(data);
};
