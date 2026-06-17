import React from 'react';
import { Layout, Menu, Avatar, Dropdown, Button } from 'antd';
import {
  UserOutlined,
  LogoutOutlined,
  TeamOutlined,
  FileTextOutlined,
  BarChartOutlined,
  HeartOutlined,
  ShoppingOutlined,
  SmileOutlined
} from '@ant-design/icons';

const { Header, Sider, Content } = Layout;

const roleMenuItems = {
  admin: [
    { key: 'elderly', icon: <TeamOutlined />, label: '老人管理' },
    { key: 'stats', icon: <BarChartOutlined />, label: '统计报表' }
  ],
  family: [
    { key: 'bindings', icon: <TeamOutlined />, label: '绑定老人' },
    { key: 'orders', icon: <FileTextOutlined />, label: '服务订单' },
    { key: 'health', icon: <HeartOutlined />, label: '健康档案' },
    { key: 'records', icon: <FileTextOutlined />, label: '服务记录' },
    { key: 'demands', icon: <ShoppingOutlined />, label: '志愿者需求' }
  ],
  worker: [
    { key: 'pending', icon: <FileTextOutlined />, label: '待接单' },
    { key: 'my-orders', icon: <FileTextOutlined />, label: '我的订单' }
  ],
  volunteer: [
    { key: 'demands', icon: <SmileOutlined />, label: '需求列表' },
    { key: 'my-signups', icon: <FileTextOutlined />, label: '我的报名' }
  ]
};

const MainLayout = ({ user, children, onLogout }) => {
  const userMenuItems = [
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: onLogout
    }
  ];

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header
        style={{
          background: '#fff',
          padding: '0 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}
      >
        <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#1890ff' }}>
          社区养老服务平台
        </div>
        <Dropdown menu={{ items: userMenuItems }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <Avatar icon={<UserOutlined />} />
            <span>{user?.name}</span>
            <span style={{ color: '#999', fontSize: 12 }}>
              ({user?.role === 'admin' ? '管理员' : user?.role === 'family' ? '家属' : user?.role === 'worker' ? '服务人员' : '志愿者'})
            </span>
          </div>
        </Dropdown>
      </Header>
      <Layout>
        <Sider width={220} style={{ background: '#fff' }}>
          <Menu
            mode="inline"
            style={{ height: '100%', borderRight: 0 }}
            items={roleMenuItems[user?.role] || []}
            defaultSelectedKeys={[roleMenuItems[user?.role]?.[0]?.key]}
          />
        </Sider>
        <Content style={{ padding: 24, background: '#f0f2f5' }}>
          {children}
        </Content>
      </Layout>
    </Layout>
  );
};

export default MainLayout;
