import React, { useState } from 'react';
import { Card, Tabs, Form, Input, Button, Radio, App, Typography, Divider, Alert } from 'antd';
import { useNavigate } from 'react-router-dom';
import api from '../api.js';
import { useAuth } from '../auth.jsx';

const DEMO = [
  { role: '采购方', username: 'buyer', password: 'buyer123' },
  { role: '供应商1', username: 'supplier1', password: 'sup123' },
  { role: '供应商2', username: 'supplier2', password: 'sup123' },
  { role: '供应商3', username: 'supplier3', password: 'sup123' },
];

export default function Login() {
  const [mode, setMode] = useState('login');
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();
  const { login } = useAuth();
  const { message } = App.useApp();

  const onFinish = async (values) => {
    setLoading(true);
    try {
      if (mode === 'login') {
        const { data } = await api.post('/auth/login', values);
        login(data.token, data.user);
        message.success('登录成功');
        nav(values.role === 'buyer' ? '/my-inquiries' : '/market');
      } else {
        const { data } = await api.post('/auth/register', values);
        login(data.token, data.user);
        message.success('注册成功');
        nav(values.role === 'buyer' ? '/my-inquiries' : '/market');
      }
    } catch (e) {
      message.error(e.response?.data?.error || '操作失败');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (u, p) => {
    setMode('login');
    form.setFieldsValue({ username: u, password: p, role: 'supplier' });
  };

  const [form] = Form.useForm();

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg,#1677ff 0%,#69b1ff 100%)', padding: 16 }}>
      <Card style={{ width: 420, maxWidth: '100%', boxShadow: '0 10px 40px rgba(0,0,0,.15)' }}>
        <Typography.Title level={3} style={{ textAlign: 'center', marginBottom: 4 }}>在线报价系统</Typography.Title>
        <Typography.Paragraph type="secondary" style={{ textAlign: 'center' }}>采购发布询价 · 供应商在线报价 · 比价定标</Typography.Paragraph>
        <Tabs
          activeKey={mode}
          onChange={setMode}
          centered
          items={[
            { key: 'login', label: '登录' },
            { key: 'register', label: '注册' },
          ]}
        />
        <Form form={form} layout="vertical" onFinish={onFinish} initialValues={{ role: 'buyer' }}>
          {mode === 'register' && (
            <Form.Item label="角色" name="role" rules={[{ required: true }]}>
              <Radio.Group>
                <Radio value="buyer">采购方</Radio>
                <Radio value="supplier">供应商</Radio>
              </Radio.Group>
            </Form.Item>
          )}
          <Form.Item label="用户名" name="username" rules={[{ required: true, message: '请输入用户名' }]}>
            <Input placeholder="用户名" autoComplete="username" />
          </Form.Item>
          <Form.Item label="密码" name="password" rules={[{ required: true, message: '请输入密码' }, { min: 6, message: '至少 6 位' }]}>
            <Input.Password placeholder="密码" autoComplete="current-password" />
          </Form.Item>
          {mode === 'register' && (
            <>
              <Form.Item label="公司名称" name="company"><Input placeholder="选填" /></Form.Item>
              <Form.Item label="联系人/电话" name="contact"><Input placeholder="选填" /></Form.Item>
            </>
          )}
          <Button type="primary" htmlType="submit" block loading={loading}>
            {mode === 'login' ? '登录' : '注册并登录'}
          </Button>
        </Form>
        <Divider>演示账号（点击快速填入）</Divider>
        <Alert
          type="info"
          showIcon
          message="体验账号"
          description={
            <div>
              {DEMO.map((d) => (
                <div key={d.username} style={{ marginBottom: 4 }}>
                  <a onClick={() => fillDemo(d.username, d.password)}>
                    {d.role}：{d.username} / {d.password}
                  </a>
                </div>
              ))}
            </div>
          }
        />
      </Card>
    </div>
  );
}
