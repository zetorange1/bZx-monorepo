import Layout from "../src/common/Layout";
import {
  Card,
  Header,
  HeaderTitle,
  TabGroup,
  Tab,
  Content,
  ContentContainer
} from "../src/common/MainContent";
import GenerateOrder from "../src/orders/GenerateOrder";
import FillOrder from "../src/orders/FillOrder";
import Balances from "../src/orders/Balances";

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
            <HeaderTitle>Orders</HeaderTitle>
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
              <GenerateOrder />
            </ContentContainer>
            <ContentContainer show={activeTab === `FILL_ORDER`}>
              <FillOrder />
            </ContentContainer>
            <ContentContainer show={activeTab === `BALANCES`}>
              <Balances />
            </ContentContainer>
          </Content>
        </Card>
      </Layout>
    );
  }
}
