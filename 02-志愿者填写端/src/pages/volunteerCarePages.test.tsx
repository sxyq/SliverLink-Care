import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ElderDetailPage } from './ElderDetailPage';
import { BasicInfoFormPage } from './BasicInfoFormPage';
import { HealthRecordFormPage } from './HealthRecordFormPage';
import { MedicationFormPage } from './MedicationFormPage';
import { ScaleFormPage } from './ScaleFormPage';
import { QrCodeManagePage } from './QrCodeManagePage';

const updateBasicInfo = vi.fn();
const sendSmsVerify = vi.fn();
const verifySmsCode = vi.fn();
const saveHealthRecord = vi.fn();
const saveMedications = vi.fn();
const fetchScaleRecords = vi.fn();
const submitScaleRecord = vi.fn();
const fetchVolunteerElderQrCode = vi.fn();
const regenerateVolunteerElderQrCode = vi.fn();
const disableVolunteerElderQrCode = vi.fn();
const qrToDataUrl = vi.fn();

vi.mock('../api', () => ({
  updateBasicInfo: (...args: unknown[]) => updateBasicInfo(...args),
  sendSmsVerify: (...args: unknown[]) => sendSmsVerify(...args),
  verifySmsCode: (...args: unknown[]) => verifySmsCode(...args),
  saveHealthRecord: (...args: unknown[]) => saveHealthRecord(...args),
  saveMedications: (...args: unknown[]) => saveMedications(...args),
  fetchScaleRecords: (...args: unknown[]) => fetchScaleRecords(...args),
  submitScaleRecord: (...args: unknown[]) => submitScaleRecord(...args),
}));

vi.mock('../api/volunteerApi', () => ({
  fetchVolunteerElderQrCode: (...args: unknown[]) => fetchVolunteerElderQrCode(...args),
  regenerateVolunteerElderQrCode: (...args: unknown[]) => regenerateVolunteerElderQrCode(...args),
  disableVolunteerElderQrCode: (...args: unknown[]) => disableVolunteerElderQrCode(...args),
}));

vi.mock('@shared/SubjectDetailPage', () => ({
  SubjectDetailPage: ({ title, onBack, actions, headerAction }: Record<string, unknown>) => (
    <div>
      <h1>{String(title)}</h1>
      <button type="button" onClick={onBack as () => void}>
        back
      </button>
      <div>{headerAction as React.ReactNode}</div>
      {(actions as Array<{ key: string; title: string; onClick: () => void }>).map((action) => (
        <button key={action.key} type="button" onClick={action.onClick}>
          {action.title}
        </button>
      ))}
    </div>
  ),
}));

vi.mock('@shared/MedicationEditorPage', () => ({
  MedicationEditorPage: ({ title, onBack, onSaveBatch }: Record<string, unknown>) => (
    <div>
      <h1>{String(title)}</h1>
      <button type="button" onClick={onBack as () => void}>
        med-back
      </button>
      <button
        type="button"
        onClick={() =>
          (onSaveBatch as (records: Array<Record<string, string>>) => Promise<void>)([
            { id: 'm1', name: '药物', dosage: '1片', usage: '口服', timing: '每日一次' },
          ])
        }
      >
        save-batch
      </button>
    </div>
  ),
}));

vi.mock('qrcode', () => ({
  default: {
    toDataURL: (...args: unknown[]) => qrToDataUrl(...args),
  },
}));

const elder = {
  id: 'elder-1',
  archiveNo: 'A-001',
  name: '李奶奶',
  gender: '女',
  age: 78,
  residence: '重庆',
  emergencyContactName: '家属甲',
  emergencyContactPhone: '13800000000',
  emergencyContactRelation: '女儿',
  aboType: 'A',
  rhType: 'Rh+',
  allergySummary: '无',
  lastVisitDate: '2026-05-01',
  status: '在档' as const,
};

