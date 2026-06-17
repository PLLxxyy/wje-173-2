import React, { useState } from 'react';
import { Form, Input, Button, Select, Card, message, Tabs } from 'antd';
import { UserOutlined, LockOutlined, PhoneOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import api from '../api';

const { Option } = Select;

const Login = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleLogin = async (values) => {
    setLoading(true);
    try {
      const res = await api.post('/auth/login', values);
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(res.data.user));
      message.success('登录成功');
      window.location.href = '/';
    } catch (err) {
      message.error(err.response?.data?.error || '登录失败');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (values) => {
    setLoading(true);
    try {
      await api.post('/auth/register', values);
      message.success('注册成功，请登录');
      return true;
    } catch (err) {
      message.error(err.response?.data?.error || '注册失败');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const loginItems = [
    {
      name: 'username',
      rules: [{ required: true, message: '请输入用户名' }],
      children: <Input prefix={<UserOutlined />} placeholder="用户名" size="large" />
    },
    {
      name: 'password',
      rules: [{ required: true, message: '请输入密码' }],
      children: <Input.Password prefix={<LockOutlined />} placeholder="密码" size="large" />
    }
  ];

  const registerItems = [
    {
      name: 'username',
      rules: [{ required: true, message: '请输入用户名' }],
      children: <Input prefix={<UserOutlined />} placeholder="用户名" size="large" />
    },
    {
      name: 'password',
      rules: [{ required: true, message: '请输入密码' }, { min: 6, message: '密码至少6位' }],
      children: <Input.Password prefix={<LockOutlined />} placeholder="密码" size="large" />
    },
    {
      name: 'name',
      rules: [{ required: true, message: '请输入姓名' }],
      children: <Input placeholder="真实姓名" size="large" />
    },
    {
      name: 'phone',
      rules: [{ required: true, message: '请输入手机号' }],
      children: <Input prefix={<PhoneOutlined />} placeholder="手机号" size="large" />
    },
    {
      name: 'role',
      rules: [{ required: true, message: '请选择角色' }],
      children: (
        <Select placeholder="选择角色" size="large">
          <Option value="family">家属</Option>
          <Option value="volunteer">志愿者</Option>
          <Option value="worker">服务人员</Option>
        </Select>
      )
    }
  ];

  return (
    <div className="login-container">
      <Card className="login-box" variant="outlined">
        <h1 className="login-title">社区养老服务平台</h1>
        <Tabs
          defaultActiveKey="login"
          centered
          items={[
            {
              key: 'login',
              label: '登录',
              children: (
                <Form name="login" onFinish={handleLogin} autoComplete="off">
                  {loginItems.map((item, idx) => (
                    <Form.Item key={idx} name={item.name} rules={item.rules}>
                      {item.children}
                    </Form.Item>
                  ))}
                  <Form.Item>
                    <Button type="primary" htmlType="submit" size="large" block loading={loading}>
                      登录
                    </Button>
                  </Form.Item>
                </Form>
              )
            },
            {
              key: 'register',
              label: '注册',
              children: (
                <Form
                  name="register"
                  onFinish={async (values) => {
                    const success = await handleRegister(values);
                    if (success) return true;
                  }}
                  autoComplete="off"
                >
                  {registerItems.map((item, idx) => (
                    <Form.Item key={idx} name={item.name} rules={item.rules}>
                      {item.children}
                    </Form.Item>
                  ))}
                  <Form.Item>
                    <Button type="primary" htmlType="submit" size="large" block loading={loading}>
                      注册
                    </Button>
                  </Form.Item>
                </Form>
              )
            }
          ]}
        />
        <div style={{ marginTop: 16, fontSize: 12, color: '#999', textAlign: 'center' }}>
          测试账号：admin/admin123 (管理员) | family1/123456 (家属) | worker1/123456 (服务人员) | volunteer1/123456 (志愿者)
        </div>
      </Card>
    </div>
  );
};

export default Login;
