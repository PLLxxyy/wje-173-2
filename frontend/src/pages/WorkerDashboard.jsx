import React, { useState, useEffect } from 'react';
import {
  Table, Button, Modal, Form, Input, InputNumber, Select, Tag, Space, message, Card, Descriptions
} from 'antd';
import { CheckOutlined, FileTextOutlined, ClockCircleOutlined } from '@ant-design/icons';
import api from '../api';

const { TextArea } = Input;

const WorkerDashboard = () => {
  const [activeTab, setActiveTab] = useState('pending');
  const [pendingOrders, setPendingOrders] = useState([]);
  const [myOrders, setMyOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [completeModalVisible, setCompleteModalVisible] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [form] = Form.useForm();

  const fetchPendingOrders = async () => {
    setLoading(true);
    try {
      const res = await api.get('/service-orders', { params: { status: 'pending' } });
      setPendingOrders(res.data);
    } catch (err) {
      message.error('获取待接单列表失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchMyOrders = async () => {
    setLoading(true);
    try {
      const res = await api.get('/service-orders');
      setMyOrders(res.data.filter(o => o.worker_id));
    } catch (err) {
      message.error('获取我的订单失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'pending') {
      fetchPendingOrders();
    } else {
      fetchMyOrders();
    }
  }, [activeTab]);

  const handleAccept = async (orderId) => {
    Modal.confirm({
      title: '确认接单',
      content: '确定要接此订单吗？',
      onOk: async () => {
        try {
          await api.put(`/service-orders/${orderId}/accept`);
          message.success('接单成功');
          fetchPendingOrders();
        } catch (err) {
          message.error('接单失败');
        }
      }
    });
  };

  const handleCompleteClick = (order) => {
    setSelectedOrder(order);
    form.resetFields();
    setCompleteModalVisible(true);
  };

  const handleComplete = async (values) => {
    try {
      await api.put(`/service-orders/${selectedOrder.id}/complete`, values);
      message.success('服务完成，记录已保存');
      setCompleteModalVisible(false);
      fetchMyOrders();
    } catch (err) {
      message.error('操作失败');
    }
  };

  const statusMap = {
    pending: { text: '待接单', color: 'orange' },
    accepted: { text: '已接单', color: 'blue' },
    completed: { text: '已完成', color: 'green' },
    cancelled: { text: '已取消', color: 'red' }
  };

  const commonColumns = [
    { title: '老人姓名', dataIndex: 'elderly_name', key: 'elderly_name' },
    { title: '服务类型', dataIndex: 'service_type', key: 'service_type' },
    { title: '住址', dataIndex: 'address', key: 'address' },
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
    }
  ];

  const pendingColumns = [
    ...commonColumns,
    { title: '申请人', dataIndex: 'requester_name', key: 'requester_name' },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Button type="primary" icon={<CheckOutlined />} onClick={() => handleAccept(record.id)}>
          接单
        </Button>
      )
    }
  ];

  const myColumns = [
    ...commonColumns,
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        record.status === 'accepted' ? (
          <Button type="primary" icon={<CheckOutlined />} onClick={() => handleCompleteClick(record)}>
            完成服务
          </Button>
        ) : (
          <span>-</span>
        )
      )
    }
  ];

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Button
          type={activeTab === 'pending' ? 'primary' : 'default'}
          icon={<ClockCircleOutlined />}
          onClick={() => setActiveTab('pending')}
          style={{ marginRight: 8 }}
        >
          待接单
        </Button>
        <Button
          type={activeTab === 'my-orders' ? 'primary' : 'default'}
          icon={<FileTextOutlined />}
          onClick={() => setActiveTab('my-orders')}
        >
          我的订单
        </Button>
      </div>

      {activeTab === 'pending' && (
        <Card className="card-shadow">
          <Table
            columns={pendingColumns}
            dataSource={pendingOrders}
            rowKey="id"
            loading={loading}
          />
        </Card>
      )}

      {activeTab === 'my-orders' && (
        <Card className="card-shadow">
          <Table
            columns={myColumns}
            dataSource={myOrders}
            rowKey="id"
            loading={loading}
          />
        </Card>
      )}

      <Modal
        title="完成服务 - 填写服务记录"
        open={completeModalVisible}
        onCancel={() => setCompleteModalVisible(false)}
        footer={null}
        width={600}
      >
        {selectedOrder && (
          <div>
            <Descriptions column={2} size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="老人">{selectedOrder.elderly_name}</Descriptions.Item>
              <Descriptions.Item label="服务类型">{selectedOrder.service_type}</Descriptions.Item>
              <Descriptions.Item label="地址">{selectedOrder.address}</Descriptions.Item>
              <Descriptions.Item label="预约时间">{selectedOrder.scheduled_time}</Descriptions.Item>
            </Descriptions>
            <Form form={form} layout="vertical" onFinish={handleComplete}>
              <Form.Item
                name="service_content"
                label="服务内容"
                rules={[{ required: true, message: '请填写服务内容' }]}
              >
                <TextArea rows={4} placeholder="请详细描述服务内容" />
              </Form.Item>
              <Form.Item
                name="duration"
                label="服务时长（分钟）"
                rules={[{ required: true, message: '请填写服务时长' }]}
              >
                <InputNumber min={1} style={{ width: '100%' }} placeholder="请输入服务时长" />
              </Form.Item>
              <Form.Item name="elderly_feedback" label="老人反馈">
                <TextArea rows={3} placeholder="请填写老人反馈意见" />
              </Form.Item>
              <Form.Item>
                <Button type="primary" htmlType="submit" block>
                  确认完成
                </Button>
              </Form.Item>
            </Form>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default WorkerDashboard;
