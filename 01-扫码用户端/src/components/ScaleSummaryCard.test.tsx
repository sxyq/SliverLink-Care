import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { ScaleSummaryCard } from './ScaleSummaryCard';
import type { ScaleSummary } from '../types';

function makeItem(overrides: Partial<ScaleSummary> = {}): ScaleSummary {
  return {
    name: 'PHQ-9',
    score: 0,
    updatedAt: '2026-05-25',
    volunteer: '志愿者',
    ...overrides,
  };
}

describe('ScaleSummaryCard', () => {
  it('renders PHQ-9 normal range for score 0-4', () => {
    render(<ScaleSummaryCard items={[makeItem({ name: 'PHQ-9', score: 3 })]} />);
    expect(screen.getByText(/正常范围/)).toBeInTheDocument();
  });

  it('renders PHQ-9 轻度 for score 5-9', () => {
    render(<ScaleSummaryCard items={[makeItem({ name: 'PHQ-9', score: 7 })]} />);
    expect(screen.getByText(/轻度/)).toBeInTheDocument();
  });

  it('renders PHQ-9 中度 for score 10-14', () => {
    render(<ScaleSummaryCard items={[makeItem({ name: 'PHQ-9', score: 12 })]} />);
    expect(screen.getByText(/中度/)).toBeInTheDocument();
  });

  it('renders PHQ-9 中重度 for score 15-19', () => {
    render(<ScaleSummaryCard items={[makeItem({ name: 'PHQ-9', score: 17 })]} />);
    expect(screen.getByText(/中重度/)).toBeInTheDocument();
  });

  it('renders PHQ-9 重度 for score >= 20', () => {
    render(<ScaleSummaryCard items={[makeItem({ name: 'PHQ-9', score: 22 })]} />);
    expect(screen.getByText(/重度/)).toBeInTheDocument();
  });

  it('renders GAD-7 正常范围 for score 0-4', () => {
    render(<ScaleSummaryCard items={[makeItem({ name: 'GAD-7', score: 2 })]} />);
    expect(screen.getByText(/正常范围/)).toBeInTheDocument();
  });

  it('renders GAD-7 轻度 for score 5-9', () => {
    render(<ScaleSummaryCard items={[makeItem({ name: 'GAD-7', score: 6 })]} />);
    expect(screen.getByText(/轻度/)).toBeInTheDocument();
  });

  it('renders GAD-7 中度 for score 10-14', () => {
    render(<ScaleSummaryCard items={[makeItem({ name: 'GAD-7', score: 11 })]} />);
    expect(screen.getByText(/中度/)).toBeInTheDocument();
  });

  it('renders GAD-7 重度 for score >= 15', () => {
    render(<ScaleSummaryCard items={[makeItem({ name: 'GAD-7', score: 18 })]} />);
    expect(screen.getByText(/重度/)).toBeInTheDocument();
  });

  it('renders UCLA 正常范围 for score < 28', () => {
    render(<ScaleSummaryCard items={[makeItem({ name: 'UCLA', score: 20 })]} />);
    expect(screen.getByText(/正常范围/)).toBeInTheDocument();
  });

  it('renders UCLA 需关注 for score 28-43', () => {
    render(<ScaleSummaryCard items={[makeItem({ name: 'UCLA', score: 35 })]} />);
    expect(screen.getByText(/需关注/)).toBeInTheDocument();
  });

  it('renders UCLA 偏高 for score >= 44', () => {
    render(<ScaleSummaryCard items={[makeItem({ name: 'UCLA', score: 50 })]} />);
    expect(screen.getByText(/偏高/)).toBeInTheDocument();
  });

  it('uses item.level when provided', () => {
    render(<ScaleSummaryCard items={[makeItem({ name: 'PHQ-9', score: 3, level: '自定义等级' })]} />);
    expect(screen.getByText(/自定义等级/)).toBeInTheDocument();
  });

  it('renders multiple scale items', () => {
    render(<ScaleSummaryCard items={[
      makeItem({ name: 'PHQ-9', score: 5 }),
      makeItem({ name: 'GAD-7', score: 10 }),
    ]} />);
    expect(screen.getByText('PHQ-9')).toBeInTheDocument();
    expect(screen.getByText('GAD-7')).toBeInTheDocument();
  });

  it('expands and collapses detail on click', async () => {
    const user = userEvent.setup();
    render(<ScaleSummaryCard items={[makeItem({ name: 'PHQ-9', score: 5 })]} />);

    expect(screen.queryByText(/量表总分/)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button'));
    expect(screen.getByText(/量表总分/)).toBeInTheDocument();

    await user.click(screen.getByRole('button'));
    expect(screen.queryByText(/量表总分/)).not.toBeInTheDocument();
  });

  it('shows volunteer name or 未记录', async () => {
    const user = userEvent.setup();
    render(<ScaleSummaryCard items={[makeItem({ name: 'PHQ-9', score: 5, volunteer: '' })]} />);

    await user.click(screen.getByRole('button'));
    expect(screen.getByText('未记录')).toBeInTheDocument();
  });

  it('shows updatedAt or 未填写', () => {
    render(<ScaleSummaryCard items={[makeItem({ name: 'PHQ-9', score: 5, updatedAt: '' })]} />);
    expect(screen.getByText(/未填写/)).toBeInTheDocument();
  });
});
