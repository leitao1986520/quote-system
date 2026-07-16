import React, { useEffect, useState } from 'react';
import { Table, Tag, Button, App, Empty, Typography } from 'antd';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import api from '../api.js';

export default function MyQuotations() {
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();
  const { message } = App.useApp();

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/quotations/mine');
      setList(data.quotations);
    } catch (e) {
      message.error(e.response?.data?.error || '加载失败');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const columns = [
    { title: '询价标题', dataIndex: 'inquiry_title', render: (t, r) => <a onClick={() => nav(`/inquiry/${r.inquiry_id}`)}>{t}</a> },
    { title: '报价总价', dataIndex: 'total_price', render: (v) => `¥${v}` },
    { title: '交期(天)', dataIndex: 'delivery_days' },
    { title: '截止时间', dataIndex: 'deadline', render: (d) => dayjs(d).format('YYYY-MM-DD HH:mm') },
    { title: '询价状态', dataIndex: 'inquiry_status', render: (s) => <Tag>{s === 'open' ? '进行中' : s === 'awarded' ? '已定标' : '已关闭'}</Tag> },
    { title: '中选', dataIndex: 'awarded', render: (a) => (a ? <Tag color="success">已中选</Tag> : <Tag>未中选</Tag>) },
  ];

  return (
    <div>
      <Typography.Title level={4}>我的报价</Typography.Title>
      <Table
        rowKey="id" loading={loading} dataSource={list} columns={columns}
        locale={{ emptyText: <Empty description="还没有报价记录" /> }} scroll={{ x: 'max-content' }}
      />
    </div>
  );
}
