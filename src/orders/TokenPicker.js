/* eslint-disable */
export default class TokenPicker extends React.Component {
  state = { showDialog: false };
  toggleDialog = () => this.setState(p => ({ showDialog: !p.showDialog }));
  render() {
    const { onChange, value } = this.props;
    return <div>Token Picker here.</div>;
  }
}
