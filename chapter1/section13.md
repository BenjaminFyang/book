# Docker学习常用命令汇总

> 主要是总结日常开发中常用的docker的命令

## Docker介绍

- Docker 是一个开源的应用容器引擎。

- Docker 可以让开发者打包他们的应用以及依赖包到一个轻量级、可移植的容器中，然后发布到任何流行的Linux 机器上，也可以实现虚拟化。

- 容器是完全使用沙箱机制（类似iPhone的app）,更重要的是容器性能开销极低.

- 容器共享机器的操作系统内核，因此每个应用程序不需要操作系统，从而提高服务器效率并降低服务器和许可成本, 提供业界最强的默认隔离能力.

![docker图](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/9906763bbb324f4eb261e9dbfe03a5ea~tplv-k3u1fbpfcp-zoom-1.image)

### Docker组织架构图

![docker图](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/0b48679206af4aa6b4c4cb5143438eec~tplv-k3u1fbpfcp-zoom-1.image)

## Docker的安装

### mac版本安装

- 通过官网 <https://www.docker.com/get-started>选择对应的版本进行安装

### Linux环境安装

- 安装yum-utils
  
```bash
 yum install -y yum-utils device-mapper-persistent-data lvm2
```

- 为yum源添加docker仓库位置

```bash
 yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
```

- 安装docker服务

```bash
 yum install docker-ce
```

- 启动docker服务

```bash
 systemctl start docker
```

## Docker镜像常用命令

### 搜索镜像 docker search

```bash
 ➜  dockerImages docker search nginx
NAME                               DESCRIPTION                                     STARS     OFFICIAL   AUTOMATED
nginx                              Official build of Nginx.                        14999     [OK]       
jwilder/nginx-proxy                Automated Nginx reverse proxy for docker con…   2033                 [OK]
richarvey/nginx-php-fpm            Container running Nginx + PHP-FPM capable of…   814                  [OK]
```

### 下载镜像 docker pull

### 查看镜像的历史版本 <https://hub.docker.com/>

> docker search命令只能查找出是否有该镜像，不能找到该镜像支持的版本.需要进入docker官网进行查看（<https://hub.docker.com/>）

![docker](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/891fbc7d9f334f7ba495921457501b9f~tplv-k3u1fbpfcp-zoom-1.image)

### 查看镜像的历史版本

![docker](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/9748b870610a4ef6ba171e2d35f60b4e~tplv-k3u1fbpfcp-zoom-1.image)

### 进行镜像的下载操作

```bash
docker pull mysql:8.0.25
```

### 列出镜像  docker images

```bash
➜  dockerImages docker images
REPOSITORY            TAG         IMAGE ID       CREATED         SIZE
redis                 5           59fbd83692ee   4 weeks ago     98.4MB
mysql                 5.7         2c9028880e58   4 weeks ago     447MB
mongo                 4.2.5       fddee5bccba3   14 months ago   388MB
logstash              7.6.2       fa5b3b1e9757   14 months ago   813MB
kibana                7.6.2       f70986bc5191   14 months ago   1.01GB
elasticsearch         7.6.2       f29a1ee41030   14 months ago   791MB
```

### 删除镜像 docker rmi

- 指定名称删除镜像

```bash
docker rmi mysql:5.7
```

- 指定名称删除镜像（强制)

```bash
docker rmi -f mysql:5.7
```

- 删除所有没有引用的镜像

```bash
docker rmi `docker images | grep none | awk '{print $3}'`
```

- 强制删除所有镜像

```bash
docker rmi -f $(docker images)
```

### 打包镜像 docker build -t

```bash
# -t 表示指定镜像仓库名称/镜像名称:镜像标签 .表示使用当前目录下的Dockerfile文件
docker build -t mall/mall:1.1.0-SNAPSHOT .
```

### 推送镜像

