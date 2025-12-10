#!/bin/bash

# 部署脚本
set -e

# 配置变量
APP_NAME="xhsnote"
IMAGE_NAME="$APP_NAME:latest"
CONTAINER_NAME="$APP_NAME-container"
PORT=80

echo "开始部署 $APP_NAME..."

# 1. 停止并删除旧容器
if [ $(docker ps -aq -f name=$CONTAINER_NAME) ]; then
    echo "停止旧容器..."
    docker stop $CONTAINER_NAME || true
    echo "删除旧容器..."
    docker rm $CONTAINER_NAME || true
fi

# 2. 删除旧镜像
if [ $(docker images -q $IMAGE_NAME) ]; then
    echo "删除旧镜像..."
    docker rmi $IMAGE_NAME || true
fi

# 3. 构建新镜像
echo "构建新镜像..."
docker build -t $IMAGE_NAME .

# 4. 运行新容器
echo "启动新容器..."
docker run -d \
    --name $CONTAINER_NAME \
    -p $PORT:80 \
    --restart unless-stopped \
    $IMAGE_NAME

echo "部署完成！"
echo "应用已启动在 http://localhost:$PORT"

# 5. 查看容器状态
echo "容器状态："
docker ps -f name=$CONTAINER_NAME