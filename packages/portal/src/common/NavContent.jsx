import { Fragment } from "react";
import styled from "styled-components";
import { ImgLogo, HorizontalNav, VerticalNav, NavLink } from "./NavComponents";

const HamburgerBtn = styled.i.attrs({
  className: `material-icons`
})`
  padding: 12px;
  cursor: pointer;

  /* hide on desktop */
  @media screen and (min-width: 600px) {
    display: none;
  }
`;

const CloseDrawerBtn = styled.i.attrs({
  className: `material-icons`
})`
  padding: 12px;
  cursor: pointer;
  position: absolute;
  top: 12px;
  right: 12px;
`;

const Overlay = styled.div`
  transition: background-color 200ms;
  background-color: rgba(0, 0, 0, ${p => (p.show ? `0.5` : `0`)});
  pointer-events: ${p => (p.show ? `unset` : `none`)};

  /* full screen */
  position: fixed;
  top: 0;
  right: 0;
  left: 0;
  bottom: 0;

  /* hide on larger screens */
  @media screen and (min-width: 600px) {
    display: none;
  }
`;

const Drawer = styled.div`
  background: white;

  /* always show on mobile but can be tucked away;
    fixed width and add transition */
  display: block;
  width: 300px;
  transition: left 200ms ease-in-out;

  /* set it on the side */
  position: fixed;
  top: 0;
  bottom: 0;
  left: ${p => (p.show ? `0` : `-100%`)};

  /* hide on larger screens */
  @media screen and (min-width: 600px) {
    display: none;
  }
`;

class NavContent extends React.Component {
  state = { showSideNav: false };

  changeCardClick = event => {
    event.preventDefault();
    this.props.changeCard(event.target.id);
    this.setState({ showSideNav: false });
  };

  toggleSideNav = () => this.setState(p => ({ showSideNav: !p.showSideNav }));

  render() {
    const { bZx } = this.props;

    return (
      <Fragment>
        <a href="https://bZx.network/">
          <ImgLogo src="/static/logo.svg" />
        </a>
        {this.props.web3IsReceived && !this.props.noHeaderBar? (
          <Fragment>
            <HorizontalNav>
              {/*<NavLink id="tokensale" onClick={this.changeCardClick} style={{ fontWeight: `900`, color: `rgb(25,197,194)` }}>
                Buy BZRX
              </NavLink>*/}
              <NavLink id="balances" onClick={this.changeCardClick}>
                Balances
              </NavLink>
              <NavLink id="orders" onClick={this.changeCardClick}>
                Orders
              </NavLink>
              <NavLink id="borrowing" onClick={this.changeCardClick}>
                Borrowing
              </NavLink>
              <NavLink id="lending" onClick={this.changeCardClick}>
                Lending
              </NavLink>
              <NavLink id="bounties" onClick={this.changeCardClick}>
                Bounties
              </NavLink>
              { bZx.networkId && (bZx.networkId == 50 || bZx.networkId == 3) ? (
              <NavLink id="tokenizedloans" onClick={this.changeCardClick}>
                Tokenized Loans
              </NavLink> ) : ``}
              <NavLink id="debug" onClick={this.changeCardClick}>
                Advanced
              </NavLink>
            </HorizontalNav>
            <HamburgerBtn onClick={this.toggleSideNav}>menu</HamburgerBtn>
            <Overlay
              show={this.state.showSideNav}
              onClick={this.toggleSideNav}
            />
            <Drawer show={this.state.showSideNav}>
              <VerticalNav>
                {/*<NavLink id="tokensale" onClick={this.changeCardClick} style={{ fontWeight: `900`, color: `rgb(25,197,194)` }}>
                  Buy BZRX
                </NavLink>*/}
                <NavLink id="balances" onClick={this.changeCardClick}>
                  Balances
                </NavLink>
                <NavLink id="orders" onClick={this.changeCardClick}>
                  Orders
                </NavLink>
                <NavLink id="borrowing" onClick={this.changeCardClick}>
                  Borrowing
                </NavLink>
                <NavLink id="lending" onClick={this.changeCardClick}>
                  Lending
                </NavLink>
                <NavLink id="bounties" onClick={this.changeCardClick}>
                  Bounties
                </NavLink>
                { bZx.networkId && (bZx.networkId == 50 || bZx.networkId == 3) ? (
                <NavLink id="tokenizedloans" onClick={this.changeCardClick}>
                Tokenized Loans
                </NavLink> ) : ``}
                <NavLink id="debug" onClick={this.changeCardClick}>
                  Advanced
                </NavLink>
              </VerticalNav>
              <CloseDrawerBtn onClick={this.toggleSideNav}>
                close
              </CloseDrawerBtn>
            </Drawer>
          </Fragment>
        ) : (
          ``
        )}
      </Fragment>
    );
  }
}

export default NavContent;
