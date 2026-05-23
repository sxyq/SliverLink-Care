export function StatusTag({ status }: { status: string }) {
  let cls = 'status-tag';
  if (status === '启用' || status === '成功' || status === '已启用' || status === '已配置') {
    cls += ' status-tag--success';
  } else if (status === '失败' || status === '异常访问') {
    cls += ' status-tag--danger';
  } else if (status === '已停用' || status === '未配置') {
    cls += ' status-tag--disabled';
  } else if (status === '已重新生成' || status === '待关注') {
    cls += ' status-tag--warning';
  } else {
    cls += ' status-tag--disabled';
  }
  return <span className={cls}>{status}</span>;
}
