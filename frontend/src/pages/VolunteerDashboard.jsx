import React, { useState, useEffect } from 'react';
import {
  Table, Button, Modal, Tag, message, Card, Descriptions
} from 'antd';
import { SmileOutlined, FileTextOutlined, TeamOutlined } from '@ant-design/icons';
import api from '../api';

const VolunteerDashboard = () => {
  const [activeTab, setActiveTab] = useState('demands');
  const [demands, setDemands] = useState([]);
  const [mySignups, setMySignups] = useState([]);
  const [loading, setLoading] = useState(false);
  const [detailVisible, setDetailVisible] = useState(false);
  const [selectedDemand, setSelectedDemand] = useState(null);

  const fetchDemands = async () => {
    setLoading(true);
    try {
      const res = await api.get('/volunteer-demands');
      setDemands(res.data.filter(d => d.status === 'open'));
    } catch (err) {
      message.error('获取需求列表失败');
    } finally {
      setLoading(false);
    }
  };

  const fetchMySignups = async () => {
    setLoading(true);
    try {
      const res = await api.get('/volunteer/my-signups');
      setMySignups(res.data);
    } catch (err) {
      message.error('获取报名记录失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'demands') {
      fetchDemands();
    } else {
      fetchMySignups();
    }
  }, [activeTab]);

  const handleSignup = async (demandId) => {
    Modal.confirm({
      title: '确认报名',
      content: '确定要报名参加此项志愿服务吗？',
      onOk: async () => {
        try {
          await api.post(`/volunteer-demands/${demandId}/signup`);
          message.success('报名成功');
          fetchDemands();
        } catch (err) {
          message.error('报名失败');
        }
      }
    });
  };

  const handleViewDetail = (demand) => {
    setSelectedDemand(demand);
    setDetailVisible(true);
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

  const signupStatusMap = {
    pending: { text: '待审核', color: 'orange' },
    approved: { text: '已通过', color: 'green' },
    rejected: { text: '已拒绝', color: 'red' },
    completed: { text: '已完成', color: 'blue' }
  };

  const demandsColumns = [
    { title: '老人姓名', dataIndex: 'elderly_name', key: 'elderly_name' },
    { title: '标题', dataIndex: 'title', key: 'title' },
    { title: '描述', dataIndex: 'description', key: 'description', ellipsis: true },
    {
      title: '类型',
      dataIndex: 'demand_type',
      key: 'demand_type',
      render: (t) => {
        const { text, color } = demandTypeMap[t] || {};
        return <Tag color={color}>{text}</Tag>;
      }
    },
    { title: '住址', dataIndex: 'address', key: 'address' },
    { title: '发布人', dataIndex: 'creator_name', key: 'creator_name' },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <span className="table-actions">
          <Button type="link" onClick={() => handleViewDetail(record)}>查看详情</Button>
          <Button type="primary" icon={<TeamOutlined />} onClick={() => handleSignup(record.id)}>
            我要报名
          </Button>
        </span>
      )
    }
  ];

  const signupColumns = [
    { title: '需求标题', dataIndex: 'title', key: 'title' },
    { title: '老人姓名', dataIndex: 'elderly_name', key: 'elderly_name' },
    { title: '住址', dataIndex: 'address', key: 'address' },
    {
      title: '需求类型',
      dataIndex: 'demand_type',
      key: 'demand_type',
      render: (t) => {
        const { text, color } = demandTypeMap[t] || {};
        return <Tag color={color}>{text}</Tag>;
      }
    },
    {
      title: '需求状态',
      dataIndex: 'demand_status',
      key: 'demand_status',
      render: (s) => {
        const { text, color } = demandStatusMap[s] || {};
        return <Tag color={color}>{text}</Tag>;
      }
    },
    {
      title: '报名状态',
      dataIndex: 'status',
      key: 'status',
      render: (s) => {
        const { text, color } = signupStatusMap[s] || {};
        return <Tag color={color}>{text}</Tag>;
      }
    },
    { title: '报名时间', dataIndex: 'created_at', key: 'created_at' }
  ];

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Button
          type={activeTab === 'demands' ? 'primary' : 'default'}
          icon={<SmileOutlined />}
          onClick={() => setActiveTab('demands')}
          style={{ marginRight: 8 }}
        >
          需求列表
        </Button>
        <Button
          type={activeTab === 'my-signups' ? 'primary' : 'default'}
          icon={<FileTextOutlined />}
          onClick={() => setActiveTab('my-signups')}
        >
          我的报名
        </Button>
      </div>

      {activeTab === 'demands' && (
        <Card className="card-shadow">
          <Table
            columns={demandsColumns}
            dataSource={demands}
            rowKey="id"
            loading={loading}
          />
        </Card>
      )}

      {activeTab === 'my-signups' && (
        <Card className="card-shadow">
          <Table
            columns={signupColumns}
            dataSource={mySignups}
            rowKey="id"
            loading={loading}
          />
        </Card>
      )}

      <Modal
        title="需求详情"
        open={detailVisible}
        onCancel={() => setDetailVisible(false)}
        footer={[
          <Button key="close" onClick={() => setDetailVisible(false)}>关闭</Button>,
          selectedDemand && (
            <Button
              key="signup"
              type="primary"
              icon={<TeamOutlined />}
              onClick={() => {
                setDetailVisible(false);
                handleSignup(selectedDemand.id);
              }}
            >
              我要报名
            </Button>
          )
        ]}
      >
        {selectedDemand && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="老人">{selectedDemand.elderly_name}</Descriptions.Item>
            <Descriptions.Item label="住址">{selectedDemand.address}</Descriptions.Item>
            <Descriptions.Item label="标题">{selectedDemand.title}</Descriptions.Item>
            <Descriptions.Item label="类型">
              {demandTypeMap[selectedDemand.demand_type]?.text || selectedDemand.demand_type}
            </Descriptions.Item>
            <Descriptions.Item label="详细描述">{selectedDemand.description}</Descriptions.Item>
            <Descriptions.Item label="发布人">{selectedDemand.creator_name}</Descriptions.Item>
            <Descriptions.Item label="发布时间">{selectedDemand.created_at}</Descriptions.Item>
          </Descriptions>
        )}
      </Modal>
    </div>
  );
};

export default VolunteerDashboard;
