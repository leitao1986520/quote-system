import React, { useState } from 'react';
import { Form, Input, Button, DatePicker, Table, InputNumber, App, Card, Typography, Space } from 'antd';
import { PlusOutlined, MinusCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import api from '../api.js';

export default function NewInquiry() {
  const [form] = Form.useForm();
  const [items, setItems] = useState([{ name: '', spec: '', unit: '', quantity: 1 }]);
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();
  const { message } = App.useApp();

  const update = (i, key, val) => {
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, [key]: val } : it)));
  };
  const add = () => setItems((prev) => [...prev, { name: '', spec: '', unit: '', quantity: 1 }]);
  const remove = (i) => setItems((prev) => prev.filter((_, idx) => idx !== i));

  const onFinish = async (values) => {
    if (items.some((it) => !it.name || !it.quantity)) {
      return message.error('请填写每项明细的名称和数量');
    }
    setLoading(true);
    try {
      const payload = {
        title: values.title,
        description: values.description,
        deadline: values.deadline.format('YYYY-MM-DD HH:mm:ss'),
        items: items.map((it) => ({
          name: it.name, spec: it.spec, unit: it.unit, quantity: Number(it.quantity),
        })),
      };
      await api.post('/inquiries', payload);
      message.success('发布成功');
      nav('/my-inquiries');
    } catch (e) {
      message.error(e.response?.data?.error || '发布失败');
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    { title: '物品名称 *', dataIndex: 'name', render: (_, r, i) => (
      <Input value={r.name} onChange={(e) => update(i, 'name', e.target.value)} placeholder="如：台式电脑" />
    ) },
    { title: '规格', dataIndex: 'spec', render: (_, r, i) => (
      <Input value={r.spec} onChange={(e) => update(i, 'spec', e.target.value)} placeholder="选填" />
    ) },
    { title: '单位', dataIndex: 'unit', render: (_, r, i) => (
      <Input value={r.unit} onChange={(e) => update(i, 'unit', e.target.value)} placeholder="台/套" style={{ width: 90 }} />
    ) },
    { title: '数量 *', dataIndex: 'quantity', render: (_, r, i) => (
      <InputNumber min={0.01} value={r.quantity} onChange={(v) => update(i, 'quantity', v)} style={{ width: 100 }} />
    ) },
    { title: '', key: 'op', render: (_, r, i) => (
      items.length > 1 && <MinusCircleOutlined style={{ color: '#ff4d4f' }} onClick={() => remove(i)} />
    ) },
  ];

  return (
    <div>
      <Typography.Title level={4}>发布询价</Typography.Title>
      <Card>
        <Form form={form} layout="vertical" onFinish={onFinish}>
          <Form.Item label="询价标题" name="title" rules={[{ required: true, message: '请输入标题' }]}>
            <Input placeholder="如：办公电脑采购询价" />
          </Form.Item>
          <Form.Item label="说明" name="description">
            <Input.TextArea rows={3} placeholder="交期要求、发票、运费等补充说明" />
          </Form.Item>
          <Form.Item label="报价截止时间" name="deadline" rules={[{ required: true, message: '请选择截止时间' }]}>
            <DatePicker showTime style={{ width: '100%' }} disabledDate={(d) => d && d < dayjs().startOf('day')} />
          </Form.Item>
          <Typography.Paragraph strong>询价明细</Typography.Paragraph>
          <Table
            rowKey={(_, i) => i}
            dataSource={items}
            columns={columns}
            pagination={false}
            size="small"
            footer={() => (
              <Button type="dashed" onClick={add} block icon={<PlusOutlined />}>添加明细行</Button>
            )}
          />
          <Space style={{ marginTop: 24 }}>
            <Button type="primary" htmlType="submit" loading={loading}>发布询价</Button>
            <Button onClick={() => nav('/my-inquiries')}>取消</Button>
          </Space>
        </Form>
      </Card>
    </div>
  );
}
