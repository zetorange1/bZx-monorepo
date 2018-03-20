import { Divider } from "../../common/FormSection";

import Ether from "./Ether";
import TrackedTokens from "./TrackedTokens";
import AddToken from "./AddToken";

export default class Balances extends React.Component {
  state = {};

  componentDidMount() {
    this.props.updateTrackedTokens();
  }

  render() {
    return (
      <div>
        <Ether web3={this.props.web3} accounts={this.props.accounts} />
        <Divider />
        <TrackedTokens
          tokens={this.props.tokens}
          trackedTokens={this.props.trackedTokens}
          updateTrackedTokens={this.props.updateTrackedTokens}
          b0x={this.props.b0x}
          accounts={this.props.accounts}
        />
        <Divider />
        <AddToken
          tokens={this.props.tokens}
          trackedTokens={this.props.trackedTokens}
          updateTrackedTokens={this.props.updateTrackedTokens}
        />
      </div>
    );
  }
}