```bash
# 登录Docker Hub
docker login
# 给本地镜像打标签为远程仓库名称
docker tag mall/mall:1.1.0-SNAPSHOT fy/mall:1.1.0-SNAPSHOT
# 推送到远程仓库
docker push fy/mall:1.1.0-SNAPSHOT
```

## Docker容器常用命令

### 新建并启动容器

```bash
docker run -p 80:80 --name nginx \
-e TZ="Asia/Shanghai" \
-v /mydata/nginx/html:/usr/share/nginx/html \
-d nginx:1.10
```

- -p: 将宿主机和容器端口进行映射，格式为：宿主机端口:容器端口；
- --name: 指定容器名称，之后可以通过容器名称来操作容器
- -e: 设置容器的环境变量，这里设置的是时区；
- -v: 将宿主机上的文件挂载容器上，格式为：宿主机文件目录:容器文件目录
- -d: 表示容器以后台方式运行

### 列出容器

### 展示运行中的容器 docker ps

```bash
➜  dockerImages docker ps
CONTAINER ID   IMAGE                 COMMAND                  CREATED        STATUS       PORTS                                                                                  NAMES
e8be56dcb1f7   logstash:7.6.2        "/usr/local/bin/dock…"   2 hours ago    Up 2 hours   5044/tcp, 0.0.0.0:4560-4563->4560-4563/tcp, :::4560-4563->4560-4563/tcp, 9600/tcp      logstash
72123ac57300   kibana:7.6.2          "/usr/local/bin/dumb…"   2 hours ago    Up 2 hours   0.0.0.0:5601->5601/tcp, :::5601->5601/tcp                                              kibana
375c89abf1ee   elasticsearch:7.6.2   "/usr/local/bin/dock…"   2 hours ago    Up 2 hours   0.0.0.0:9200->9200/tcp, :::9200->9200/tcp, 0.0.0.0:9300->9300/tcp, :::9300->9300/tcp   elasticsearch
2b73a2694943   mysql:5.7             "docker-entrypoint.s…"   20 hours ago   Up 6 hours   0.0.0.0:3306->3306/tcp, :::3306->3306/tcp, 33060/tcp                                   mysql
```

### 展示所有的容器 docker ps -a

```bash
➜  dockerImages docker ps -a
CONTAINER ID   IMAGE                 COMMAND                  CREATED        STATUS        PORTS                                                                                  NAMES
e8be56dcb1f7   logstash:7.6.2        "/usr/local/bin/dock…"   2 hours ago    Up 2 hours    5044/tcp, 0.0.0.0:4560-4563->4560-4563/tcp, :::4560-4563->4560-4563/tcp, 9600/tcp      logstash
72123ac57300   kibana:7.6.2          "/usr/local/bin/dumb…"   2 hours ago    Up 2 hours    0.0.0.0:5601->5601/tcp, :::5601->5601/tcp                                              kibana
375c89abf1ee   elasticsearch:7.6.2   "/usr/local/bin/dock…"   2 hours ago    Up 2 hours    0.0.0.0:9200->9200/tcp, :::9200->9200/tcp, 0.0.0.0:9300->9300/tcp, :::9300->9300/tcp   elasticsearch
029b5496bb2b   nginx:1.10            "nginx -g 'daemon of…"   5 hours ago    Created       80/tcp, 443/tcp                                                                        nginx
2b73a2694943   mysql:5.7             "docker-entrypoint.s…"   20 hours ago   Up 6 hours    0.0.0.0:3306->3306/tcp, :::3306->3306/tcp, 33060/tcp                                   mysql
```

### 停止容器 docker stop

```bash
## 容器名称
docker stop mysql
#或者容器id
docker stop 2b73a2694943
```

### 强制停止容器 docker kill

```bash
## 容器名称
docker kill mysql
```

### 启动容器 docker start

```bash
## 容器名称
docker start mysql
```

### 进入容器 docker exec -it $ContainerName  /bin/bash

```bash
docker exec -it mysql /bin/bash
```

### 删除容器 docker rm

