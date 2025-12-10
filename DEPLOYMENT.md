# Linux 部署指南

本指南提供了多种在 Linux 服务器上部署 xhsnote 项目的方法。

## 方法 1: Docker 部署（推荐）

### 前提条件
- 安装 Docker 和 Docker Compose
- 服务器端口 80 可用

### 部署步骤

1. **构建并运行容器**
   ```bash
   # 给脚本执行权限
   chmod +x deploy.sh

   # 执行部署
   ./deploy.sh
   ```

2. **手动 Docker 部署**
   ```bash
   # 构建镜像
   docker build -t xhsnote:latest .

   # 运行容器
   docker run -d \
     --name xhsnote \
     -p 80:80 \
     --restart unless-stopped \
     xhsnote:latest
   ```

3. **使用 Docker Compose（可选）**
   ```yaml
   # docker-compose.yml
   version: '3'
   services:
     xhsnote:
       build: .
       ports:
         - "80:80"
       restart: unless-stopped
   ```

### 常用 Docker 命令
- 查看日志：`docker logs xhsnote`
- 进入容器：`docker exec -it xhsnote sh`
- 停止容器：`docker stop xhsnote`
- 更新部署：`./deploy.sh`

## 方法 2: 传统 Nginx 部署

### 前提条件
- Ubuntu/Debian 系统
- sudo 权限

### 一键部署
```bash
# 下载并运行部署脚本
sudo bash deploy-linux.sh
```

### 手动部署步骤

1. **安装依赖**
   ```bash
   sudo apt-get update
   sudo apt-get install -y nginx nodejs npm git
   ```

2. **克隆代码**
   ```bash
   cd /var/www
   sudo git clone https://github.com/yourusername/xhsnote.git
   sudo chown -R $USER:$USER xhsnote
   cd xhsnote
   ```

3. **构建项目**
   ```bash
   npm install
   npm run build
   ```

4. **配置 Nginx**
   ```bash
   sudo nano /etc/nginx/sites-available/xhsnote
   ```

   粘贴 nginx.conf 中的配置，并修改：
   - `server_name` 为你的域名
   - `root` 为 `/var/www/xhsnote/dist`

5. **启用站点**
   ```bash
   sudo ln -s /etc/nginx/sites-available/xhsnote /etc/nginx/sites-enabled/
   sudo rm /etc/nginx/sites-enabled/default
   sudo nginx -t
   sudo systemctl restart nginx
   ```

6. **配置 SSL（可选）**
   ```bash
   sudo apt-get install -y certbot python3-certbot-nginx
   sudo certbot --nginx -d your-domain.com
   ```

## 方法 3: CI/CD 自动部署

### 使用 GitHub Actions

1. **设置 Secrets**
   在 GitHub 仓库设置中添加以下 Secrets：
   - `HOST`: 服务器 IP
   - `USERNAME`: 服务器用户名
   - `SSH_KEY`: 服务器 SSH 私钥

2. **触发部署**
   - 推送到 main 分支自动触发
   - 或在 Actions 页面手动触发

## 监控和维护

### 查看应用状态
```bash
# Docker 方式
docker ps

# Nginx 方式
sudo systemctl status nginx
```

### 查看日志
```bash
# Docker 方式
docker logs -f xhsnote

# Nginx 方式
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### 更新应用
```bash
# Docker 方式
./deploy.sh

# 手动更新
cd /var/www/xhsnote
git pull
npm install
npm run build
sudo systemctl reload nginx
```

### 备份
```bash
# 备份应用目录
sudo tar -czf xhsnote-backup-$(date +%Y%m%d).tar.gz /var/www/xhsnote

# 备份 Nginx 配置
sudo cp /etc/nginx/sites-available/xhsnote ./nginx-backup.conf
```

## 性能优化建议

1. **启用 Gzip 压缩**（已包含在配置中）
2. **配置缓存策略**（已包含在配置中）
3. **使用 CDN**（如 CloudFlare）
4. **开启 HTTP/2**
   ```nginx
   listen 443 ssl http2;
   ```

## 故障排除

### 常见问题

1. **502 Bad Gateway**
   - 检查 Nginx 配置：`sudo nginx -t`
   - 查看错误日志：`sudo tail -f /var/log/nginx/error.log`

2. **权限问题**
   ```bash
   sudo chown -R www-data:www-data /var/www/xhsnote
   sudo chmod -R 755 /var/www/xhsnote
   ```

3. **端口占用**
   ```bash
   sudo netstat -tlnp | grep :80
   sudo lsof -i :80
   ```

## 安全建议

1. **定期更新系统**
   ```bash
   sudo apt-get update && sudo apt-get upgrade
   ```

2. **配置防火墙**
   ```bash
   sudo ufw enable
   sudo ufw allow ssh
   sudo ufw allow 80
   sudo ufw allow 443
   ```

3. **限制 SSH 访问**
   - 使用密钥认证
   - 禁用密码登录
   - 修改默认 SSH 端口

## 联系支持

如果遇到问题，请：
1. 查看日志文件
2. 检查配置文件
3. 提交 Issue 到 GitHub 仓库