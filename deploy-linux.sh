#!/bin/bash

# Linux 服务器部署脚本
# 适用于 Ubuntu/Debian 系统

set -e

# 配置
APP_NAME="xhsnote"
DEPLOY_DIR="/var/www/$APP_NAME"
NGINX_SITE="/etc/nginx/sites-available/$APP_NAME"
SERVICE_NAME="node-$APP_NAME"

echo "======================================"
echo "  $APP_NAME Linux 部署脚本"
echo "======================================"

# 检查是否为 root 用户
if [ "$EUID" -ne 0 ]; then
    echo "请使用 sudo 运行此脚本"
    exit 1
fi

# 1. 更新系统
echo "更新系统包..."
apt-get update -y

# 2. 安装必要软件
echo "安装必要软件..."
apt-get install -y nginx nodejs npm git

# 3. 创建部署目录
echo "创建部署目录..."
mkdir -p $DEPLOY_DIR
chown -R $USER:$USER $DEPLOY_DIR

# 4. 克隆或更新代码
if [ -d "$DEPLOY_DIR/.git" ]; then
    echo "更新代码..."
    cd $DEPLOY_DIR
    git pull origin main
else
    echo "克隆代码..."
    git clone https://github.com/yourusername/xhsnote.git $DEPLOY_DIR
    cd $DEPLOY_DIR
fi

# 5. 安装依赖并构建
echo "安装依赖..."
npm ci --only=production

echo "构建应用..."
npm run build

# 6. 配置 Nginx
echo "配置 Nginx..."
cat > $NGINX_SITE << EOF
server {
    listen 80;
    server_name your-domain.com;  # 替换为你的域名

    root $DEPLOY_DIR/dist;
    index index.html;

    # Gzip 压缩
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    # 静态资源缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # SPA 路由支持
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # 安全头
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
}
EOF

# 启用站点
ln -sf $NGINX_SITE /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# 7. 配置 SSL（使用 Let's Encrypt）
read -p "是否配置 SSL (y/n)? " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    apt-get install -y certbot python3-certbot-nginx
    certbot --nginx -d your-domain.com  # 替换为你的域名
fi

# 8. 设置自动更新
echo "设置自动更新脚本..."
cat > /usr/local/bin/update-$APP_NAME.sh << EOF
#!/bin/bash
cd $DEPLOY_DIR
git pull origin main
npm ci --only=production
npm run build
systemctl reload nginx
EOF

chmod +x /usr/local/bin/update-$APP_NAME.sh

# 9. 添加定时任务（可选）
read -p "是否添加每日自动更新 (y/n)? " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    (crontab -l 2>/dev/null; echo "0 3 * * * /usr/local/bin/update-$APP_NAME.sh") | crontab -
fi

# 10. 测试并重启 Nginx
echo "测试 Nginx 配置..."
nginx -t

echo "重启 Nginx..."
systemctl restart nginx
systemctl enable nginx

echo "======================================"
echo "部署完成！"
echo "======================================"
echo "应用目录: $DEPLOY_DIR"
echo "更新命令: /usr/local/bin/update-$APP_NAME.sh"
echo "Nginx 状态: systemctl status nginx"
echo "日志位置: tail -f /var/log/nginx/access.log"
echo "======================================"