import Layout from "../src/common/Layout";
import { Card, Header, HeaderTitle, Content } from "../src/common/MainContent";

export default class Bounties extends React.Component {
  state = { activeTab: undefined };

  changeTab = tabId => this.setState({ activeTab: tabId });

  render() {
    const { activeTab } = this.state; // eslint-disable-line no-unused-vars
    return (
      <Layout>
        <Card>
          <Header>
            <HeaderTitle>Bounties</HeaderTitle>
          </Header>
          <Content>Page Content Here</Content>
        </Card>
      </Layout>
    );
  }
}
