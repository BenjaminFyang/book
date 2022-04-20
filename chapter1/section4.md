# Nacos配置中心持久化

> [!note]
>
> 当使用默认启动Nacos时候，所有的配置文件被nacos保存在了内置的数据库中；
>
> Nacos通过集中式存储来保证数据的持久化，同时也为Nacos集群部署奠定了基础； 
>
> 组建Nacos集群，那各个节点中的数据唯一性就是最大的问题. Nacos采用了单一数据源，直接解决了分布式和集群部署中的一致性问题。

## 单机模式支持mysql

* 在0.7版本之前，在单机模式时nacos使用嵌入式数据库实现数据的存储，不方便观察数据存储的基本情况。0.7版本增加了支持mysql数据源能力，具体的操作步骤

> [!note]
>
> 1、安装数据库，版本要求：5.6.5+
> 2、初始化mysql数据库，数据库初始化文件：nacos-mysql.sql
> 3、修改conf/application.properties文件，增加支持mysql数据源配置（目前只支持mysql），添加mysql 数据源的url、用户名和密码。

## 初始化数据库

> 进入 /nacos-2.0.4/distribution/target/nacos-server-2.1.0-SNAPSHOT/nacos/conf目录下 初始化文件nacos-mysql.sql

![动图1](https://fy-image.oss-cn-beijing.aliyuncs.com/images/nn10WechatIMG190.png)

## 修改配置文件

> [!note]
>
> /nacos-2.0.4/distribution/target/nacos-server-2.1.0-SNAPSHOT/nacos/conf 位于application.properties

```bash
 32 ### If use MySQL as datasource:
 33 spring.datasource.platform=mysql
 34 
 35 ### Count of DB:
 36 db.num=1
 37 
 38 ### Connect URL of DB:
 39 db.url.0=jdbc:mysql://127.0.0.1:3306:3306/nacos?characterEncoding=utf8&connectTimeout=1000&socketTimeout=3000&autoReconnect=true&useUnicode=true&useSSL=false&serverTimezone=UTC
 40 db.user.0=fangyang
 41 db.password.0=224206799qqFy
```

## 在此启动Nacos

```bash
sh startup.sh -m standalone
```

### 增加nacos配置

![动图1](https://fy-image.oss-cn-beijing.aliyuncs.com/images/nn13WechatIMG191.png)

## 查看是否持化话到mysql

![动图1](https://fy-image.oss-cn-beijing.aliyuncs.com/images/nn15WechatIMG192.png)
