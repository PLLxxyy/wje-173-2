import React, { useState, useEffect } from 'react';
import {
  Table, Button, Modal, Form, Input, Select, DatePicker, Tag, Space, message, Card, Row, Col, List, Descriptions
} from 'antd';
import { PlusOutlined, LinkOutlined, CalendarOutlined, FileTextOutlined, HeartOutlined, ShoppingOutlined, CloseOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import api from '../api';

const { Option } = Select;
const { TextArea } = Input;

const FamilyDashboard = () => {
  const [activeTab, setActiveTab] = useState('bindings');
  const [bindings, setBindings] = useState([]);
  const [elderlyList, setElderlyList] = useState([]);
  const [serviceTypes, setServiceTypes] = useState([]);
  const [orders, setOrders] = useState([]);
  const [healthRecords, setHealthRecords] = useState([]);
  const [serviceRecords, setServiceRecords] = useState([]);
  const [demands, setDemands] = useState([]);
  const [loading, setLoading] = useState(false);

  const [bindModalVisible, setBindModalVisible] = useState(false);
  const [orderModalVisible, setOrderModalVisible] = useState(false);
  const [demandModalVisible, setDemandModalVisible] = useState(false);
  const [selectedElderly, setSelectedElderly] = useState(null);

  const [bindForm] = Form.useForm();
  const [orderForm] = Form.useForm();
  const [demandForm] = Form.useForm();

  const fetchBindings = async () => {
    try {
      const res = await api.get('/family/bindings');
      setBindings(res.data);
    } catch (err) {
      message.error('获取绑定列表失败');
    }
  };

  const fetchElderly = async () => {
    try {
      const res = await api.get('/elderly');
      setElderlyList(res.data);
    } catch (err) {
      message.error('获取老人列表失败');
    }
  };

  const fetchServiceTypes = async () => {
    try {
      const res = await api.get('/service-types');
      setServiceTypes(res.data);
    } catch (err) {
      message.error('获取服务类型失败');
    }
  };

  const fetchOrders = async () => {
    try {
      const res = await api.get('/service-orders');
      setOrders(res.data);
    } catch (err) {
      message.error('获取订单列表失败');
    }
  };

  const fetchHealthRecords = async (elderlyId) => {
    if (!elderlyId) return;
    try {
      const res = await api.get(`/family/elderly/${elderlyId}/health-records`);
      setHealthRecords(res.data);
    } catch (err) {
      message.error('获取健康档案失败');
    }
  };

  const fetchServiceRecords = async (elderlyId) => {
    if (!elderlyId) return;
    try {
      const res = await api.get(`/family/elderly/${elderlyId}/service-records`);
      setServiceRecords(res.data);
    } catch (err) {
      message.error('获取服务记录失败');
    }
  };

  const fetchDemands = async () => {
    try {
      const res = await api.get('/volunteer-demands');
      setDemands(res.data);
    } catch (err) {
      message.error('获取需求列表失败');
    }
  };

  useEffect(() => {
    if (activeTab === 'bindings') {
      fetchBindings();
      fetchElderly();
    } else if (activeTab === 'orders') {
      fetchOrders();
      fetchServiceTypes();
      fetchBindings();
    } else if (activeTab === 'health') {
      fetchBindings();
    } else if (activeTab === 'records') {
      fetchBindings();
    } else if (activeTab === 'demands') {
      fetchDemands();
      fetchBindings();
    }
  }, [activeTab]);

  const handleBind = async (values) => {
    try {
      await api.post('/family/bindings', values);
      message.success('绑定成功');
      setBindModalVisible(false);
      bindForm.resetFields();
      fetchBindings();
    } catch (err) {
      message.error('绑定失败');
    }
  };

  const handleCreateOrder = async (values) => {
    try {
      await api.post('/service-orders', {
        ...values,
        scheduled_time: values.scheduled_time.format('YYYY-MM-DD HH:mm:ss')
      });
      message.success('预约成功');
      setOrderModalVisible(false);
      orderForm.resetFields();
      fetchOrders();
    } catch (err) {
      message.error('预约失败');
    }
  };

  const handleCreateDemand = async (values) => {
    try {
      await api.post('/volunteer-demands', values);
      message.success('发布成功');
      setDemandModalVisible(false);
      demandForm.resetFields();
      fetchDemands();
    } catch (err) {
      message.error('发布失败');
    }
  };

  const handleCancelOrder = (orderId) => {
    Modal.confirm({
      title: '确认取消',
      content: '确定要取消此预约吗？',
      okText: '确认取消',
      okType: 'danger',
      cancelText: '返回',
      onOk: async () => {
        try {
          await api.put(`/service-orders/${orderId}/cancel`);
          message.success('取消成功');
          fetchOrders();
        } catch (err) {
          message.error(err.response?.data?.error || '取消失败');
        }
      }
    });
  };

  const approvedElderly = bindings.filter(b => b.status === 'approved');

  const statusMap = {
    pending: { text: '待接单', color: 'orange' },
    accepted: { text: '已接单', color: 'blue' },
    completed: { text: '已完成', color: 'green' },
    cancelled: { text: '已取消', color: 'red' }
  };

  const demandTypeMap = {
    companion: { text: '陪伴聊天', color: 'blue' },
    errand: { text: '代办事务', color: 'green' }
  };

  const demandStatusMap = {
    open: { text: '待认领', color: 'orange' },
    matched: { text: '已匹配', color: 'blue' },
    completed: { text: '已完成', color: 'green' }
  };

  const renderTabButton = (key, label, icon) => (
    <Button
      type={activeTab === key ? 'primary' : 'default'}
      icon={icon}
      onClick={() => setActiveTab(key)}
      style={{ marginRight: 8 }}
    >
      {label}
    </Button>
  );

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        {renderTabButton('bindings', '绑定老人', <LinkOutlined />)}
        {renderTabButton('orders', '服务订单', <FileTextOutlined />)}
        {renderTabButton('health', '健康档案', <HeartOutlined />)}
        {renderTabButton('records', '服务记录', <FileTextOutlined />)}
        {renderTabButton('demands', '志愿者需求', <ShoppingOutlined />)}
      </div>

      {activeTab === 'bindings' && (
        <Card className="card-shadow">
          <div style={{ marginBottom: 16 }}>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setBindModalVisible(true)}>
              绑定老人
            </Button>
          </div>
          <Table
            columns={[
              { title: '老人姓名', dataIndex: 'elderly_name', key: 'elderly_name' },
              { title: '年龄', dataIndex: 'age', key: 'age' },
              { title: '住址', dataIndex: 'address', key: 'address' },
              { title: '关系', dataIndex: 'relation', key: 'relation' },
              {
                title: '状态',
                dataIndex: 'status',
                key: 'status',
                render: (s) => s === 'approved' ? <Tag color="green">已绑定</Tag> : <Tag color="orange">待审核</Tag>
              }
            ]}
            dataSource={bindings}
            rowKey="id"
          />
        </Card>
      )}

      {activeTab === 'orders' && (
        <Card className="card-shadow">
          <div style={{ marginBottom: 16 }}>
            <Button type="primary" icon={<CalendarOutlined />} onClick={() => setOrderModalVisible(true)}>
              预约服务
            </Button>
          </div>
          <Table
            columns={[
              { title: '老人姓名', dataIndex: 'elderly_name', key: 'elderly_name' },
              { title: '服务类型', dataIndex: 'service_type', key: 'service_type' },
              { title: '预约时间', dataIndex: 'scheduled_time', key: 'scheduled_time' },
              { title: '备注', dataIndex: 'notes', key: 'notes' },
              {
                title: '状态',
                dataIndex: 'status',
                key: 'status',
                render: (s) => {
                  const { text, color } = statusMap[s] || {};
                  return <Tag color={color}>{text}</Tag>;
                }
              },
              { title: '服务人员', dataIndex: 'worker_name', key: 'worker_name' },
              {
                title: '操作',
                key: 'action',
                render: (_, record) => (
                  record.status === 'pending' ? (
                    <Button
                      type="primary"
                      danger
                      icon={<CloseOutlined />}
                      onClick={() => handleCancelOrder(record.id)}
                    >
                      取消预约
                    </Button>
                  ) : (
                    <span>-</span>
                  )
                )
              }
            ]}
            dataSource={orders}
            rowKey="id"
          />
        </Card>
      )}

      {activeTab === 'health' && (
        <Card className="card-shadow">
          <div style={{ marginBottom: 16 }}>
            <Select
              placeholder="选择老人查看健康档案"
              style={{ width: 250 }}
              value={selectedElderly}
              onChange={(val) => {
                setSelectedElderly(val);
                fetchHealthRecords(val);
              }}
            >
              {approvedElderly.map(b => (
                <Option key={b.elderly_id} value={b.elderly_id}>{b.elderly_name}</Option>
              ))}
            </Select>
          </div>
          {selectedElderly && (
            <List
              dataSource={healthRecords}
              renderItem={item => (
                <List.Item>
                  <Card style={{ width: '100%' }}>
                    <Descriptions column={3} size="small">
                      <Descriptions.Item label="记录日期">{item.record_date}</Descriptions.Item>
                      <Descriptions.Item label="血压">{item.blood_pressure || '-'}</Descriptions.Item>
                      <Descriptions.Item label="心率">{item.heart_rate || '-'}</Descriptions.Item>
                      <Descriptions.Item label="血糖">{item.blood_sugar || '-'}</Descriptions.Item>
                      <Descriptions.Item label="用药">{item.medications || '-'}</Descriptions.Item>
                      <Descriptions.Item label="记录人">{item.creator_name || '-'}</Descriptions.Item>
                      <Descriptions.Item label="备注" span={3}>{item.notes || '-'}</Descriptions.Item>
                    </Descriptions>
                  </Card>
                </List.Item>
              )}
            />
          )}
        </Card>
      )}

      {activeTab === 'records' && (
        <Card className="card-shadow">
          <div style={{ marginBottom: 16 }}>
            <Select
              placeholder="选择老人查看服务记录"
              style={{ width: 250 }}
              value={selectedElderly}
              onChange={(val) => {
                setSelectedElderly(val);
                fetchServiceRecords(val);
              }}
            >
              {approvedElderly.map(b => (
                <Option key={b.elderly_id} value={b.elderly_id}>{b.elderly_name}</Option>
              ))}
            </Select>
          </div>
          {selectedElderly && (
            <Table
              columns={[
                { title: '服务类型', dataIndex: 'service_type', key: 'service_type' },
                { title: '预约时间', dataIndex: 'scheduled_time', key: 'scheduled_time' },
                { title: '服务内容', dataIndex: 'service_content', key: 'service_content' },
                { title: '服务时长(分钟)', dataIndex: 'duration', key: 'duration' },
                { title: '服务人员', dataIndex: 'worker_name', key: 'worker_name' },
                { title: '老人反馈', dataIndex: 'elderly_feedback', key: 'elderly_feedback' },
                { title: '记录时间', dataIndex: 'created_at', key: 'created_at' }
              ]}
              dataSource={serviceRecords}
              rowKey="id"
            />
          )}
        </Card>
      )}

      {activeTab === 'demands' && (
        <Card className="card-shadow">
          <div style={{ marginBottom: 16 }}>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setDemandModalVisible(true)}>
              发布需求
            </Button>
          </div>
          <Table
            columns={[
              { title: '老人姓名', dataIndex: 'elderly_name', key: 'elderly_name' },
              { title: '标题', dataIndex: 'title', key: 'title' },
              { title: '描述', dataIndex: 'description', key: 'description' },
              {
                title: '类型',
                dataIndex: 'demand_type',
                key: 'demand_type',
                render: (t) => {
                  const { text, color } = demandTypeMap[t] || {};
                  return <Tag color={color}>{text}</Tag>;
                }
              },
              {
                title: '状态',
                dataIndex: 'status',
                key: 'status',
                render: (s) => {
                  const { text, color } = demandStatusMap[s] || {};
                  return <Tag color={color}>{text}</Tag>;
                }
              },
              { title: '发布人', dataIndex: 'creator_name', key: 'creator_name' }
            ]}
            dataSource={demands}
            rowKey="id"
          />
        </Card>
      )}

      <Modal title="绑定老人" open={bindModalVisible} onCancel={() => setBindModalVisible(false)} footer={null}>
        <Form form={bindForm} layout="vertical" onFinish={handleBind}>
          <Form.Item name="elderly_id" label="选择老人" rules={[{ required: true }]}>
            <Select placeholder="请选择老人">
              {elderlyList.map(e => (
                <Option key={e.id} value={e.id}>{e.name} - {e.address}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="relation" label="与老人关系" rules={[{ required: true }]}>
            <Input placeholder="如：儿子、女儿、孙子等" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block>确认绑定</Button>
          </Form.Item>
        </Form>
      </Modal>

      <Modal title="预约服务" open={orderModalVisible} onCancel={() => setOrderModalVisible(false)} footer={null}>
        <Form form={orderForm} layout="vertical" onFinish={handleCreateOrder}>
          <Form.Item name="elderly_id" label="选择老人" rules={[{ required: true }]}>
            <Select placeholder="请选择老人">
              {approvedElderly.map(b => (
                <Option key={b.elderly_id} value={b.elderly_id}>{b.elderly_name} - {b.address}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="service_type_id" label="服务类型" rules={[{ required: true }]}>
            <Select placeholder="请选择服务类型">
              {serviceTypes.map(s => (
                <Option key={s.id} value={s.id}>{s.name}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="scheduled_time" label="预约时间" rules={[{ required: true }]}>
            <DatePicker showTime style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="notes" label="备注">
            <TextArea rows={3} placeholder="请填写备注信息" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block>提交预约</Button>
          </Form.Item>
        </Form>
      </Modal>

      <Modal title="发布志愿者需求" open={demandModalVisible} onCancel={() => setDemandModalVisible(false)} footer={null}>
        <Form form={demandForm} layout="vertical" onFinish={handleCreateDemand}>
          <Form.Item name="elderly_id" label="选择老人" rules={[{ required: true }]}>
            <Select placeholder="请选择老人">
              {approvedElderly.map(b => (
                <Option key={b.elderly_id} value={b.elderly_id}>{b.elderly_name} - {b.address}</Option>
              ))}
            </Select>
          </Form.Item>
          <Form.Item name="demand_type" label="需求类型" rules={[{ required: true }]}>
            <Select placeholder="请选择需求类型">
              <Option value="companion">陪伴聊天</Option>
              <Option value="errand">代办事务</Option>
            </Select>
          </Form.Item>
          <Form.Item name="title" label="需求标题" rules={[{ required: true }]}>
            <Input placeholder="请输入需求标题" />
          </Form.Item>
          <Form.Item name="description" label="详细描述">
            <TextArea rows={3} placeholder="请详细描述需求" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block>发布需求</Button>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default FamilyDashboard;
