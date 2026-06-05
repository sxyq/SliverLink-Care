import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ScaleDetailPage } from './ScaleDetailPage';
import type { ScaleSummary } from '../types';

const fetchScaleDetail = vi.fn();

vi.mock('../components/BottomTabBar', () => ({
  BottomTabBar: () => <div data-testid="bottom-tab" />,
}));

vi.mock('../api/scanApi', () => ({
  fetchScaleDetail: (...args: unknown[]) => fetchScaleDetail(...args),
}));

function makeItem(overrides: Partial<ScaleSummary> = {}): ScaleSummary {
  return {
    name: 'PHQ-9',
    score: 5,
    updatedAt: '2026-05-25',
    volunteer: '志愿者',
    ...overrides,
  };
}

function renderPage(data: ScaleSummary[] | null, scaleName = 'PHQ-9', loading = false, extraProps: Partial<ComponentProps<typeof ScaleDetailPage>> = {}) {
  return render(
    <MemoryRouter initialEntries={[`/scale/${scaleName}`]}>
      <Routes>
        <Route path="/scale/:scaleName" element={<ScaleDetailPage data={data} loading={loading} {...extraProps} />} />
        <Route path="/scale" element={<p>scale list</p>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('ScaleDetailPage', () => {
  beforeEach(() => {
    fetchScaleDetail.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('shows loading state', () => {
    renderPage(null, 'PHQ-9', true);
    expect(screen.getByText(/加载中/)).toBeInTheDocument();
  });

  it('shows not found when scale is missing', () => {
    renderPage([], 'PHQ-9');
    expect(screen.getByText(/未找到量表详情/)).toBeInTheDocument();
  });

  it('renders PHQ-9 with low score copy', () => {
    renderPage([makeItem({ name: 'PHQ-9', score: 3 })], 'PHQ-9');
    expect(screen.getByText('抑郁情绪筛查')).toBeInTheDocument();
    expect(screen.getByText(/当前分值处于较轻范围/)).toBeInTheDocument();
  });

  it('renders PHQ-9 with medium score copy', () => {
    renderPage([makeItem({ name: 'PHQ-9', score: 7 })], 'PHQ-9');
    expect(screen.getByText(/当前分值提示需持续关注/)).toBeInTheDocument();
  });

  it('renders PHQ-9 with high score copy', () => {
    renderPage([makeItem({ name: 'PHQ-9', score: 15 })], 'PHQ-9');
    expect(screen.getByText(/当前分值建议进一步随访/)).toBeInTheDocument();
  });

  it('renders GAD-7 with low score copy', () => {
    renderPage([makeItem({ name: 'GAD-7', score: 2 })], 'GAD-7');
    expect(screen.getByText('焦虑情绪筛查')).toBeInTheDocument();
    expect(screen.getByText(/当前分值处于较轻范围/)).toBeInTheDocument();
  });

  it('renders GAD-7 with medium score copy', () => {
    renderPage([makeItem({ name: 'GAD-7', score: 8 })], 'GAD-7');
    expect(screen.getByText(/当前分值提示需持续关注/)).toBeInTheDocument();
  });

  it('renders GAD-7 with high score copy', () => {
    renderPage([makeItem({ name: 'GAD-7', score: 12 })], 'GAD-7');
    expect(screen.getByText(/当前分值建议进一步随访/)).toBeInTheDocument();
  });

  it('renders UCLA with low score copy', () => {
    renderPage([makeItem({ name: 'UCLA', score: 15 })], 'UCLA');
    expect(screen.getByText('孤独感筛查')).toBeInTheDocument();
    expect(screen.getByText(/当前分值处于较轻范围/)).toBeInTheDocument();
  });

  it('renders UCLA with medium score copy', () => {
    renderPage([makeItem({ name: 'UCLA', score: 30 })], 'UCLA');
    expect(screen.getByText(/当前分值提示需持续关注/)).toBeInTheDocument();
  });

  it('renders UCLA with high score copy', () => {
    renderPage([makeItem({ name: 'UCLA', score: 50 })], 'UCLA');
    expect(screen.getByText(/当前分值建议进一步随访/)).toBeInTheDocument();
  });

  it('renders answers with PHQ-9 labels', () => {
    const item = makeItem({
      name: 'PHQ-9',
      score: 5,
      answers: [
        { question: '做事提不起劲', value: 0 },
        { question: '感到心情低落', value: 1 },
        { question: '睡眠困难', value: 2 },
        { question: '感觉疲倦', value: 3 },
      ],
    });
    renderPage([item], 'PHQ-9');
    expect(screen.getByText('从不')).toBeInTheDocument();
    expect(screen.getByText('几天')).toBeInTheDocument();
    expect(screen.getByText('一半以上')).toBeInTheDocument();
    expect(screen.getByText('几乎每天')).toBeInTheDocument();
  });

  it('renders answers with GAD-7 labels', () => {
    const item = makeItem({
      name: 'GAD-7',
      score: 5,
      answers: [
        { question: '感觉紧张', value: 0 },
        { question: '不能停止担忧', value: 1 },
        { question: '很难放松', value: 2 },
        { question: '容易烦躁', value: 3 },
      ],
    });
    renderPage([item], 'GAD-7');
    expect(screen.getByText('完全不会')).toBeInTheDocument();
    expect(screen.getByText('好几天')).toBeInTheDocument();
    expect(screen.getByText('超过一周')).toBeInTheDocument();
    expect(screen.getByText('几乎每天')).toBeInTheDocument();
  });

  it('renders answers with UCLA labels', () => {
    const item = makeItem({
      name: 'UCLA',
      score: 30,
      answers: [
        { question: '与周围人关系', value: 0 },
        { question: '缺少伙伴', value: 1 },
        { question: '没人信赖', value: 2 },
        { question: '一直寂寞', value: 3 },
      ],
    });
    renderPage([item], 'UCLA');
    expect(screen.getByText('从不')).toBeInTheDocument();
    expect(screen.getByText('很少')).toBeInTheDocument();
    expect(screen.getByText('有时')).toBeInTheDocument();
    expect(screen.getByText('一直')).toBeInTheDocument();
  });

  it('renders null answer value as 未填写', () => {
    const item = makeItem({
      name: 'PHQ-9',
      score: 5,
      answers: [{ question: '做事提不起劲', value: null }],
    });
    renderPage([item], 'PHQ-9');
    expect(screen.getByText('未填写')).toBeInTheDocument();
    expect(screen.getByText('未作答')).toBeInTheDocument();
  });

  it('renders out-of-range answer value as fallback', () => {
    const item = makeItem({
      name: 'PHQ-9',
      score: 5,
      answers: [{ question: '做事提不起劲', value: 5 }],
    });
    renderPage([item], 'PHQ-9');
    expect(screen.getByText('选项 5')).toBeInTheDocument();
  });

  it('shows empty answer placeholder when no answers', () => {
    const item = makeItem({ name: 'PHQ-9', score: 5, answers: [] });
    renderPage([item], 'PHQ-9');
    expect(screen.getByText(/暂无逐题记录/)).toBeInTheDocument();
    expect(screen.getByText(/当前数据源还未保存每题答案/)).toBeInTheDocument();
  });

  it('shows volunteer name or 暂无记录', () => {
    const item = makeItem({ name: 'PHQ-9', score: 5, volunteer: '' });
    renderPage([item], 'PHQ-9');
    expect(screen.getByText('暂无记录')).toBeInTheDocument();
  });

  it('renders numeric answer value with 分 suffix', () => {
    const item = makeItem({
      name: 'PHQ-9',
      score: 5,
      answers: [{ question: '做事提不起劲', value: 2 }],
    });
    renderPage([item], 'PHQ-9');
    expect(screen.getByText('2 分')).toBeInTheDocument();
  });

  it('loads scale detail lazily when list item has no answers and falls back to fetched detail', async () => {
    fetchScaleDetail.mockResolvedValue({
      name: 'PHQ-9',
      score: 6,
      updatedAt: '2026-05-25',
      volunteer: '新志愿者',
      answers: [{ question: '做事提不起劲', value: 1 }],
    });

    renderPage([makeItem({ answers: undefined })], 'PHQ-9', false, {
      sessionId: 'session-1',
      elderId: 'elder-1',
    });

    expect(screen.getByText('请稍候...')).toBeInTheDocument();

    await waitFor(() => {
      expect(fetchScaleDetail).toHaveBeenCalledWith('session-1', 'PHQ-9', 'elder-1');
      expect(screen.getByText('几天')).toBeInTheDocument();
      expect(screen.getByText('新志愿者')).toBeInTheDocument();
    });
  });

  it('falls back to placeholder when lazy detail loading fails', async () => {
    fetchScaleDetail.mockRejectedValue(new Error('load failed'));

    renderPage([makeItem({ answers: undefined })], 'PHQ-9', false, {
      sessionId: 'session-1',
      elderId: 'elder-1',
    });

    await waitFor(() => {
      expect(fetchScaleDetail).toHaveBeenCalled();
      expect(screen.getByText(/暂无逐题记录/)).toBeInTheDocument();
    });
  });

  it('returns to scale list when clicking the next card', () => {
    renderPage([makeItem()], 'PHQ-9');
    fireEvent.click(screen.getByRole('button', { name: /返回量表列表/ }));
    expect(screen.getByText('scale list')).toBeInTheDocument();
  });
});
