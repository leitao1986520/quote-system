import React, { useEffect, useState } from 'react';
import { Table, Tag, Button, App, Empty, Typography, Space } from 'antd';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import api from '../api.js';

const STATUS = { open: { c: 'processing', t: '进行中' }, closed: { c: 'default', t: '已关闭' }, awarded: { c: 'success', t: '已定标' } };

export default function MyInquiries() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();
  const { message } = App.useApp();

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/inquiries');
      setList(data.inquiries);
    } catch (e) {
      message.error(e.response?.data?.error || '加载失败');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const columns = [
    { title: '标题', dataIndex: 'title', render: (t, r) => <a onClick={() => nav(`/inquiry/${r.id}`)}>{t}</a> },
    { title: '截止时间', dataIndex: 'deadline', render: (d) => dayjs(d).format('YYYY-MM-DD HH:mm') },
    { title: '报价数', dataIndex: 'quote_count', render: (c) => `${c} 家` },
    { title: '状态', dataIndex: 'status', render: (s) => <Tag color={STATUS[s].c}>{STATUS[s].t}</Tag> },
    {
      title: '操作', key: 'act', render: (_, r) => (
        <Space>
          <Button type="link" onClick={() => nav(`/inquiry/${r.id}`)}>查看/比价</Button>
          {r.status === 'open' && (
            <Button type="link" danger onClick={async () => { await api.post(`/inquiries/${r.id}/close`); message.success('已关闭'); load(); }}>关闭</Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Typography.Title level={4}>我的询价</Typography.Title>
      <Button type="primary" style={{ marginBottom: 16 }} onClick={() => nav('/inquiry/new')}>发布新询价</Button>
      <Table
        rowKey="id" loading={loading} dataSource={list} columns={columns}
        locale={{ emptyText: <Empty description="还没有询价单" /> }} scroll={{ x: 'max-content' }}
      />
    </div>
  );
}
