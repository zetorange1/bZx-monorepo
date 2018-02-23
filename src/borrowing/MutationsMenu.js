import { Fragment } from 'react';
import Button from 'material-ui/Button';
import Menu, { MenuItem } from 'material-ui/Menu';

export default class MutationsMenu extends React.Component {
  state = {
    anchorEl: null,
  };

  handleClick = event => {
    this.setState({ anchorEl: event.currentTarget });
  };

  handleClose = () => {
    this.setState({ anchorEl: null });
  };

  render() {
    const { anchorEl } = this.state;

    return (
      <Fragment>
        <Button variant="raised" onClick={this.handleClick}>
          Mutations
        </Button>
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={this.handleClose}
        >
          <MenuItem onClick={this.handleClose}>
            Change collateral token
          </MenuItem>
          <MenuItem onClick={this.handleClose}>
            Deposit additional collateral
          </MenuItem>
          <MenuItem onClick={this.handleClose}>Withdraw collateral</MenuItem>
        </Menu>
      </Fragment>
    );
  }
}
