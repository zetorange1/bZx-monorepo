import Layout from "../src/common/Layout";
import {
  Card,
  Header,
  TabGroup,
  Tab,
  Content,
  ContentContainer
} from "../src/common/MainContent";

const TABS = [
  { id: `GEN_ORDER`, label: `Generate Order` },
  { id: `FILL_ORDER`, label: `Fill Order` },
  { id: `BALANCES`, label: `Balances` }
];

export default class Orders extends React.Component {
  state = { activeTab: `GEN_ORDER` };

  changeTab = tabId => this.setState({ activeTab: tabId });

  render() {
    const { activeTab } = this.state;
    return (
      <Layout>
        <Card>
          <Header>
            <h2>Orders</h2>
            <TabGroup>
              {TABS.map(tab => (
                <Tab
                  key={tab.id}
                  active={activeTab === tab.id}
                  onClick={() => this.changeTab(tab.id)}
                >
                  {tab.label}
                </Tab>
              ))}
            </TabGroup>
          </Header>
          <Content>
            <ContentContainer show={activeTab === `GEN_ORDER`}>
              Put Gen Order Component here
            </ContentContainer>
            <ContentContainer show={activeTab === `FILL_ORDER`}>
              Put Fill Order Component here
            </ContentContainer>
            <ContentContainer show={activeTab === `BALANCES`}>
              Put Balances Component here
            </ContentContainer>
          </Content>
        </Card>
      </Layout>
    );
  }
}
