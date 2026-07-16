import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout as AntLayout, Menu, Button, Avatar, Dropdown, Typography } from 'antd';
import {
  ShopOutlined, FileAddOutlined, AppstoreOutlined,
  ProfileOutlined, LogoutOutlined, UserOutlined,
} from '@ant-design/icons';
import { useAuth } from './auth.jsx';

const { Header, Content, Sider } = AntLayout;

export default function Layout() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();

  const menuItems =
    user?.role === 'buyer'
      ? [
          { key: '/my-inquiries', icon: <ProfileOutlined />, label: '我的询价' },
          { key: '/inquiry/new', icon: <FileAddOutlined />, label: '发布询价' },
        ]
      : [
          { key: '/market', icon: <AppstoreOutlined />, label: '询价大厅' },
          { key: '/my-quotations', icon: <ProfileOutlined />, label: '我的报价' },
        ];

  const selected = menuItems.map((m) => m.key).find((k) => loc.pathname.startsWith(k)) || '';

  const onLogout = () => {
    logout();
    nav('/login');
  };

  return (
    <AntLayout style={{ minHeight: '100vh' }}>
      <Sider breakpoint="lg" collapsedWidth="0" theme="light">
        <div style={{ height: 56, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#1677ff', fontSize: 16 }}>
          <ShopOutlined /> 报价系统
        </div>
        <Menu mode="inline" selectedKeys={[selected]} items={menuItems} onClick={({ key }) => nav(key)} />
      </Sider>
      <AntLayout>
        <Header style={{ background: '#fff', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', paddingInline: 16, borderBottom: '1px solid #f0f0f0' }}>
          <Dropdown
            menu={{
              items: [{ key: 'logout', icon: <LogoutOutlined />, label: '退出登录', onClick: onLogout }],
            }}
          >
            <span style={{ cursor: 'pointer' }}>
              <Avatar icon={<UserOutlined />} style={{ marginRight: 8 }} />
              <Typography.Text>{user?.company || user?.username}</Typography.Text>
            </span>
          </Dropdown>
        </Header>
        <Content style={{ margin: 16 }}>
          <div style={{ background: '#fff', padding: 24, borderRadius: 8, minHeight: '100%' }}>
            <Outlet />
          </div>
        </Content>
      </AntLayout>
    </AntLayout>
  );
}
