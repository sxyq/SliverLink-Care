import { LockKeyhole } from 'lucide-react';
import { StatusTag } from '../components/StatusTag';
import type { SecurityModule } from '../types';

const securityModules: SecurityModule[] = [
  { key: 'https', name: 'HTTPS', status: '已启用', description: '正式环境按全站 HTTPS 规划，二维码域名切换证书后使用 https 访问。' },
  { key: 'jwt', name: 'JWT 短时 Token', status: '已启用', description: '后台、志愿者、家属账号均使用 Bearer Token 访问受保护接口。' },
  { key: 'sms', name: '短信二次验证', status: '未配置', description: '短信接口已接入服务商适配器；未配置凭证时明确返回失败，不再伪造发送成功。' },
  { key: 'aes', name: 'AES-256-GCM', status: '已启用', description: '姓名、电话、联系人、健康档案、用药和量表等敏感字段加密入库。' },
  { key: 'rbac', name: 'RBAC + 数据范围', status: '已启用', description: '志愿者只能管理分配老人，家属只能管理绑定老人，后台按角色开放菜单。' },
  { key: 'log', name: '操作日志', status: '已启用', description: '登录、扫码、短信、档案查看和关键管理操作写入审计日志。' },
  { key: 'sign', name: '接口签名', status: '已配置', description: '关键接口预留签名拦截器，用于时间戳、随机数和签名校验。' },
  { key: 'ip', name: 'IP 白名单', status: '已配置', description: '后台管理入口按部署环境保留 IP 白名单能力。' },
];

export function SecuritySettingsPage() {
  return (
    <>
      <header className="topbar">
        <div>
          <p className="eyebrow">安全与隐私</p>
          <h2>安全策略</h2>
        </div>
        <LockKeyhole color="#115f72" />
      </header>

      <section className="security-grid" style={{ marginTop: 14 }}>
        {securityModules.map((mod) => (
          <article className="security-card" key={mod.key}>
            <div className="security-header">
              <span className="security-name">{mod.name}</span>
              <StatusTag status={mod.status} />
            </div>
            <p className="security-desc">{mod.description}</p>
          </article>
        ))}
      </section>
    </>
  );
}
