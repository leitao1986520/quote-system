import React, { useEffect, useState } from 'react';
import {
  Card, Descriptions, Table, Tag, Button, App, Typography, InputNumber, Input,
  Space, Statistic, Row, Col, Alert,
} from 'antd';
import { useParams, useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import * as XLSX from 'xlsx';
import api from '../api.js';
import { useAuth } from '../auth.jsx';

const STATUS = { open: { c: 'processing', t: '进行中' }, closed: { c: 'default', t: '已关闭' }, awarded: { c: 'success', t: '已定标' } };

function itemLabel(it) {
  return it.spec ? it.name + '(' + it.spec + ')' : it.name;
}

export default function InquiryDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const { user } = useAuth();
  const { message } = App.useApp();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [prices, setPrices] = useState([]);
  const [delivery, setDelivery] = useState();
  const [remark, setRemark] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data: d } = await api.get(`/inquiries/${id}`);
      setData(d);
      if (user.role === 'supplier' && d.quotations[0]) {
        setPrices(d.quotations[0].items.map((it) => it.unit_price));
        setDelivery(d.quotations[0].delivery_days);
        setRemark(d.quotations[0].remark || '');
      } else if (user.role === 'supplier') {
        setPrices(d.items.map(() => 0));
      }
    } catch (e) {
      message.error(e.response?.data?.error || '加载失败');
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, [id]);

  // 供应商提交报价
  const submitQuote = async () => {
    if (prices.some((p) => p === '' || p == null || Number(p) < 0)) {
      return message.error('请填写所有单价');
    }
    setSubmitting(true);
    try {
      await api.post('/quotations', { inquiry_id: Number(id), delivery_days: delivery, remark, prices: prices.map(Number) });
      message.success('报价已提交');
      load();
    } catch (e) {
      message.error(e.response?.data?.error || '提交失败');
    } finally {
      setSubmitting(false);
    }
  };

  // 采购方定标
  const award = async (qid) => {
    await api.post(`/inquiries/${id}/award`, { quotation_id: qid });
    message.success('定标成功');
    load();
  };

  // 导出 Excel
  const exportExcel = async () => {
    try {
      const { data: d } = await api.get(`/export/inquiry/${id}`);
      const wb = XLSX.utils.book_new();
      const rows = [];
      rows.push(['询价单标题', d.inquiry.title]);
      rows.push(['截止时间', d.inquiry.deadline]);
      rows.push(['状态', STATUS[d.inquiry.status].t]);
      rows.push([]);
      rows.push(['询价明细']);
      rows.push(['物品', '规格', '单位', '数量']);
      d.items.forEach((it) => rows.push([it.name, it.spec || '', it.unit || '', it.quantity]));
      rows.push([]);
      rows.push(['报价对比']);
      const head = ['供应商'];
      d.items.forEach((it) => head.push(itemLabel(it)));
      head.push('总价', '交期(天)', '是否中选');
      rows.push(head);
      d.quotations.forEach((q) => {
        const row = [q.supplier_company];
        q.items.forEach((qi) => row.push(qi.unit_price));
        row.push(q.total_price, q.delivery_days, q.awarded ? '中选' : '');
        rows.push(row);
      });
      const ws = XLSX.utils.aoa_to_sheet(rows);
      const cols = [{ wch: 20 }];
      d.items.forEach(() => cols.push({ wch: 14 }));
      cols.push({ wch: 12 }, { wch: 12 }, { wch: 10 });
      ws['!cols'] = cols;
      XLSX.utils.book_append_sheet(wb, ws, '询比价结果');
      XLSX.writeFile(wb, `询比价结果_${d.inquiry.title}.xlsx`);
      message.success('已导出 Excel');
    } catch (e) {
      message.error(e.response?.data?.error || '导出失败');
    }
  };

  if (!data) return <Typography.Text>加载中…</Typography.Text>;
  const { inquiry, items, quotations } = data;

  // ---------- 采购方视图 ----------
  if (user.role === 'buyer') {
    const compareCols = [
      { title: '物品', dataIndex: 'name', fixed: 'left', render: (t, r) => itemLabel(r) },
      { title: '单位', dataIndex: 'unit' },
      { title: '数量', dataIndex: 'quantity' },
      ...quotations.map((q) => ({
        title: (
          <div>
            <div>{q.supplier_company}</div>
            {q.awarded && <Tag color="success">中选</Tag>}
          </div>
        ),
        children: [
          { title: '单价', key: `p${q.id}`, render: (_, r) => {
            const qi = q.items.find((x) => x.inquiry_item_id === r.id);
            return qi ? `¥${qi.unit_price}` : '-';
          } },
        ],
      })),
      {
        title: '总价',
        key: 'total',
        fixed: 'right',
        render: (_, r) => null,
        children: quotations.map((q) => ({
          title: q.supplier_company,
          key: `t${q.id}`,
          render: () => `¥${q.total_price}`,
        })),
      },
    ];

    return (
      <div>
        <Space style={{ marginBottom: 16 }}>
          <Button onClick={() => nav('/my-inquiries')}>返回</Button>
        </Space>
        <Typography.Title level={4}>{inquiry.title}</Typography.Title>
        <Descriptions bordered size="small" column={{ xs: 1, sm: 2 }} style={{ marginBottom: 16 }}>
          <Descriptions.Item label="状态"><Tag color={STATUS[inquiry.status].c}>{STATUS[inquiry.status].t}</Tag></Descriptions.Item>
          <Descriptions.Item label="截止时间">{dayjs(inquiry.deadline).format('YYYY-MM-DD HH:mm')}</Descriptions.Item>
          <Descriptions.Item label="说明" span={2}>{inquiry.description || '无'}</Descriptions.Item>
        </Descriptions>

        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col><Statistic title="报价家数" value={quotations.length} suffix="家" /></Col>
          {quotations.length > 0 && (
            <Col><Statistic title="最低总价" value={Math.min(...quotations.map((q) => q.total_price))} prefix="¥" /></Col>
          )}
        </Row>

        <Card title="报价对比" extra={inquiry.status !== 'open' && <Button type="primary" onClick={exportExcel}>导出 Excel</Button>}>
          <Alert type="info" showIcon style={{ marginBottom: 12 }} message="点击某供应商的「定标」按钮可确认中选；定标后状态变为已定标并可导出结果。" />
          <Table
            rowKey="id"
            dataSource={items}
            columns={compareCols}
            pagination={false}
            scroll={{ x: 'max-content' }}
            summary={() => (
              <Table.Summary fixed>
                <Table.Summary.Row>
                  <Table.Summary.Cell index={0} colSpan={3}><b>合计总价</b></Table.Summary.Cell>
                  {quotations.map((q) => (
                    <Table.Summary.Cell key={q.id} index={q.id}>
                      <b>¥{q.total_price}</b>
                    </Table.Summary.Cell>
                  ))}
                </Table.Summary.Row>
              </Table.Summary>
            )}
          />
          <Table
            style={{ marginTop: 16 }}
            rowKey="id"
            dataSource={quotations}
            pagination={false}
            columns={[
              { title: '供应商', dataIndex: 'supplier_company' },
              { title: '总价', dataIndex: 'total_price', render: (v) => `¥${v}`, sorter: (a, b) => a.total_price - b.total_price, defaultSortOrder: 'ascend' },
              { title: '交期(天)', dataIndex: 'delivery_days' },
              { title: '备注', dataIndex: 'remark' },
              {
                title: '操作', key: 'act', render: (_, r) => (
                  r.awarded
                    ? <Tag color="success">已中选</Tag>
                    : <Button type="link" onClick={() => award(r.id)} disabled={inquiry.status === 'awarded'}>定标</Button>
                ),
              },
            ]}
          />
        </Card>
      </div>
    );
  }

  // ---------- 供应商视图 ----------
  const myQuote = quotations[0];
  const subtotal = items.reduce((s, it, i) => s + (Number(prices[i]) || 0) * it.quantity, 0);
  const quoteCols = [
    { title: '物品', dataIndex: 'name', render: (t, r) => itemLabel(r) },
    { title: '单位', dataIndex: 'unit' },
    { title: '数量', dataIndex: 'quantity' },
    { title: '单价(¥)', key: 'price', render: (_, r, i) => (
      <InputNumber min={0} value={prices[i]} onChange={(v) => setPrices((p) => p.map((x, idx) => (idx === i ? v : x)))} style={{ width: 120 }} disabled={inquiry.status !== 'open'} />
    ) },
    { title: '小计', key: 'sub', render: (_, r, i) => `¥${((Number(prices[i]) || 0) * r.quantity).toFixed(2)}` },
  ];

  return (
    <div>
      <Space style={{ marginBottom: 16 }}><Button onClick={() => nav('/market')}>返回</Button></Space>
      <Typography.Title level={4}>{inquiry.title}</Typography.Title>
      <Descriptions bordered size="small" column={{ xs: 1, sm: 2 }} style={{ marginBottom: 16 }}>
        <Descriptions.Item label="状态"><Tag color={STATUS[inquiry.status].c}>{STATUS[inquiry.status].t}</Tag></Descriptions.Item>
        <Descriptions.Item label="截止时间">{dayjs(inquiry.deadline).format('YYYY-MM-DD HH:mm')}</Descriptions.Item>
        <Descriptions.Item label="说明" span={2}>{inquiry.description || '无'}</Descriptions.Item>
      </Descriptions>

      {inquiry.status !== 'open' ? (
        <Alert type={myQuote?.awarded ? 'success' : 'warning'} showIcon
          message={myQuote?.awarded ? '恭喜，您已中选！' : '该询价已截止，无法修改报价。'} style={{ marginBottom: 16 }} />
      ) : null}

      <Card title="报价填写">
        <Table rowKey="id" dataSource={items} columns={quoteCols} pagination={false} scroll={{ x: 'max-content' }} />
        <Row gutter={16} style={{ marginTop: 16 }}>
          <Col><Statistic title="报价总价" value={subtotal.toFixed(2)} prefix="¥" /></Col>
          <Col><Input style={{ width: 140 }} type="number" placeholder="交期(天)" value={delivery} onChange={(e) => setDelivery(e.target.value)} /></Col>
        </Row>
        <Input.TextArea rows={2} placeholder="备注（发票、运费等）" value={remark} onChange={(e) => setRemark(e.target.value)} style={{ marginTop: 12 }} />
        <Button type="primary" style={{ marginTop: 12 }} loading={submitting} disabled={inquiry.status !== 'open'} onClick={submitQuote}>
          {myQuote ? '修改报价' : '提交报价'}
        </Button>
      </Card>
    </div>
  );
}