describe('volunteer care pages', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('alert', vi.fn());
  });

  it('renders elder detail actions', () => {
    const onBack = vi.fn();
    const onEditBasic = vi.fn();
    const onEditMedication = vi.fn();
    const onEditScale = vi.fn();
    const onManageQrCode = vi.fn();

    render(
      <ElderDetailPage
        elder={elder}
        onBack={onBack}
        onEditBasic={onEditBasic}
        onEditMedication={onEditMedication}
        onEditScale={onEditScale}
        onManageQrCode={onManageQrCode}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: '基本信息' }));
    fireEvent.click(screen.getByRole('button', { name: '主要用药' }));
    fireEvent.click(screen.getByRole('button', { name: '量表信息' }));
    fireEvent.click(screen.getByRole('button', { name: '二维码管理' }));
    fireEvent.click(screen.getByRole('button', { name: '进入编辑' }));
    fireEvent.click(screen.getByRole('button', { name: 'back' }));

    expect(onEditBasic).toHaveBeenCalledTimes(2);
    expect(onEditMedication).toHaveBeenCalledTimes(1);
    expect(onEditScale).toHaveBeenCalledTimes(1);
    expect(onManageQrCode).toHaveBeenCalledTimes(1);
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('verifies sms and saves basic info', async () => {
    sendSmsVerify.mockResolvedValue({});
    verifySmsCode.mockResolvedValue({ ok: true });
    updateBasicInfo.mockResolvedValue({});
    const onBack = vi.fn();

    render(<BasicInfoFormPage elder={elder} onBack={onBack} />);

    fireEvent.change(screen.getByDisplayValue('13800000000'), { target: { value: '13911112222' } });
    fireEvent.click(screen.getByRole('button', { name: '获取验证码' }));
    await waitFor(() => expect(sendSmsVerify).toHaveBeenCalledWith('13911112222'));

    fireEvent.change(screen.getByPlaceholderText('请输入短信验证码'), { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: '提交保存' }));

    await waitFor(() => {
      expect(verifySmsCode).toHaveBeenCalledWith('13911112222', '123456');
      expect(updateBasicInfo).toHaveBeenCalledWith(
        'elder-1',
        expect.objectContaining({
          name: '李奶奶',
          emergencyContactPhone: '13911112222',
        }),
      );
      expect(onBack).toHaveBeenCalledTimes(1);
    });
  });

  it('shows basic info validation errors on sms verify failure, send failure and save failure', async () => {
    sendSmsVerify.mockRejectedValueOnce(new Error('发送失败'));
    verifySmsCode.mockResolvedValueOnce({ ok: false });
    updateBasicInfo.mockRejectedValueOnce(new Error('保存失败'));
    const onBack = vi.fn();

    render(<BasicInfoFormPage elder={elder} onBack={onBack} />);

    fireEvent.change(screen.getByDisplayValue('13800000000'), { target: { value: '13911112222' } });
    fireEvent.click(screen.getByRole('button', { name: '获取验证码' }));
    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith('发送失败，请重试');
    });

    fireEvent.change(screen.getByPlaceholderText('请输入短信验证码'), { target: { value: '000000' } });
    fireEvent.click(screen.getByRole('button', { name: '提交保存' }));
    await waitFor(() => {
      expect(window.alert).toHaveBeenCalledWith('验证码错误');
    });
    expect(updateBasicInfo).not.toHaveBeenCalled();

    fireEvent.change(screen.getByPlaceholderText('请输入短信验证码'), { target: { value: '' } });
    fireEvent.click(screen.getByRole('button', { name: '提交保存' }));
    await waitFor(() => {
      expect(updateBasicInfo).toHaveBeenCalled();
      expect(window.alert).toHaveBeenCalledWith('保存失败，请重试');
    });
    expect(onBack).not.toHaveBeenCalled();
  });

  it('saves basic info directly when emergency phone is unchanged and keeps edited fields', async () => {
    updateBasicInfo.mockResolvedValue({});
    const onBack = vi.fn();

    render(<BasicInfoFormPage elder={elder} onBack={onBack} />);

    fireEvent.change(screen.getByDisplayValue('李奶奶'), { target: { value: '李阿姨' } });
    fireEvent.change(screen.getByDisplayValue('78'), { target: { value: '79' } });
    fireEvent.change(screen.getByDisplayValue('重庆'), { target: { value: '成都' } });
    fireEvent.change(screen.getByDisplayValue('家属甲'), { target: { value: '家属乙' } });
    fireEvent.change(screen.getByDisplayValue('女儿'), { target: { value: '儿子' } });
    fireEvent.change(screen.getByDisplayValue('A'), { target: { value: 'AB' } });
    fireEvent.change(screen.getByDisplayValue('Rh+'), { target: { value: 'Rh-' } });
    fireEvent.change(screen.getByDisplayValue('无'), { target: { value: '青霉素过敏' } });
    fireEvent.click(screen.getByRole('button', { name: '女' }));
    fireEvent.click(screen.getByRole('button', { name: '提交保存' }));

    await waitFor(() => {
      expect(sendSmsVerify).not.toHaveBeenCalled();
      expect(verifySmsCode).not.toHaveBeenCalled();
      expect(updateBasicInfo).toHaveBeenCalledWith(
        'elder-1',
        expect.objectContaining({
          name: '李阿姨',
          gender: '女',
          age: '79',
          residence: '成都',
          emergencyContactName: '家属乙',
          emergencyContactPhone: '13800000000',
          emergencyContactRelation: '儿子',
          aboBloodType: 'AB',
          rhBloodType: 'Rh-',
          allergyHistory: '青霉素过敏',
        }),
      );
      expect(onBack).toHaveBeenCalledTimes(1);
    });
  });

  it('computes bmi and saves health record', async () => {
    saveHealthRecord.mockResolvedValue({});
    const onBack = vi.fn();

    render(<HealthRecordFormPage elder={elder} onBack={onBack} />);

    const numberInputs = screen.getAllByRole('spinbutton');
    fireEvent.change(numberInputs[0], { target: { value: '160' } });
    fireEvent.change(numberInputs[1], { target: { value: '60' } });
    fireEvent.change(numberInputs[2], { target: { value: '85' } });
    expect(screen.getByDisplayValue('23.4')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '很好' }));
    fireEvent.click(screen.getByRole('button', { name: '完全自理' }));
    fireEvent.click(screen.getByRole('button', { name: '正常' }));
    fireEvent.click(screen.getByRole('button', { name: '无明显异常' }));
    fireEvent.click(screen.getByRole('button', { name: '提交保存' }));

    await waitFor(() => {
      expect(saveHealthRecord).toHaveBeenCalledWith(
        'elder-1',
        expect.objectContaining({
          heightCm: '160',
          weightKg: '60',
          waistCm: '85',
        }),
      );
      expect(onBack).toHaveBeenCalledTimes(1);
    });
  });

  it('saves medications through shared editor', async () => {
    saveMedications.mockResolvedValue({});
    const onBack = vi.fn();

    render(<MedicationFormPage elder={elder} onBack={onBack} />);
    fireEvent.click(screen.getByRole('button', { name: 'save-batch' }));

    await waitFor(() => {
      expect(saveMedications).toHaveBeenCalledWith('elder-1', [
        { id: 'm1', name: '药物', dosage: '1片', usage: '口服', timing: '每日一次' },
      ]);
      expect(onBack).toHaveBeenCalledTimes(1);
    });
  });

  it('loads scales, toggles edit mode and submits active scale', async () => {
    fetchScaleRecords.mockResolvedValue([
      { scale: 'PHQ-9', date: '2026-05-01', score: 6, volunteer: '志愿者甲', answers: [] },
    ]);
    submitScaleRecord.mockResolvedValue({});
    const onBack = vi.fn();

    render(<ScaleFormPage elder={elder} onBack={onBack} />);

    expect(await screen.findByText(/最近保存：2026-05-01/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '编辑量表' }));
    fireEvent.click(screen.getAllByRole('button', { name: '从不(0分)' })[0]);
    fireEvent.click(screen.getByRole('button', { name: '提交保存' }));

    await waitFor(() => {
      expect(submitScaleRecord).toHaveBeenCalledWith(
        'elder-1',
        expect.objectContaining({
          type: 'PHQ-9',
        }),
      );
    });

    fireEvent.click(screen.getByRole('button', { name: '返回' }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it('loads qr code info and handles copy/regenerate/disable', async () => {
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
    Object.defineProperty(window, 'isSecureContext', { value: true, configurable: true });
    qrToDataUrl.mockResolvedValue('data:image/png;base64,qr');
    fetchVolunteerElderQrCode.mockResolvedValue({
      id: '1',
      qrId: 'qr-1',
      elderId: 'elder-1',
      archiveNo: 'A-001',
      elderName: '李奶奶',
      elderAge: 78,
      elderPhone: '13800000000',
      status: '启用',
      createdAt: '2026-05-01T00:00:00Z',
      token: 'token-1',
      url: 'https://example.com/qr',
    });
    regenerateVolunteerElderQrCode.mockResolvedValue({
      id: '1',
      qrId: 'qr-1',
      elderId: 'elder-1',
      archiveNo: 'A-001',
      elderName: '李奶奶',
      elderAge: 78,
      elderPhone: '13800000000',
      status: '已重新生成',
      createdAt: '2026-05-02T00:00:00Z',
      token: 'token-2',
      url: 'https://example.com/new-qr',
    });
    disableVolunteerElderQrCode.mockResolvedValue({
      id: '1',
      qrId: 'qr-1',
      elderId: 'elder-1',
      archiveNo: 'A-001',
      elderName: '李奶奶',
      elderAge: 78,
      elderPhone: '13800000000',
      status: '已停用',
      createdAt: '2026-05-02T00:00:00Z',
      token: 'token-2',
      url: 'https://example.com/new-qr',
      reviewMessage: '停用申请已提交',
    });

    render(<QrCodeManagePage elder={elder} onBack={vi.fn()} />);

    expect(await screen.findByText('李奶奶 的二维码')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '复制访问链接' }));
    await waitFor(() => expect(navigator.clipboard.writeText).toHaveBeenCalledWith('https://example.com/qr'));

    fireEvent.click(screen.getByRole('button', { name: '重新生成' }));
    await waitFor(() => expect(regenerateVolunteerElderQrCode).toHaveBeenCalledWith('elder-1'));

    fireEvent.click(screen.getByRole('button', { name: '停用二维码' }));
    await waitFor(() => {
      expect(disableVolunteerElderQrCode).toHaveBeenCalledWith('elder-1');
      expect(screen.getByText('停用申请已提交')).toBeInTheDocument();
    });
  });

  it('handles qr code fetch failure', async () => {
    fetchVolunteerElderQrCode.mockRejectedValue(new Error('加载失败'));

    render(<QrCodeManagePage elder={elder} onBack={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText('加载失败')).toBeInTheDocument();
    });
  });

  it('handles qr code fetch returning null', async () => {
    fetchVolunteerElderQrCode.mockResolvedValue(null);
    qrToDataUrl.mockResolvedValue('');

    render(<QrCodeManagePage elder={elder} onBack={vi.fn()} />);

    await waitFor(() => {
      expect(fetchVolunteerElderQrCode).toHaveBeenCalledWith('elder-1');
    });
  });

  it('covers qr copy fallback, pending disable state and non-Error action failures', async () => {
    const onBack = vi.fn();
    const originalClipboard = navigator.clipboard;
    const originalSecureContext = window.isSecureContext;
    const execCommand = vi.fn().mockReturnValue(false);
    Object.defineProperty(window, 'isSecureContext', {
      configurable: true,
      value: false,
    });
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: undefined,
    });
    Object.defineProperty(document, 'execCommand', {
      configurable: true,
      value: execCommand,
    });

    fetchVolunteerElderQrCode.mockResolvedValue({
      id: '2',
      qrId: 'qr-2',
      elderId: 'elder-1',
      archiveNo: 'A-001',
      elderName: '李奶奶',
      elderAge: 78,
      elderPhone: '13800000000',
      status: '启用',
      createdAt: '',
      token: 'token-2',
      url: 'https://example.com/pending-qr',
      disableReviewStatus: 'PENDING',
    });
    regenerateVolunteerElderQrCode.mockRejectedValueOnce('regenerate-failed');
    disableVolunteerElderQrCode.mockRejectedValueOnce('disable-failed');

    render(<QrCodeManagePage elder={elder} onBack={onBack} />);

    expect(await screen.findByText('李奶奶 的二维码')).toBeInTheDocument();
    expect(screen.getByText(/生成时间 未记录/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '审核中' })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: '复制访问链接' }));
    await waitFor(() => {
      expect(execCommand).toHaveBeenCalledWith('copy');
      expect(screen.getByText('当前环境暂不支持自动复制，请手动长按二维码或链接复制。')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: '重新生成' }));
    expect(await screen.findByText('重新生成失败')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '返回' }));
    expect(onBack).toHaveBeenCalledTimes(1);

    Object.defineProperty(window, 'isSecureContext', {
      configurable: true,
      value: originalSecureContext,
    });
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: originalClipboard,
    });
  });

  it('sends sms verify with updated phone', async () => {
    sendSmsVerify.mockResolvedValue({});

    render(<BasicInfoFormPage elder={elder} onBack={vi.fn()} />);

    fireEvent.change(screen.getByDisplayValue('13800000000'), { target: { value: '13911112222' } });
    fireEvent.click(screen.getByRole('button', { name: '获取验证码' }));

    await waitFor(() => {
      expect(sendSmsVerify).toHaveBeenCalledWith('13911112222');
    });
  });

  it('handles basic info verify code failure', async () => {
    sendSmsVerify.mockResolvedValue({});
    verifySmsCode.mockResolvedValue({ ok: false });
    const alertMock = vi.fn();
    vi.stubGlobal('alert', alertMock);

    render(<BasicInfoFormPage elder={elder} onBack={vi.fn()} />);

    fireEvent.change(screen.getByDisplayValue('13800000000'), { target: { value: '13911112222' } });
    fireEvent.click(screen.getByRole('button', { name: '获取验证码' }));
    await waitFor(() => expect(sendSmsVerify).toHaveBeenCalled());

    fireEvent.change(screen.getByPlaceholderText('请输入短信验证码'), { target: { value: '000000' } });
    fireEvent.click(screen.getByRole('button', { name: '提交保存' }));

    await waitFor(() => {
      expect(alertMock).toHaveBeenCalledWith('验证码错误');
    });
  });

  it('handles basic info save failure', async () => {
    sendSmsVerify.mockResolvedValue({});
    verifySmsCode.mockResolvedValue({ ok: true });
    updateBasicInfo.mockRejectedValue(new Error('save failed'));
    const alertMock = vi.fn();
    vi.stubGlobal('alert', alertMock);

    render(<BasicInfoFormPage elder={elder} onBack={vi.fn()} />);

    fireEvent.change(screen.getByDisplayValue('13800000000'), { target: { value: '13911112222' } });
    fireEvent.click(screen.getByRole('button', { name: '获取验证码' }));
    await waitFor(() => expect(sendSmsVerify).toHaveBeenCalled());

    fireEvent.change(screen.getByPlaceholderText('请输入短信验证码'), { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: '提交保存' }));

    await waitFor(() => {
      expect(updateBasicInfo).toHaveBeenCalled();
      expect(alertMock).toHaveBeenCalledWith('保存失败，请重试');
    });
  });

  it('submits health record with all fields filled', async () => {
    saveHealthRecord.mockResolvedValue(undefined);

    render(<HealthRecordFormPage elder={elder} onBack={vi.fn()} />);

    const numberInputs = screen.getAllByRole('spinbutton');
    fireEvent.change(numberInputs[0], { target: { value: '160' } });
    fireEvent.change(numberInputs[1], { target: { value: '60' } });
    fireEvent.change(numberInputs[2], { target: { value: '85' } });
    fireEvent.click(screen.getByRole('button', { name: '很好' }));
    fireEvent.click(screen.getByRole('button', { name: '完全自理' }));
    fireEvent.click(screen.getByRole('button', { name: '正常' }));
    fireEvent.click(screen.getByRole('button', { name: '无明显异常' }));
    fireEvent.click(screen.getByRole('button', { name: '提交保存' }));

    await waitFor(() => {
      expect(saveHealthRecord).toHaveBeenCalled();
    });
  });

  it('handles medication save with empty list', async () => {
    saveMedications.mockResolvedValue(undefined);

    render(<MedicationFormPage elder={elder} onBack={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'save-batch' }));

    await waitFor(() => {
      expect(saveMedications).toHaveBeenCalled();
    });
  });

  it('submits scale with all answers selected', async () => {
    fetchScaleRecords.mockResolvedValue([]);
    submitScaleRecord.mockResolvedValue(undefined);

    render(<ScaleFormPage elder={elder} onBack={vi.fn()} />);

    await screen.findByText('开始填写');
    fireEvent.click(screen.getByRole('button', { name: '开始填写' }));
    fireEvent.click(screen.getAllByRole('button', { name: '从不(0分)' })[0]);
    fireEvent.click(screen.getByRole('button', { name: '提交保存' }));

    await waitFor(() => {
      expect(submitScaleRecord).toHaveBeenCalled();
    });
  });

  it('shows scale load failure, supports tab switching and reports submit failure', async () => {
    fetchScaleRecords
      .mockRejectedValueOnce(new Error('加载量表失败'))
      .mockResolvedValueOnce([
        { scale: 'GAD-7', date: '2026-05-01', score: 8, volunteer: '志愿者甲', answers: [] },
      ]);
    submitScaleRecord.mockRejectedValueOnce(new Error('提交失败'));

    const { rerender } = render(<ScaleFormPage elder={elder} onBack={vi.fn()} />);

    expect(await screen.findByText('加载量表失败')).toBeInTheDocument();

    rerender(<ScaleFormPage elder={{ ...elder, id: 'elder-2' }} onBack={vi.fn()} />);
    fireEvent.click(await screen.findByRole('button', { name: 'GAD-7' }));
    expect(await screen.findByText(/当前已保存历史总分，但旧记录未保留逐题答案/)).toBeInTheDocument();
    expect(screen.getByText('当前量表：GAD-7')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '编辑量表' }));
    fireEvent.click(screen.getAllByRole('button', { name: '完全不会(0分)' })[0]);
    fireEvent.click(screen.getByRole('button', { name: '提交保存' }));

    await waitFor(() => {
      expect(submitScaleRecord).toHaveBeenCalledWith(
        'elder-2',
        expect.objectContaining({ type: 'GAD-7' }),
      );
      expect(window.alert).toHaveBeenCalledWith('提交失败，请重试');
    });
  });
});
