import { Divider } from "../../common/FormSection";

import Ether from "./Ether";
import TrackedTokens from "./TrackedTokens";
import AddToken from "./AddToken";

export default class Balances extends React.Component {
  state = {};

  render() {
    return (
      <div>
        <Ether />
        <Divider />
        <TrackedTokens />
        <Divider />
        <AddToken />
      </div>
    );
  }
}

// - "Balances" - lets the maker or taker of a lend order specify the tokens they want our smart contract to use for the purposes of making or taking an order (similar to the 0x portal)
