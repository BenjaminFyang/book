# ELK搭建日志收集系统
  
## 概述

> [!note]
>
> 利用docker容器化以后，需要考虑如何采集位于Docker容器中的应用程序的打印日志供运维分析。比如SpringBoot应用的日志收集。利用ELK日志中心来收集容器化应用程序所产生的日志，并且可以用可视化的方式对日志进行查询与分析，其架构如下图所示

### 架构图

![架构图](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/a237eda0f1c441eab58ad5040d278f11~tplv-k3u1fbpfcp-zoom-1.image)

## 环境搭建

### 基础环境依赖

| 组件          | 版本号 |
| ------------- | ------ |
| Mysql         | 5.7    |
| Elasticsearch | 7.6.2  |
| Logstash      | 7.6.2  |
| Kibana        | 7.6.2  |

## docker安装

> (不同的操作系统可以参考 <https://yeasy.gitbook.io/docker_practice/install>)

### 安装yum-utils（安装docker-ce所需依赖）

```bash
 yum install -y yum-utils device-mapper-persistent-data lvm2
```

### 为yum源添加docker仓库位置

```bash
yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo

yum.repos.d

# 仓库源存放的位置
cd /etc/yum.repos.d 

vim docker-ce.repo 
```

### 安装docker

> ⚠️注意 docker-ce与docker两个仓库版本有差异（本人爬坑比较多 docker不支持文件的挂载比较老的版本）

```bash
 yum install docker-ce

# 如果报错以下信息
errors during downloading metadata for repository 'base':
  - Curl error (28): Timeout was reached for http://mirrors.aliyuncs.com/centos/3/os/x86_64/repodata/repomd.xml [Connection timed out after 30001 milliseconds]
  - Status code: 404 for http://mirrors.cloud.aliyuncs.com/centos/3/os/x86_64/repodata/repomd.xml (IP: 100.100.2.148)
  - Status code: 404 for http://mirrors.aliyun.com/centos/3/os/x86_64/repodata/repomd.xml (IP: 39.96.118.193)
Error: Failed to download metadata for repo 'base': Cannot download repomd.xml: Cannot download repodata/repomd.xml: All mirrors were tried

# 将/etc/yum.repos.d/docker-ce.repo的地址进行修改
# 将数据源替换成版本7 不然下载的时候会报错 链接地址不存在.
baseurl=https://download.docker.com/linux/centos/7/debug-$basearch/stable
```

### 启动docker

```bash
 systemctl start docker
```

## 利用docker安装对应的服务

### Elasticsearch安装

#### 使用如下命令启动Elasticsearch服务

```bash
docker run -p 9200:9200 -p 9300:9300 --name elasticsearch \
-e "discovery.type=single-node" \
-e "cluster.name=elasticsearch" \
-v /mydata/elasticsearch/plugins:/usr/share/elasticsearch/plugins \
-v /mydata/elasticsearch/data:/usr/share/elasticsearch/data \
-d elasticsearch:7.6.2
```

#### 启动的时候会报错

```bash
OpenJDK 64-Bit Server VM warning: Option UseConcMarkSweepGC was deprecated in version 9.0 and will likely be removed in a future release.
{"type": "server", "timestamp": "2021-06-03T11:24:02,468Z", "level": "ERROR", "component": "o.e.b.ElasticsearchUncaughtExceptionHandler", "cluster.name": "elasticsearch", "node.name": "4f5aaf7716c0", "message": "uncaught exception in thread [main]", 
"stacktrace": ["org.elasticsearch.bootstrap.StartupException: ElasticsearchException[failed to bind service]; nested: AccessDeniedException[/usr/share/elasticsearch/data/nodes];",
"at org.elasticsearch.bootstrap.Elasticsearch.init(Elasticsearch.java:174) ~[elasticsearch-7.6.2.jar:7.6.2]",
"at org.elasticsearch.bootstrap.Elasticsearch.execute(Elasticsearch.java:161) ~[elasticsearch-7.6.2.jar:7.6.2]",
"at org.elasticsearch.cli.EnvironmentAwareCommand.execute(EnvironmentAwareCommand.java:86) ~[elasticsearch-7.6.2.jar:7.6.2]",
"at org.elasticsearch.cli.Command.mainWithoutErrorHandling(Command.java:125) ~[elasticsearch-cli-7.6.2.jar:7.6.2]",
"at org.elasticsearch.cli.Command.main(Command.java:90) ~[elasticsearch-cli-7.6.2.jar:7.6.2]",
"at org.elasticsearch.bootstrap.Elasticsearch.main(Elasticsearch.java:126) ~[elasticsearch-7.6.2.jar:7.6.2]",
"at org.elasticsearch.bootstrap.Elasticsearch.main(Elasticsearch.java:92) ~[elasticsearch-7.6.2.jar:7.6.2]",
"Caused by: org.elasticsearch.ElasticsearchException: failed to bind service",
"at org.elasticsearch.node.Node.<init>(Node.java:615) ~[elasticsearch-7.6.2.jar:7.6.2]",
"at org.elasticsearch.node.Node.<init>(Node.java:257) ~[elasticsearch-7.6.2.jar:7.6.2]",
"at org.elasticsearch.bootstrap.Bootstrap$5.<init>(Bootstrap.java:221) ~[elasticsearch-7.6.2.jar:7.6.2]",
"at org.elasticsearch.bootstrap.Bootstrap.setup(Bootstrap.java:221) ~[elasticsearch-7.6.2.jar:7.6.2]",
"at org.elasticsearch.bootstrap.Bootstrap.init(Bootstrap.java:349) ~[elasticsearch-7.6.2.jar:7.6.2]",
"at org.elasticsearch.bootstrap.Elasticsearch.init(Elasticsearch.java:170) ~[elasticsearch-7.6.2.jar:7.6.2]",
"... 6 more",
"Caused by: java.nio.file.AccessDeniedException: /usr/share/elasticsearch/data/nodes",
"at sun.nio.fs.UnixException.translateToIOException(UnixException.java:90) ~[?:?]",
"at sun.nio.fs.UnixException.rethrowAsIOException(UnixException.java:111) ~[?:?]",
"at sun.nio.fs.UnixException.rethrowAsIOException(UnixException.java:116) ~[?:?]",
"at sun.nio.fs.UnixFileSystemProvider.createDirectory(UnixFileSystemProvider.java:389) ~[?:?]",
"at java.nio.file.Files.createDirectory(Files.java:693) ~[?:?]",
"at java.nio.file.Files.createAndCheckIsDirectory(Files.java:800) ~[?:?]",
"at java.nio.file.Files.createDirectories(Files.java:786) ~[?:?]",
"at org.elasticsearch.env.NodeEnvironment.lambda$new$0(NodeEnvironment.java:274) ~[elasticsearch-7.6.2.jar:7.6.2]",
"at org.elasticsearch.env.NodeEnvironment$NodeLock.<init>(NodeEnvironment.java:211) ~[elasticsearch-7.6.2.jar:7.6.2]",
"at org.elasticsearch.env.NodeEnvironment.<init>(NodeEnvironment.java:271) ~[elasticsearch-7.6.2.jar:7.6.2]",
"at org.elasticsearch.node.Node.<init>(Node.java:277) ~[elasticsearch-7.6.2.jar:7.6.2]",
"at org.elasticsearch.node.Node.<init>(Node.java:257) ~[elasticsearch-7.6.2.jar:7.6.2]",
"at org.elasticsearch.bootstrap.Bootstrap$5.<init>(Bootstrap.java:221) ~[elasticsearch-7.6.2.jar:7.6.2]",
"at org.elasticsearch.bootstrap.Bootstrap.setup(Bootstrap.java:221) ~[elasticsearch-7.6.2.jar:7.6.2]",
"at org.elasticsearch.bootstrap.Bootstrap.init(Bootstrap.java:349) ~[elasticsearch-7.6.2.jar:7.6.2]",
"at org.elasticsearch.bootstrap.Elasticsearch.init(Elasticsearch.java:170) ~[elasticsearch-7.6.2.jar:7.6.2]",
"... 6 more"] }
uncaught exception in thread [main]
```

> 启动时会发现/usr/share/elasticsearch/data目录没有访问权限，只需要修改/mydata/elasticsearch/data目录的权限，再重新启动即可

```bash
chmod 777 /mydata/elasticsearch/data/
```

#### 安装中文分词器IKAnalyzer，并重新启动

```bash

# 进入docker容器中
docker exec -it elasticsearch /bin/bash

#此命令需要在容器中运行
elasticsearch-plugin install https://github.com/medcl/elasticsearch-analysis-ik/releases/download/v7.6.2/elasticsearch-analysis-ik-7.6.2.zip
-> Installing https://github.com/medcl/elasticsearch-analysis-ik/releases/download/v7.6.2/elasticsearch-analysis-ik-7.6.2.zip
-> Downloading https://github.com/medcl/elasticsearch-analysis-ik/releases/download/v7.6.2/elasticsearch-analysis-ik-7.6.2.zip
[=================================================] 100%?? 
@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
@     WARNING: plugin requires additional permissions     @
@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
* java.net.SocketPermission * connect,resolve
See http://docs.oracle.com/javase/8/docs/technotes/guides/security/permissions.html
for descriptions of what these permissions allow and the associated risks.

Continue with installation? [y/N]y
-> Installed analysis-ik

# 退出去后重启生效
docker restart elasticsearch
```

#### 访问会返回版本信息：<http://39.103.203.41:9200/>

```json
{
  "name" : "4f5aaf7716c0",
  "cluster_name" : "elasticsearch",
  "cluster_uuid" : "PBB0ZytDStO-9SJjAarNyw",
  "version" : {
    "number" : "7.6.2",
    "build_flavor" : "default",
    "build_type" : "docker",
    "build_hash" : "ef48eb35cf30adf4db14086e8aabd07ef6fb113f",
    "build_date" : "2020-03-26T06:34:37.794943Z",
    "build_snapshot" : false,
    "lucene_version" : "8.4.0",
    "minimum_wire_compatibility_version" : "6.8.0",
    "minimum_index_compatibility_version" : "6.0.0-beta1"
  },
  "tagline" : "You Know, for Search"
}
```

### Logstash安装

#### 下载Logstash7.6.2的docker镜像

```bash
docker pull logstash:7.6.2
```

#### 如下配置文件logstash.conf  

```conf
input {
  tcp {

    mode => "server"
    host => "0.0.0.0"
    port => 4560
    codec => json_lines
    type => "debug"

  }
  tcp {

    mode => "server"
    host => "0.0.0.0"
    port => 4561
    codec => json_lines
    type => "error"

  }
  tcp {

    mode => "server"
    host => "0.0.0.0"
    port => 4562
    codec => json_lines
    type => "business"

  }
  tcp {

    mode => "server"
    host => "0.0.0.0"
    port => 4563
    codec => json_lines
    type => "record"

  }
}
filter{
  if [type] == "record" {

    mutate {
      remove_field => "port"
      remove_field => "host"
      remove_field => "@version"
    }
    json {
      source => "message"
      remove_field => ["message"]
    }

  }
}
output {
  elasticsearch {
    hosts => "39.103.203.41:9200"
    index => "mall-%{type}-%{+YYYY.MM.dd}"

  }
}   
```

#### 创建/mydata/logstash目录，并将Logstash的配置文件logstash.conf拷贝到该目录

```bash
mkdir /mydata/logstash
```

#### 使用如下命令启动Logstash服务

```bash
docker run --name logstash -p 4560:4560 -p 4561:4561 -p 4562:4562 -p 4563:4563 \
--link elasticsearch:es \
-v /mydata/logstash/logstash.conf:/usr/share/logstash/pipeline/logstash.conf \
-d logstash:7.6.2
```

#### 在logstash中安装json_lines插件

```bash
# 进入logstash容器
docker exec -it logstash /bin/bash
# 进入bin目录
cd /bin/
# 安装插件
logstash-plugin install logstash-codec-json_lines

OpenJDK 64-Bit Server VM warning: Option UseConcMarkSweepGC was deprecated in version 9.0 and will likely be removed in a future release.
WARNING: An illegal reflective access operation has occurred
WARNING: Illegal reflective access by com.headius.backport9.modules.Modules to method sun.nio.ch.NativeThread.signal(long)
WARNING: Please consider reporting this to the maintainers of com.headius.backport9.modules.Modules
WARNING: Use --illegal-access=warn to enable warnings of further illegal reflective access operations
WARNING: All illegal access operations will be denied in a future release
Validating logstash-codec-json_lines
Installing logstash-codec-json_lines
Installation successful
# 退出容器
exit
# 重启logstash服务
docker restart logstash

```

### Kibana安装

#### 下载Kibana7.6.2的docker镜像

```bash
7.6.2: Pulling from library/kibana
ab5ef0e58194: Already exists 
c64d415fc4c4: Pull complete 
40a228497f87: Pull complete 
047cebeb3d2b: Pull complete 
a1e90407e522: Pull complete 
b665bda75e65: Pull complete 
12bc27d9cfdc: Pull complete 
2611a8427d9d: Pull complete 
12efd486dee3: Pull complete 
d2dfc5062b56: Pull complete 
Digest: sha256:097e2b7f33f353a8fc19bbf2a6558431c63637113fdc625e6d34fc46f96c0130
Status: Downloaded newer image for kibana:7.6.2
docker.io/library/kibana:7.6.2
```

#### 使用如下命令启动Kibana服务

```bash
docker run --name kibana -p 5601:5601 \
--link elasticsearch:es \
-e "elasticsearch.hosts=http://es:9200" \
-d kibana:7.6.2
```

#### 访问地址进行测试  <http://39.103.203.41:5601/>

![主页面启动](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/b8e6ac9822464ac6be7f27a6a9a5fe4a~tplv-k3u1fbpfcp-zoom-1.image)

### SpringBoot应用集成Logstash

```xml
<!--集成logstash-->
<dependency>
    <groupId>net.logstash.logback</groupId>
    <artifactId>logstash-logback-encoder</artifactId>
    <version>5.3</version>
</dependency>
```

#### 添加配置文件logback-spring.xml让logback的日志输出到logstash

> 注意appender节点下的destination需要改成你自己的logstash服务地址，例如我自己的是：39.103.203.41:4560

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE configuration>
<configuration>
    <include resource="org/springframework/boot/logging/logback/defaults.xml"/>
    <include resource="org/springframework/boot/logging/logback/console-appender.xml"/>
    <!--应用名称-->
    <property name="APP_NAME" value="mall-admin"/>
    <!--日志文件保存路径-->
    <property name="LOG_FILE_PATH" value="${LOG_FILE:-${LOG_PATH:-${LOG_TEMP:-${java.io.tmpdir:-/tmp}}}/logs}"/>
    <contextName>${APP_NAME}</contextName>

    <!--每天记录日志到文件appender-->
    <appender name="FILE" class="ch.qos.logback.core.rolling.RollingFileAppender">
        <rollingPolicy class="ch.qos.logback.core.rolling.TimeBasedRollingPolicy">
            <fileNamePattern>${LOG_FILE_PATH}/${APP_NAME}-%d{yyyy-MM-dd}.log</fileNamePattern>
            <maxHistory>30</maxHistory>
        </rollingPolicy>
        <encoder>
            <pattern>${FILE_LOG_PATTERN}</pattern>
        </encoder>
    </appender>

    <!--输出到logstash的appender-->
    <appender name="LOGSTASH" class="net.logstash.logback.appender.LogstashTcpSocketAppender">
        <!--可以访问的logstash日志收集端口-->
        <destination>39.103.203.41:4560</destination>
        <encoder charset="UTF-8" class="net.logstash.logback.encoder.LogstashEncoder"/>
    </appender>

    <root level="INFO">
        <appender-ref ref="CONSOLE"/>
        <appender-ref ref="FILE"/>
        <appender-ref ref="LOGSTASH"/>
    </root>
</configuration>
```

#### 运行SpringBoot应用

```java
package com.macro.mall.tiny;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class MallApplication {

 public static void main(String[] args) {
  SpringApplication.run(MallApplication.class, args);
 }

}

```

### 在kibana中查看日志信息

#### 创建index pattern

![页面1](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/eff6d2f459a7474082ba905c4a05ea28~tplv-k3u1fbpfcp-zoom-1.image)

![页面2](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/1cdd4a8123ab4e17b80ee79f6ccfc116~tplv-k3u1fbpfcp-zoom-1.image)

![页面3](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/6c32db4b585d431daa11896882b2e8ba~tplv-k3u1fbpfcp-zoom-1.image)

![页面4](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/e119ec9d067c42e684fa3440339a4340~tplv-k3u1fbpfcp-zoom-1.image)

#### 调用该接口并查看日志

![获取用户权限](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/45bf83f457994b30abcd8a61d04a3a09~tplv-k3u1fbpfcp-zoom-1.image)

![查询接口调用信息](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/22565a517eaf44a797aa7130a4e2d955~tplv-k3u1fbpfcp-zoom-1.image)