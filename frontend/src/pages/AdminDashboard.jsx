import React, { useState, useEffect } from 'react';
import {
  Table, Button, Modal, Form, Input, InputNumber, Select, Tag, Space, message, Card, Row, Col, Statistic
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, UserOutlined, TeamOutlined, FileTextOutlined, HeartOutlined } from '@ant-design/icons';
import ReactECharts from 'echarts-for-react';
import api from '../api';

const { Option } = Select;

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('elderly');
  const [elderlyList, setElderlyList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingElderly, setEditingElderly] = useState(null);
  const [filter, setFilter] = useState({ self_care_level: '', is_lonely: '' });
  const [stats, setStats] = useState(null);
  const [form] = Form.useForm();

  const fetchElderly = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filter.self_care_level) params.self_care_level = filter.self_care_level;
      if (filter.is_lonely !== '') params.is_lonely = filter.is_lonely;
      const res = await api.get('/elderly', { params });
      setElderlyList(res.data);
    } catch (err) {
      message.error('获取老人列表失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await api.get('/admin/stats');
      setStats(res.data);
    } catch (err) {
      message.error('获取统计数据失败');
    }
  };

  useEffect(() => {
    if (activeTab === 'elderly') {
      fetchElderly();
    } else if (activeTab === 'stats') {
      fetchStats();
    }
  }, [activeTab, filter]);

  const handleAdd = () => {
    setEditingElderly(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (record) => {
    setEditingElderly(record);
    form.setFieldsValue(record);
    setModalVisible(true);
  };

  const handleDelete = async (id) => {
    Modal.confirm({
      title: '确认删除',
      content: '确定要删除该老人信息吗？',
      onOk: async () => {
        try {
          await api.delete(`/elderly/${id}`);
          message.success('删除成功');
          fetchElderly();
        } catch (err) {
          message.error('删除失败');
        }
      }
    });
  };

  const handleSubmit = async (values) => {
    try {
      if (editingElderly) {
        await api.put(`/elderly/${editingElderly.id}`, values);
        message.success('更新成功');
      } else {
        await api.post('/elderly', values);
        message.success('添加成功');
      }
      setModalVisible(false);
      fetchElderly();
    } catch (err) {
      message.error('操作失败');
    }
  };

  const selfCareLevelMap = {
    independent: { text: '自理', color: 'green' },
    'semi-dependent': { text: '半自理', color: 'orange' },
    dependent: { text: '失能', color: 'red' }
  };

  const columns = [
    { title: '姓名', dataIndex: 'name', key: 'name' },
    { title: '年龄', dataIndex: 'age', key: 'age' },
    { title: '住址', dataIndex: 'address', key: 'address' },
    { title: '健康状况', dataIndex: 'health_status', key: 'health_status' },
    { title: '紧急联系人', dataIndex: 'emergency_contact', key: 'emergency_contact' },
    { title: '紧急电话', dataIndex: 'emergency_phone', key: 'emergency_phone' },
    {
      title: '自理能力',
      dataIndex: 'self_care_level',
      key: 'self_care_level',
      render: (level) => {
        const { text, color } = selfCareLevelMap[level] || { text: level, color: 'default' };
        return <Tag color={color}>{text}</Tag>;
      }
    },
    {
      title: '是否独居',
      dataIndex: 'is_lonely',
      key: 'is_lonely',
      render: (val) => val ? <Tag color="gold">独居</Tag> : <Tag>非独居</Tag>
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space>
          <Button type="link" icon={<EditOutlined />} onClick={() => handleEdit(record)}>编辑</Button>
          <Button type="link" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record.id)}>删除</Button>
        </Space>
      )
    }
  ];

  const getServiceTypeChart = () => {
    if (!stats?.serviceTypeStats) return {};
    return {
      tooltip: { trigger: 'item' },
      series: [{
        type: 'pie',
        radius: ['40%', '70%'],
        data: stats.serviceTypeStats.map(s => ({ name: s.name, value: s.count })),
        label: { formatter: '{b}: {c} ({d}%)' }
      }]
    };
  };

  const getMonthlyChart = () => {
    if (!stats?.monthlyStats) return {};
    return {
      tooltip: { trigger: 'axis' },
      legend: { data: ['总订单', '已完成'] },
      xAxis: { type: 'category', data: stats.monthlyStats.map(m => m.month) },
      yAxis: { type: 'value' },
      series: [
        { name: '总订单', type: 'line', data: stats.monthlyStats.map(m => m.total), smooth: true },
        { name: '已完成', type: 'line', data: stats.monthlyStats.map(m => m.completed), smooth: true }
      ]
    };
  };

  const getCompletionRateChart = () => {
    if (!stats?.monthlyStats) return {};
    return {
      tooltip: { trigger: 'axis', formatter: '{b}<br/>完成率: {c}%' },
      xAxis: { type: 'category', data: stats.monthlyStats.map(m => m.month) },
      yAxis: { type: 'value', max: 100, axisLabel: { formatter: '{value}%' } },
      series: [{
        name: '完成率', type: 'bar', data: stats.monthlyStats.map(m => m.total > 0 ? Math.round(m.completed / m.total * 100) : 0), itemStyle: { color: '#52c41a' } }]
    };
  };

  const getSelfCareChart = () => {
    if (!stats?.selfCareStats) return {};
    const levelNames = { independent: '自理', 'semi-dependent': '半自理', dependent: '失能' };
    return {
      tooltip: { trigger: 'item' },
      series: [{
        type: 'pie',
        data: stats.selfCareStats.map(s => ({ name: levelNames[s.self_care_level] || s.self_care_level, value: s.count }))
      }]
    };
  };

  return (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', gap: 8 }}>
        <Button type={activeTab === 'elderly' ? 'primary' : 'default'} onClick={() => setActiveTab('elderly')}>
          老人管理
        </Button>
        <Button type={activeTab === 'stats' ? 'primary' : 'default'} onClick={() => setActiveTab('stats')}>
          统计报表
        </Button>
      </div>

      {activeTab === 'elderly' && (
        <Card className="card-shadow">
          <div className="filter-bar">
            <Select
              placeholder="筛选自理能力"
              style={{ width: 150 }}
              allowClear
              value={filter.self_care_level || undefined}
              onChange={(val) => setFilter({ ...filter, self_care_level: val })}
            >
              <Option value="independent">自理</Option>
              <Option value="semi-dependent">半自理</Option>
              <Option value="dependent">失能</Option>
            </Select>
            <Select
              placeholder="筛选独居"
              style={{ width: 150 }}
              allowClear
              value={filter.is_lonely === '' ? undefined : filter.is_lonely}
              onChange={(val) => setFilter({ ...filter, is_lonely: val === undefined ? '' : val })}
            >
              <Option value="1">是</Option>
              <Option value="0">否</Option>
            </Select>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
              录入老人
            </Button>
          </div>
          <Table
            columns={columns}
            dataSource={elderlyList}
            rowKey="id"
            loading={loading}
          />
        </Card>
      )}

      {activeTab === 'stats' && stats && (
        <div>
          <Row gutter={[16, 16]}>
            <Col span={6}>
              <Card className="stat-card">
                <Statistic title="老人总数" value={stats.totalElderly} prefix={<UserOutlined />} />
              </Card>
            </Col>
            <Col span={6}>
              <Card className="stat-card">
                <Statistic title="服务订单" value={stats.totalOrders} prefix={<FileTextOutlined />} />
              </Card>
            </Col>
            <Col span={6}>
              <Card className="stat-card">
                <Statistic title="完成率" value={stats.completionRate} suffix="%" />
              </Card>
            </Col>
            <Col span={6}>
              <Card className="stat-card">
                <Statistic title="独居老人" value={stats.lonelyElderly} prefix={<HeartOutlined />} />
              </Card>
            </Col>
            <Col span={6}>
              <Card className="stat-card">
                <Statistic title="志愿者" value={stats.totalVolunteers} prefix={<TeamOutlined />} />
              </Card>
            </Col>
            <Col span={6}>
              <Card className="stat-card">
                <Statistic title="服务人员" value={stats.totalWorkers} prefix={<TeamOutlined />} />
              </Card>
            </Col>
          </Row>

          <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
            <Col span={12}>
              <Card title="各类服务需求占比" className="card-shadow">
                <ReactECharts option={getServiceTypeChart()} style={{ height: 300 }} />
              </Card>
            </Col>
            <Col span={12}>
              <Card title="自理能力分布" className="card-shadow">
                <ReactECharts option={getSelfCareChart()} style={{ height: 300 }} />
              </Card>
            </Col>
          </Row>

          <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
            <Col span={24}>
              <Card title="月度服务订单趋势" className="card-shadow">
                <ReactECharts option={getMonthlyChart()} style={{ height: 300 }} />
              </Card>
            </Col>
          </Row>

          <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
            <Col span={24}>
              <Card title="月度服务完成率趋势" className="card-shadow">
                <ReactECharts option={getCompletionRateChart()} style={{ height: 300 }} />
              </Card>
            </Col>
          </Row>

          <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
            <Col span={24}>
              <Card title="志愿者活跃度排行" className="card-shadow">
                <Table
                  dataSource={stats.volunteerActivity}
                  rowKey="id"
                  pagination={false}
                  columns={[
                    { title: '排名', dataIndex: 'index', render: (_, __, idx) => idx + 1 },
                    { title: '姓名', dataIndex: 'name' },
                    { title: '电话', dataIndex: 'phone' },
                    { title: '报名次数', dataIndex: 'signup_count' }
                  ]}
                />
              </Card>
            </Col>
          </Row>
        </div>
      )}

      <Modal
        title={editingElderly ? '编辑老人信息' : '录入老人信息'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="name" label="姓名" rules={[{ required: true }]}>
                <Input placeholder="请输入姓名" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="age" label="年龄" rules={[{ required: true }]}>
                <InputNumber min={0} max={150} style={{ width: '100%' }} placeholder="请输入年龄" />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item name="address" label="住址" rules={[{ required: true }]}>
            <Input placeholder="请输入住址" />
          </Form.Item>
          <Form.Item name="health_status" label="健康状况">
            <Input.TextArea rows={2} placeholder="请输入健康状况" />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="emergency_contact" label="紧急联系人" rules={[{ required: true }]}>
                <Input placeholder="请输入紧急联系人" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="emergency_phone" label="紧急联系电话" rules={[{ required: true }]}>
                <Input placeholder="请输入紧急联系电话" />
              </Form.Item>
            </Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="self_care_level" label="自理能力等级" rules={[{ required: true }]}>
                <Select placeholder="请选择">
                  <Option value="independent">自理</Option>
                  <Option value="semi-dependent">半自理</Option>
                  <Option value="dependent">失能</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="is_lonely" label="是否独居">
                <Select placeholder="请选择">
                  <Option value={1}>是</Option>
                  <Option value={0}>否</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>
          <Form.Item>
            <Button type="primary" htmlType="submit" block>
              {editingElderly ? '保存修改' : '确认录入'}
            </Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default AdminDashboard;
