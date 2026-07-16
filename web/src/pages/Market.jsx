import React, { useEffect, useState } from 'react';
import { Table, Tag, Button, App, Empty, Typography } from 'antd';
import { useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import api from '../api.js';

export default function Market() {
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
    { title: '询价标题', dataIndex: 'title', render: (t, r) => <a onClick={() => nav(`/inquiry/${r.id}`)}>{t}</a> },
    { title: '采购方', dataIndex: 'buyer_company' },
    { title: '截止时间', dataIndex: 'deadline', render: (d) => dayjs(d).format('YYYY-MM-DD HH:mm') },
    { title: '已报价', dataIndex: 'quote_count', render: (c) => `${c} 家` },
    {
      title: '我的状态', dataIndex: 'my_quoted', render: (q) =>
        q > 0 ? <Tag color="green">已报价</Tag> : <Tag>未报价</Tag>,
    },
    {
      title: '操作', key: 'act', render: (_, r) => (
        <Button type="link" onClick={() => nav(`/inquiry/${r.id}`)}>
          {r.my_quoted > 0 ? '查看/修改报价' : '去报价'}
        </Button>
      ),
    },
  ];

  return (
    <div>
      <Typography.Title level={4}>询价大厅</Typography.Title>
      <Typography.Paragraph type="secondary">以下为进行中的公开询价单，点击可查看明细并提交报价。</Typography.Paragraph>
      <Table
        rowKey="id"
        loading={loading}
        dataSource={list}
        columns={columns}
        locale={{ emptyText: <Empty description="暂无进行中的询价" /> }}
        scroll={{ x: 'max-content' }}
      />
    </div>
  );
}
