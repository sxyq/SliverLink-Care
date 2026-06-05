import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RbacPage } from './RbacPage';

const fetchVolunteers = vi.fn();
const fetchFamilyBindings = vi.fn();

vi.mock('../api/adminApi', () => ({
  fetchVolunteers: (...args: unknown[]) => fetchVolunteers(...args),
  fetchFamilyBindings: (...args: unknown[]) => fetchFamilyBindings(...args),
}));

describe('RbacPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  it('loads grouped accounts and confirms role change with admin credentials', async () => {
    fetchVolunteers.mockResolvedValue([
      {
        id: 'vol-1',
        name: '王志愿者',
        account: 'vol001',
        createMethod: '后台创建',
        elderCount: 2,
        status: '启用',
      },
    ]);
    fetchFamilyBindings.mockResolvedValue([
      {
        id: 'binding-1',
        familyName: '张家属',
        familyPhoneMasked: '138****0000',
        invitationCode: 'INV-001',
        createMethod: '',
        status: '已绑定',
        elderName: '李奶奶',
        elderArchiveNo: 'A-001',
      },
      {
        id: 'binding-2',
        familyName: '张家属',
        familyPhoneMasked: '138****0000',
        invitationCode: 'INV-001',
        createMethod: '',
        status: '已绑定',
        elderName: '赵爷爷',
        elderArchiveNo: 'A-002',
      },
    ]);

    render(<RbacPage />);

    expect(await screen.findByRole('heading', { name: '账号权限管理' })).toBeInTheDocument();
    expect(await screen.findByText('平台管理员')).toBeInTheDocument();
    expect(screen.getByText('王志愿者')).toBeInTheDocument();
    expect(screen.getByText('张家属')).toBeInTheDocument();
    expect(screen.getByText('李奶奶（A-001）、赵爷爷（A-002）')).toBeInTheDocument();

    fireEvent.change(screen.getByDisplayValue('护理志愿者'), { target: { value: '项目管理员' } });

    expect(await screen.findByRole('heading', { name: '确认修改账号类型' })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('当前管理员密码'), { target: { value: 'wrong' } });
    fireEvent.click(screen.getByRole('button', { name: '确认修改' }));
    expect(await screen.findByText('当前管理员账号或密码不正确，未执行账号类型变更。')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('当前管理员密码'), { target: { value: 'admin' } });
    fireEvent.click(screen.getByRole('button', { name: '确认修改' }));

    await waitFor(() => {
      expect(screen.getByText('已将 王志愿者 的账号类型改为 项目管理员。')).toBeInTheDocument();
      expect(localStorage.getItem('sl_account_role_assignments')).toContain('项目管理员');
    });
  });

  it('shows load error when account data request fails', async () => {
    fetchVolunteers.mockRejectedValue(new Error('权限数据加载失败'));
    fetchFamilyBindings.mockResolvedValue([]);

    render(<RbacPage />);

    expect(await screen.findByText('权限数据加载失败')).toBeInTheDocument();
  });

  it('covers invalid stored assignments, merged family status, same-role no-op and cancel branch', async () => {
    localStorage.setItem('sl_account_role_assignments', '{bad-json');
    fetchVolunteers.mockResolvedValue([
      {
        id: 'vol-1',
        name: '王志愿者',
        account: 'vol001',
        createMethod: '',
        elderCount: 0,
        status: '停用',
      },
    ]);
    fetchFamilyBindings.mockResolvedValue([
      {
        id: 'binding-1',
        familyName: '张家属',
        familyPhoneMasked: '138****0000',
        invitationCode: '',
        createMethod: '',
        status: '已解绑',
        elderName: '李奶奶',
        elderArchiveNo: 'A-001',
      },
      {
        id: 'binding-2',
        familyName: '张家属',
        familyPhoneMasked: '138****0000',
        invitationCode: '',
        createMethod: '',
        status: '已绑定',
        elderName: '赵爷爷',
        elderArchiveNo: 'A-002',
      },
    ]);

    render(<RbacPage />);

    expect(await screen.findByText('邀请码注册')).toBeInTheDocument();
    expect(screen.getByText('张家属')).toBeInTheDocument();
    expect(screen.getByText('已绑定')).toBeInTheDocument();

    fireEvent.change(screen.getByDisplayValue('护理志愿者'), { target: { value: '护理志愿者' } });
    expect(screen.queryByRole('heading', { name: '确认修改账号类型' })).not.toBeInTheDocument();

    fireEvent.change(screen.getByDisplayValue('家属协管账号'), { target: { value: '项目管理员' } });
    expect(await screen.findByRole('heading', { name: '确认修改账号类型' })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('当前管理员账号'), { target: { value: ' admin ' } });
    fireEvent.click(screen.getByRole('button', { name: '取消' }));
    await waitFor(() => {
      expect(screen.queryByRole('heading', { name: '确认修改账号类型' })).not.toBeInTheDocument();
    });
  });
});
