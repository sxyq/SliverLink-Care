# SSH key 轮换记录

时间：2026-06-07 02:49-02:50 +08:00

## 轮换范围

| 服务器 | 账号 | 旧 key 指纹 | 新 key 指纹 | 新 key 本地路径 |
| --- | --- | --- | --- | --- |
| `124.222.153.108` | `root` | `SHA256:4CmV6vsHatZRc5AQ9nX0OOrYy8Y+JE70SQLIvMHc4dQ` | `SHA256:l8KPL1gVsyWyMYtJrDl8ARegARfTk/L7XmlnwvwurCM` | `/Users/sunyiyang/服务器密钥/rotated-20260607/sxyq27-124-root-20260607` |
| `124.222.153.108` | `ubuntu` | `SHA256:UpPsYtR6tu+9xJw83fOB1Arjc0Zuehom9yDMiRNaO4k` | `SHA256:pBcfVtKMWgIfkZg9l8XK6Vn3X5WCJvZQUuISuI08Tgk` | `/Users/sunyiyang/服务器密钥/rotated-20260607/sxyq27-124-ubuntu-20260607` |
| `117.72.79.106` | `root` | `SHA256:4CmV6vsHatZRc5AQ9nX0OOrYy8Y+JE70SQLIvMHc4dQ` | `SHA256:HryOxtwOT2yFe+rf7WNPKtYL9PxmtHuR4p6bhyibtNA` | `/Users/sunyiyang/服务器密钥/rotated-20260607/sxyq27-117-root-20260607` |

## 远端备份

| 服务器 | 账号 | 追加新 key 前备份 | 删除旧 key 前备份 |
| --- | --- | --- | --- |
| `124.222.153.108` | `root` | `/root/.ssh/authorized_keys.codex-rotation-20260607024955` | `/root/.ssh/authorized_keys.codex-remove-old-20260607025029` |
| `124.222.153.108` | `ubuntu` | `/home/ubuntu/.ssh/authorized_keys.codex-rotation-20260607024956` | `/home/ubuntu/.ssh/authorized_keys.codex-remove-old-20260607025054` |
| `117.72.79.106` | `root` | `/root/.ssh/authorized_keys.codex-rotation-20260607024957` | `/root/.ssh/authorized_keys.codex-remove-old-20260607025054` |

## 验证结果

- 新 key 登录均通过，并确认远端 `authorized_keys` 只剩对应新 key 指纹。
- 旧 key 登录均失败：
  - `root@124.222.153.108` + `/Users/sunyiyang/服务器密钥/id_rsa`: `Permission denied`
  - `ubuntu@124.222.153.108` + `/Users/sunyiyang/服务器密钥/123.pem`: `Permission denied`
  - `root@117.72.79.106` + `/Users/sunyiyang/服务器密钥/id_rsa`: `Permission denied`

## 注意

- 本记录不包含任何私钥内容。
- 本地旧私钥文件未删除，因为无法证明它们是否还被其他资产使用；但它们已无法登录本记录中的三个服务器账号。
