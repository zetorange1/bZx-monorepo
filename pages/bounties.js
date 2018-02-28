import Layout from "../src/common/Layout";
import { Card, Header, HeaderTitle, Content } from "../src/common/MainContent";
import { Divider } from "../src/common/FormSection";
import PageContent from "../src/bounties";

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
          <Content>
            This section will allow bounty hunters to liquidate loans that have
            become unsafe. Unsafe loans are open loans where the value of the
            collateral has fallen below the requisite amount (i.e. the
            liquidation margin amount).
            <Divider />
            <PageContent />
          </Content>
        </Card>
      </Layout>
    );
  }
}