- 删除指定容器：

```bash
docker rm $ContainerName
```

- 强制删除所有容器；

```bash
docker rm -f $(docker ps -a -q)
```

### 查看容器的日志

- 查看容器产生的全部日志

```bash
docker rm $ContainerName

➜  dockerImages docker logs elasticsearch
OpenJDK 64-Bit Server VM warning: Option UseConcMarkSweepGC was deprecated in version 9.0 and will likely be removed in a future release.
{"type": "server", "timestamp": "2021-06-12T15:15:29,435+08:00", "level": "INFO", "component": "o.e.e.NodeEnvironment", "cluster.name": "elasticsearch", "node.name": "375c89abf1ee", "message": "using [1] data paths, mounts [[/usr/share/elasticsearch/data (grpcfuse)]], net usable_space [373.2gb], net total_space [465.6gb], types [fuse.grpcfuse]" }
{"type": "server", "timestamp": "2021-06-12T15:15:29,438+08:00", "level": "INFO", "component": "o.e.e.NodeEnvironment", "cluster.name": "elasticsearch", "node.name": "375c89abf1ee", "message": "heap size [494.9mb], compressed ordinary object pointers [true]" }
```

- 动态查看容器产生的日志

```bash
docker logs -f $ContainerName
```

### 同步宿主机时间到容器

```bash
docker cp /etc/localtime $ContainerName:/etc/
```

### 指定容器时区

```bash
docker run -p 80:80 --name nginx \
-e TZ="Asia/Shanghai" \
-d nginx:1.10
```

### 查看容器资源占用情况 docker status

- 查看指定容器资源占用状况，比如cpu、内存、网络、io状态

```bash
docker stats $ContainerName

➜  dockerImages docker stats elasticsearch
CONTAINER ID   NAME            CPU %     MEM USAGE / LIMIT     MEM %     NET I/O          BLOCK I/O        PIDS
375c89abf1ee   elasticsearch   1.21%     939.5MiB / 9.732GiB   9.43%     19.1MB / 7.4MB   45.1kB / 246kB   95
```

- 查看所有容器资源占用情况

```bash
docker stats -a

➜  dockerImages docker stats -a
CONTAINER ID   NAME            CPU %     MEM USAGE / LIMIT     MEM %     NET I/O           BLOCK I/O         PIDS
e8be56dcb1f7   logstash        4.85%     852.9MiB / 9.732GiB   8.56%     856kB / 7.24MB    12.3kB / 418kB    93
72123ac57300   kibana          0.48%     409.3MiB / 9.732GiB   4.11%     7.17MB / 12.3MB   58.4MB / 4.1kB    12
375c89abf1ee   elasticsearch   1.55%     939.6MiB / 9.732GiB   9.43%     19.3MB / 7.44MB   45.1kB / 246kB    95
029b5496bb2b   nginx           0.00%     0B / 0B               0.00%     0B / 0B           0B / 0B           0
2b73a2694943   mysql           0.21%     201MiB / 9.732GiB     2.02%     19.1kB / 0B       31.9MB / 8.19kB   27
2bb6eacfc945   redis           0.00%     0B / 0B               0.00%     0B / 0B           0B / 0B           0
```

### 查看容器磁盘使用情况 docker system df

```bash
➜  dockerImages docker system df
TYPE            TOTAL     ACTIVE    SIZE      RECLAIMABLE
Images          11        6         4.431GB   1.84GB (41%)
Containers      6         4         137.3MB   11B (0%)
Local Volumes   6         0         175.4MB   175.4MB (100%)
Build Cache     0         0         0B        0B
```

### 指定账号进入容器内部

```bash
# 使用root账号进入容器内部
docker exec -it --user root $ContainerName /bin/bash
```

## Docker容器清理

### 删除所有关闭的容器

```bash
# 使用root账号进入容器内部
docker ps -a | grep Exit | cut -d ' ' -f 1 | xargs docker rm
```
