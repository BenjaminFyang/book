# nacos注册中心、配置中心架构

## Nacos概述

### [服务注册、发现Nacos Discovery](https://github.com/alibaba/spring-cloud-alibaba/blob/master/spring-cloud-alibaba-docs/src/main/asciidoc-zh/nacos-discovery.adoc#%E6%9C%8D%E5%8A%A1%E6%B3%A8%E5%86%8C%E5%8F%91%E7%8E%B0-nacos-discovery)

* 摘抄自官方文档说明

> [!note]
> <https://github.com/alibaba/spring-cloud-alibaba/blob/master/spring-cloud-alibaba-docs/src/main/asciidoc-zh/nacos-discovery.adoc#%E6%9C%8D%E5%8A%A1%E6%B3%A8%E5%86%8C%E5%8F%91%E7%8E%B0-nacos-discovery>
>
> 服务发现是微服务架构体系中最关键的组件之一。如果尝试着用手动的方式来给每一个客户端来配置所有服务提供者的服务列表是一件非常困难的事，而且也不利于服务的动态扩缩容。
>
> Nacos Discovery可以帮助您将服务自动注册到Nacos服务端并且能够动态感知和刷新某个服务实例的服务列表。
>
> 除此之外，Nacos Discovery 也将服务实例自身的一些元数据信息-例如hostport, 健康检查URL主页等内容注册到 Nacos。

### 注册中心原理

#### 注册中心的三种角色

> [!note]
>
> **服务提供者**（Service Provider）、**服务消费者**（Service Consumer）、**注册中心**（Registry）

#### 服务提供者

* 1、启动时，向注册中心注册自己为一个服务（Service）的实例。
* 2、定期向注册中心发送心跳，告诉自己还存活。
* 3、关闭时，向注册中心取消注册。

#### 服务消费者

* 1、启动时，向注册中心订阅使用到的服务，并缓存服务的实例列表在内存中。
* 2、后续，服务消费者向对应服务的提供者发起调用时，从内存中的选择一个该服务的实例，进行远程调用。
* 3、关闭时，向注册中心取消订阅。

#### 注册中心

* 1、服务提供者超过一定时间未心跳时，从服务的实例列表移除。
* 2、服务的实例列表发生变化（新增或者移除）时，通知订阅该服务的消费者，从而让消费者能够刷新本地缓存

## Nacos安装部署

### 依赖环境

* 1、64 bit OS，支持 Linux/Unix/Mac/Windows，推荐选用 Linux/Unix/Mac
* 2、64 bit JDK 1.8+
* 3、Maven 3.2.x+

### 从 Github 上下载源码方式

```bash
➜  webApp git clone https://github.com/alibaba/nacos.git
正克隆到 'nacos'...
remote: Enumerating objects: 87393, done.
remote: Counting objects: 100% (159/159), done.
remote: Compressing objects: 100% (94/94), done.
remote: Total 87393 (delta 34), reused 47 (delta 6), pack-reused 87234
接收对象中: 100% (87393/87393), 42.07 MiB | 1.65 MiB/s, 完成.
处理 delta 中: 100% (37309/37309), 完成.
```

/opt/webApp/nacos-2.0.4/distribution/target/nacos-server.jar

### 编译

```bash
mvn -Prelease-nacos -Dmaven.test.skip=true clean install -U  
```

### 运行

```bash
#进入nacos/distribution目录下，找到对应版本的编译后的文件夹=
mvn -Prelease-nacos -Dmaven.test.skip=true clean install -U  

#Linux/Unix/Mac

/opt/webApp/nacos-2.0.4/distribution/target/nacos-server-2.1.0-SNAPSHOT/nacos/bin
sh startup.sh -m standalone
```

### 访问

* <http://127.0.0.1:8848/nacos>

## Nacos 架构概念

> 引用 <https://nacos.io/zh-cn/docs/architecture.html>

### 数据模型

> Nacos 数据模型 Key 由三元组唯一确定, Namespace默认是空串，公共命名空间（public），分组默认是 DEFAULT_GROUP。

![动图1](https://cdn.nlark.com/yuque/0/2019/jpeg/338441/1561217857314-95ab332c-acfb-40b2-957a-aae26c2b5d71.jpeg)

* 1、注册中心 Namespace + Group + Service
* 2、配置中心 Namespace + Group + DataId

### Namespace 命名空间

> 用于进行租户粒度的配置隔离。默认为 public（公共命名空间）。**不同环境的配置的区分隔离**

![动图1](https://fy-image.oss-cn-beijing.aliyuncs.com/images/q81WechatIMG138.png)

### Group服务分组

不同的服务可以归类到同一分组。默认为 DEFAULT_GROUP（默认分组）

![动图1](https://fy-image.oss-cn-beijing.aliyuncs.com/images/q83WechatIMG140.png)

![动图1](https://fy-image.oss-cn-beijing.aliyuncs.com/images/q82WechatIMG139.png)

### Service 服务

例如: 订单服务、库存服务

## 整合代码

### 代码地址

> [!note]
>
> <https://github.com/BenjaminFyang/frameService-platform.git>

### 项目结构

```bash
.
├── HELP.md
├── SpringCloud-Service.iml
├── eureka-services
│   ├── accountService
│   ├── eureka-services.iml
│   ├── orderService
│   ├── pom.xml
│   └── storageService
├── nacos-services
│   ├── nacos-discovery-account-provider  (服务提供者)
│   ├── nacos-discovery-order-consumer   （服务消费者）
│   ├── nacos-service.iml
│   └── pom.xml
├── pom.xml
├── traceId-commons
│   ├── feignOkHttp
│   ├── pom.xml
│   ├── traceId-common-core
│   ├── traceId-commons.iml
│   ├── traceId-log-springcloud-starter
│   └── traceId-rocketmq-starter
├── traceId-eureka
├── traceId-gateway
└── traceId-loadbalancer

```

### 搭建服务提供者

#### 依赖版本关系梳理

> 首先梳理下 Spring Boot、Spring Cloud、Spring Cloud Alibaba 三者 BOM 文件，进行依赖版本的管理，防止不兼容 引用自 <https://github.com/alibaba/spring-cloud-alibaba/wiki/%E7%89%88%E6%9C%AC%E8%AF%B4%E6%98%8E>

* 依赖版本关系如下

| Spring Cloud Alibaba Version | Spring Cloud Version        | Spring Boot Version |
|------------------------------|-----------------------------|---------------------|
| 2.2.7. RELEASE                | Spring Cloud Hoxton. SR12    | 2.3.12. RELEASE      |
| 2021.1                       | Spring Cloud 2020.0.1       | 2.4.2               |
| 2.2.6. RELEASE                | Spring Cloud Hoxton. SR9     | 2.3.2. RELEASE       |
| 2.1.4. RELEASE                | Spring Cloud Greenwich. SR6  | 2.1.13. RELEASE      |
| 2.2.1. RELEASE                | Spring Cloud Hoxton. SR3     | 2.2.5. RELEASE       |
| 2.2.0. RELEASE                | Spring Cloud Hoxton. RELEASE | 2.2. X. RELEASE       |
| 2.1.2. RELEASE                | Spring Cloud Greenwich      | 2.1. X. RELEASE       |
| 2.0.4. RELEASE(停止维护，建议升级)     | Spring Cloud Finchley       | 2.0. X. RELEASE       |
| 1.5.1. RELEASE(停止维护，建议升级)     | Spring Cloud Edgware        | 1.5. X. RELEASE       |

#### 引入pom依赖

```xml
<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>

    <parent>
        <groupId>com.example</groupId>
        <artifactId>nacos-service</artifactId>
        <version>0.0.1-SNAPSHOT</version>
    </parent>

    <artifactId>nacos-discovery-account-provider</artifactId>
    <version>2.0.1</version>
    <name>nacos-discovery-account-provider</name>
    <description>账号信息</description>

    <dependencies>

        <!-- 引入 SpringMVC 相关依赖，并实现对其的自动配置 -->
        <dependency>
            <groupId>org.springframework.boot</groupId>
            <artifactId>spring-boot-starter-web</artifactId>
        </dependency>

        <!-- 引入 Spring Cloud Alibaba Nacos Discovery 相关依赖，将 Nacos 作为注册中心，并实现对其的自动配置 -->
        <dependency>
            <groupId>com.alibaba.cloud</groupId>
            <artifactId>spring-cloud-starter-alibaba-nacos-discovery</artifactId>
        </dependency>

        <!-- 引入 Spring Cloud OpenFeign 相关依赖，使用 OpenFeign 提供声明式调用，并实现对其的自动配置 -->
        <dependency>
            <groupId>org.springframework.cloud</groupId>
            <artifactId>spring-cloud-starter-openfeign</artifactId>
        </dependency>

        <!-- 引入 Feign Apache HttpClient 依赖 -->
        <dependency>
            <groupId>io.github.openfeign</groupId>
            <artifactId>feign-httpclient</artifactId>
        </dependency>

        <dependency>
            <groupId>org.projectlombok</groupId>
            <artifactId>lombok</artifactId>
        </dependency>

        <dependency>
            <groupId>com.example</groupId>
            <artifactId>traceId-common-core</artifactId>
            <version>2.0.1</version>
        </dependency>

        <dependency>
            <groupId>com.example</groupId>
            <artifactId>traceId-log-springCloud-starter</artifactId>
            <version>2.0.1</version>
        </dependency>

    </dependencies>

</project>

```

#### 配置文件

> 创建application.yml 配置文件，添加 Nacos Discovery配置项

```yml
spring:
  application:
    name: nacos-account-service # Spring 应用名
  cloud:
    nacos:
      # Nacos 作为注册中心的配置项，对应 NacosDiscoveryProperties 配置类
      discovery:
        server-addr: 127.0.0.1:8848 # Nacos 服务器地址
        service: ${spring.application.name} # 注册到 Nacos 的服务名。默认值为 ${spring.application.name}。
server:
  port: 8182 #服务器端口。默认为 8080

```

#### 启动类

> @EnableDiscoveryClient 注解，开启 Spring Cloud 的注册发现功能。不过从 Spring Cloud Edgware 版本开始，实际上已经不需要添加 @EnableDiscoveryClient 注解，只需要引入 Spring Cloud 注册发现组件，就会自动开启注册发现的功能

```java
package com.example.nacos.account;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.client.discovery.EnableDiscoveryClient;

@SpringBootApplication
@EnableDiscoveryClient
public class DiscoveryAccountProviderApplication {

    public static void main(String[] args) {
        SpringApplication.run(DiscoveryAccountProviderApplication.class, args);
    }

}
```

#### 启动项目

* 1、启动项目类DiscoveryAccountProviderApplication，发现日志打印c.a.c.n.registry. NacosServiceRegistry 说明注册成功.

```bash
[nacos-account-service:192.168.130.167:8182] 2022-01-06 10:37:26.990 INFO 31879 [] [main] c.a.c.n.registry.NacosServiceRegistry    nacos registry, DEFAULT_GROUP nacos-account-service 192.168.130.167:8182 register finished
[nacos-account-service:192.168.130.167:8182] 2022-01-06 10:37:27.014 INFO 31879 [] [main] .n.a.DiscoveryAccountProviderApplication Started DiscoveryAccountProviderApplication in 5.673 seconds (JVM running for 7.337)
[nacos-account-service:192.168.130.167:8182] 2022-01-06 10:37:27.165 INFO 31879 [] [RMI TCP Connection(4)-127.0.0.1] o.a.c.c.C.[Tomcat].[localhost].[/]       Initializing Spring DispatcherServlet 'dispatcherServlet'
[nacos-account-service:192.168.130.167:8182] 2022-01-06 10:37:27.165 INFO 31879 [] [RMI TCP Connection(4)-127.0.0.1] o.s.web.servlet.DispatcherServlet        Initializing Servlet 'dispatcherServlet'
[nacos-account-service:192.168.130.167:8182] 2022-01-06 10:37:27.168 INFO 31879 [] [RMI TCP Connection(4)-127.0.0.1] o.s.web.servlet.DispatcherServlet        Completed initialization in 3 ms
```

* 2、打开 Nacos 控制台，可以在服务列表看到服务nacos-account-service

![动图1](https://fy-image.oss-cn-beijing.aliyuncs.com/q50WechatIMG136.png)

### 搭建服务消费者

> [!note]
>
> 参考搭建服务提供者、目前代码demo已经提供参考，故不在多做叙说

#### 消费者配置文件

```yml
spring:
  application:
    name: nacos-order-service # Spring 应用名
  cloud:
    nacos:
      # Nacos 作为注册中心的配置项，对应 NacosDiscoveryProperties 配置类
      discovery:
        server-addr: 127.0.0.1:8848 # Nacos 服务器地址

server:
  port: 8183 # 服务器端口。默认为 8080
```

#### 打开nacos控制台、可以看到对应的服务列表nacos-account-service

![动图1](https://fy-image.oss-cn-beijing.aliyuncs.com/images/q80WechatIMG137.png)

### 测试开始调用对应的依赖服务

#### Java实现例子

```java
package com.example.nacos.order.service.impl;

import com.example.nacos.order.domain.Order;
import com.example.nacos.order.service.AccountService;
import com.example.nacos.order.service.OrderService;
import com.google.common.collect.Lists;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import javax.annotation.Resource;
import java.util.List;

/**
 * 订单业务实现类
 */
@Service
public class OrderServiceImpl implements OrderService {

    private static final Logger LOGGER = LoggerFactory.getLogger(OrderServiceImpl.class);

    @Resource
    private AccountService accountService;

    /**
     * 创建订单->调用库存服务扣减库存->调用账户服务扣减账户余额->修改订单状态
     */
    public void create(Order order) {
        LOGGER.info("------->order-service中扣减余额开始");
        accountService.decrease();
        LOGGER.info("------->order-service中扣减余额结束");
    }
}

```

```java
package com.example.nacos.order.service;

import com.central.common.api.CommonResult;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.RequestMapping;

@FeignClient(value = "nacos-account-service")
public interface AccountService {

    /**
     * 扣减账户余额
     */
    @RequestMapping("/account/decrease")
    CommonResult<String> decrease();
}
```

#### 调用订单参数

```bash
curl --location --request POST 'http://localhost:8183/order/create' \
--header 'Content-Type: application/json' \
--data-raw '{
  "id": 0,
  "userId": 0,
  "productId": 0,
  "count": 0,
  "money": 0,
  "status": 0
}'
```

#### 返回

```json
{
    "code": 200,
    "message": "操作成功",
    "data": "订单创建成功!"
}
```

## 微服务用例多环境配置

> 针对同一个服务，会部署在开发、测试、预发布、生产环境中，在需要的项目中，添加不同环境的nacos配置。一般情况下，开发和测试使用同一个 Nacos，预发布和生产使用另一个 Nacos。那么针对相同的 Nacos，怎么实现不同环境的隔离

### 创建nacos命名空间

![动图1](https://fy-image.oss-cn-beijing.aliyuncs.com/images/q88WechatIMG141.png)

### 配置文件修改

#### 修改application.yaml

> 将 Nacos Discovery 配置项删除，稍后添加在不同环境的配置文件中

```yaml
spring:
  application:
    name: nacos-account-service # Spring 应用名
    
server:
  port: 8182 #服务器端口。默认为 8080

```

#### 新增开发环境application-dev.yaml 配置

```yaml
spring:
  cloud:
    nacos:
      # Nacos 作为注册中心的配置项，对应 NacosDiscoveryProperties 配置类
      discovery:
        server-addr: 127.0.0.1:8848 # Nacos 服务器地址
        namespace: 2c2e6be6-b514-47da-b216-c800b4292aa7 # Nacos 命名空间 dev 的编号
```

#### 新增生产环境application-prod.yaml 配置

```yaml
spring:
  cloud:
    nacos:
      # Nacos 作为注册中心的配置项，对应 NacosDiscoveryProperties 配置类
      discovery:
        server-addr: 127.0.0.1:8848 # Nacos 服务器地址
        namespace: 2c2e6be6-b514-47da-b216-c800b4292aa7 # Nacos 命名空间 prod 的编号
```

### 分环境进行测试

> 增加命令参数**--spring.profiles.active**配置项，实现不同环境，读取不同配置文件。

* 1、配置 --spring.profiles.active 为 dev 如下

![动图1](https://fy-image.oss-cn-beijing.aliyuncs.com/images/q89WechatIMG143.png)

* 2、启动项目, 打开Nacos控制台在服务列表dev下面看到微服务

![动图1](https://fy-image.oss-cn-beijing.aliyuncs.com/images/q90WechatIMG144.png)

## nacos配置中心

### 新建项目nacos-coinfig

![动图1](https://fy-image.oss-cn-beijing.aliyuncs.com/images/w10WechatIMG145.png)

### pom 文件新增依赖

```xml
    <!-- 引入 Spring Cloud Alibaba Nacos Config 相关依赖，将 Nacos 作为配置中心，并实现对其的自动配置 -->
        <dependency>
            <groupId>com.alibaba.cloud</groupId>
            <artifactId>spring-cloud-starter-alibaba-nacos-config</artifactId>
        </dependency>
```

### 配置文件设置

> 需要注意bootstrap.yaml  而不是application.yaml不然无法从配置中心加载配置文件</br>
> application 配置文件这个容易理解，主要用于 Spring Boot 项目的自动化配置。 </br>
> bootstrap 配置文件有以下几个应用场景。
>
> - 1、使用 Spring Cloud Config 配置中心时，这时需要在 bootstrap 配置文件中添加连接到配置中心的配置属性来加载外部配置中心的配置信息；</br>
> - 2、一些固定的不能被覆盖的属性 </br>
> - 3、一些加密/解密的场景； </br>

```yml
 spring:
  application:
    name: nacos-config-service # Spring 应用名

  cloud:
    nacos:
      # Nacos Config 配置项，对应 NacosConfigProperties 配置属性类
      config:
        server-addr: 127.0.0.1:8848 # Nacos 服务器地址
        namespace: # 使用的 Nacos 的命名空间，默认为 null
        group: DEFAULT_GROUP # 使用的 Nacos 配置分组，默认为 DEFAULT_GROUP
        name: # 使用的 Nacos 配置集的 dataId，默认为 spring.application.name
        file-extension: yaml # 使用的 Nacos 配置集的 dataId 的文件拓展名，同时也是 Nacos 配置集的配置格式，默认为 properties

server:
  port: 8195 # 服务器端口。默认为 8080

```

### 创建Nacos配置

* 1、打开Nacos UI界面

![动图1](https://fy-image.oss-cn-beijing.aliyuncs.com/images/w11WechatIMG146.png)

* 2、新建配置

![动图1](https://fy-image.oss-cn-beijing.aliyuncs.com/images/w13WechatIMG147.png)

* 3、创建OrderProperties配置类

```java
package com.example.nacosConfig.configProperties;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Data
@Component
@ConfigurationProperties(prefix = "order")
public class OrderProperties {

    /**
     * 订单支付超时时长，单位：秒。
     */
    private Integer payTimeoutSeconds;

    /**
     * 订单创建频率，单位：秒
     */
    private Integer createFrequencySeconds;

}

```

* 4、创建OrderController请求类

```java
package com.example.nacosConfig.controller;

import com.central.common.api.CommonResult;
import com.example.nacosConfig.configProperties.OrderProperties;
import com.example.nacosConfig.domain.Order;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import javax.annotation.Resource;

@RestController
@RequestMapping("/order")
public class OrderController {

    @Resource
    private OrderProperties orderProperties;

    @PostMapping("/create")
    public CommonResult<String> create(@RequestBody Order order) {
        return CommonResult.success("订单创建成功!");
    }

    @PostMapping("/getOrderProperties")
    public CommonResult<OrderProperties> getOrderProperties() {
        return CommonResult.success(orderProperties);
    }
}

```

* 5、启动项目，可以就看到Nacos的相关日志如下

```bash
[nacos-config-service:192.168.130.167:8195] 2022-01-10 11:38:35.597 INFO 60022 [] [main] com.alibaba.nacos.client.naming          [BEAT] adding beat: {"cluster":"DEFAULT","ip":"192.168.130.167","metadata":{"preserved.register.source":"SPRING_CLOUD"},"period":5000,"port":8195,"scheduled":false,"serviceName":"DEFAULT_GROUP@@nacos-config-service","stopped":false,"weight":1.0} to beat map.
[nacos-config-service:192.168.130.167:8195] 2022-01-10 11:38:35.658 INFO 60022 [] [main] com.alibaba.nacos.client.naming          [REGISTER-SERVICE] public registering service DEFAULT_GROUP@@nacos-config-service with instance: {"clusterName":"DEFAULT","enabled":true,"ephemeral":true,"healthy":true,"instanceHeartBeatInterval":5000,"instanceHeartBeatTimeOut":15000,"ip":"192.168.130.167","ipDeleteTimeout":30000,"metadata":{"preserved.register.source":"SPRING_CLOUD"},"port":8195,"weight":1.0}
[nacos-config-service:192.168.130.167:8195] 2022-01-10 11:38:35.665 INFO 60022 [] [main] c.a.c.n.registry.NacosServiceRegistry    nacos registry, DEFAULT_GROUP nacos-config-service 192.168.130.167:8195 register finished
[nacos-config-service:192.168.130.167:8195] 2022-01-10 11:38:35.670 INFO 60022 [] [main] c.e.nacosConfig.NacosConfigApplication   Started NacosConfigApplication in 4.49 seconds (JVM running for 5.209)
[nacos-config-service:192.168.130.167:8195] 2022-01-10 11:38:35.676 INFO 60022 [] [main] c.a.n.client.config.impl.ClientWorker    [fixed-127.0.0.1_8848] [subscribe] nacos-config-service.yaml+DEFAULT_GROUP
[nacos-config-service:192.168.130.167:8195] 2022-01-10 11:38:35.676 INFO 60022 [] [main] c.a.nacos.client.config.impl.CacheData   [fixed-127.0.0.1_8848] [add-listener] ok, tenant=, dataId=nacos-config-service.yaml, group=DEFAULT_GROUP, cnt=1
[nacos-config-service:192.168.130.167:8195] 2022-01-10 11:38:35.677 INFO 60022 [] [main] c.a.n.client.config.impl.ClientWorker    [fixed-127.0.0.1_8848] [subscribe] nacos-config-service+DEFAULT_GROUP
[nacos-config-service:192.168.130.167:8195] 2022-01-10 11:38:35.677 INFO 60022 [] [main] c.a.nacos.client.config.impl.CacheData   [fixed-127.0.0.1_8848] [add-listener] ok, tenant=, dataId=nacos-config-service, group=DEFAULT_GROUP, cnt=1
```

* 5、请求接口如下

![动图1](https://fy-image.oss-cn-beijing.aliyuncs.com/images/w15WechatIMG148.png)

## nacos配置中心多环境配置

### 增加dev配置中心

![动图1](https://fy-image.oss-cn-beijing.aliyuncs.com/images/w16WechatIMG149.png)

### 增加NacosConfig配置

```xml
    <!-- 引入 Spring Cloud Alibaba Nacos Config 相关依赖，将 Nacos 作为配置中心，并实现对其的自动配置 -->
    <dependency>
        <groupId>com.alibaba.cloud</groupId>
        <artifactId>spring-cloud-starter-alibaba-nacos-config</artifactId>
    </dependency>
```

### 项目新增dev、prod配置

* 1、新增dev配置文件

```yaml
spring:
  cloud:
    nacos:
      # Nacos 作为注册中心的配置项，对应 NacosDiscoveryProperties 配置类
      config:
        server-addr: 127.0.0.1:8848 # Nacos 服务器地址
        namespace: ec2feef0-6b78-432b-b19f-c67bd8d25622 # Nacos 命名空间 dev 的编号
        group: DEFAULT_GROUP # 使用的 Nacos 配置分组，默认为 DEFAULT_GROUP
        name: ${spring.application.name} # 使用的 Nacos 配置集的 dataId，默认为 spring.application.name
        file-extension: yaml # 使用的 Nacos 配置集的 dataId 的文件拓展名，同时也是 Nacos 配置集的配置格式，默认为 propertie
```

* 2、新增prod配置文件

```yaml
spring:
  cloud:
    nacos:
      # Nacos 作为注册中心的配置项，对应 NacosDiscoveryProperties 配置类
      config:
        server-addr: 127.0.0.1:8848 # Nacos 服务器地址
        namespace: 2c2e6be6-b514-47da-b216-c800b4292aa7 # Nacos 命名空间 prod 的编号
        group: DEFAULT_GROUP # 使用的 Nacos 配置分组，默认为 DEFAULT_GROUP
        name: ${spring.application.name} # 使用的 Nacos 配置集的 dataId，默认为 spring.application.name
        file-extension: yaml # 使用的 Nacos 配置集的 dataId 的文件拓展名，同时也是 Nacos 配置集的配置格式，默认为 propertie
```

* 3、bootstrap.yaml

> bootstrap.yaml 配置文件，放不同环境的相同配置。例如说，spring.application.name 配置项，肯定是相同的啦。配置如下

```yaml
spring:
  application:
    name: nacos-config-service # Spring 应用名
```

### 启动项目测试

> 使用 VM 参数进行 -Dspring.profiles.active=dev，对 bootstrap.yaml 配置文件有效

![动图1](https://fy-image.oss-cn-beijing.aliyuncs.com/images/w17WechatIMG150.png)

* 项目启动后可以看到打印的参数如下:

```bash
[nacos-config-service:192.168.130.167:0000] 2022-01-10 13:48:31.415 INFO 97990 [] [main] c.e.nacosConfig.NacosConfigApplication   The following profiles are active: dev
[nacos-config-service:192.168.130.167:0000] 2022-01-10 13:48:32.183 WARN 97990 [] [main] o.s.boot.actuate.endpoint.EndpointId     Endpoint ID 'nacos-config' contains invalid characters, please migrate to a valid format.
[nacos-config-service:192.168.130.167:0000] 2022-01-10 13:48:32.187 WARN 97990 [] [main] o.s.boot.actuate.endpoint.EndpointId     Endpoint ID 'nacos-discovery' contains invalid characters, please migrate to a valid format
```

## 配置中心自动刷新设置

### 增加注解@RefreshScope

```java
package com.example.nacosConfig.controller;

import com.central.common.api.CommonResult;
import com.example.nacosConfig.configProperties.OrderProperties;
import org.springframework.cloud.context.config.annotation.RefreshScope;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import javax.annotation.Resource;

@RestController
@RequestMapping("/order")
@RefreshScope
public class OrderController {

    @Resource
    private OrderProperties orderProperties;

    @PostMapping("/create")
    public CommonResult<String> create() {
        return CommonResult.success("订单创建成功!");
    }

    @PostMapping("/getOrderProperties")
    public CommonResult<OrderProperties> getOrderProperties() {
        return CommonResult.success(orderProperties);
    }
}
```

### 启动项目 对配置进行修改

* 1、修改前的配置
  
![动图1](https://fy-image.oss-cn-beijing.aliyuncs.com/images/w20WechatIMG151.png)

* 2、请求<http://localhost:8195/order/getOrderProperties>接口测试

![动图1](https://fy-image.oss-cn-beijing.aliyuncs.com/images/w21WechatIMG152.png)

* 3、修改nacos配置中心相关数据
  
![动图1](https://fy-image.oss-cn-beijing.aliyuncs.com/images/w22WechatIMG153.png)

* 4、重新请求接口<http://localhost:8195/order/getOrderProperties>接口测试 发现配置已经动态刷新

![动图1](https://fy-image.oss-cn-beijing.aliyuncs.com/images/w23WechatIMG154.png)

### 增加动态监听配置事件

* 1、java代码如下

```java
package com.example.nacosConfig.Listener;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cloud.context.environment.EnvironmentChangeEvent;
import org.springframework.context.ApplicationListener;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.stereotype.Component;

import javax.annotation.Resource;

@Component
public class EnvironmentChangeListener implements ApplicationListener<EnvironmentChangeEvent> {

    private final Logger logger = LoggerFactory.getLogger(getClass());

    @Resource
    private ConfigurableEnvironment environment;
    
    public void onApplicationEvent(EnvironmentChangeEvent environmentChangeEvent) {
        for (String key : environmentChangeEvent.getKeys()) {
            logger.info("[onApplicationEvent][key({}) 最新 value 为 {}]", key, environment.getProperty(key));
        }
    }
}
```

* 2、测试更新配置如下打印日志
  
![动图1](https://fy-image.oss-cn-beijing.aliyuncs.com/images/w24WechatIMG155.png)

## 九、配置加密设置

> 考虑到安全性，最好将配置文件中的敏感信息进行加密。例如说，MySQL 的用户名密码、第三方平台的Token令牌等等

### Nacos + Jasypt 配置加密

* 1、增加pom引入

```xml
        <!-- 实现对 Jasypt 实现自动化配置 -->
        <dependency>
            <groupId>com.github.ulisesbocchio</groupId>
            <artifactId>jasypt-spring-boot-starter</artifactId>
            <version>3.0.2</version>
        </dependency>
```

* 2、新增nacos配置

![动图1](https://fy-image.oss-cn-beijing.aliyuncs.com/images/w25WechatIMG156.png)

* 3、JasyptTest 测试类进行加密

```java
package com.example.nacosConfig.controller;

import org.jasypt.encryption.StringEncryptor;
import org.junit.Test;
import org.junit.runner.RunWith;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.junit4.SpringRunner;

import javax.annotation.Resource;

@RunWith(SpringRunner.class)
@SpringBootTest
@ActiveProfiles("dev")
public class JasyptTest {

    @Resource
    private StringEncryptor encryptor;

    @Test
    public void encode() {
        String password = "joyowo";
        System.out.println(encryptor.encrypt(password));
    }
}
```

* 4、执行方法encode（）获得加密结果
  
```bash
Q1Iu4V1Nk7QpnxAT+EKbeHc3cnSG4UBc
```

* 5、将加密后的值填入nacos配置项xxx-password中

![动图1](https://fy-image.oss-cn-beijing.aliyuncs.com/images/w26WechatIMG157.png)

### 对Nacos的加密配置进行解密

* 1、JasyptEnvironmentChangeListener监听器解密

```java
package com.example.nacosConfig.Listener;

import org.apache.commons.lang3.StringUtils;
import org.jasypt.encryption.StringEncryptor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cloud.context.environment.EnvironmentChangeEvent;
import org.springframework.cloud.context.environment.EnvironmentManager;
import org.springframework.context.ApplicationListener;
import org.springframework.stereotype.Component;

import javax.annotation.Resource;

@Component
public class JasyptEnvironmentChangeListener implements ApplicationListener<EnvironmentChangeEvent> {

    private final Logger logger = LoggerFactory.getLogger(getClass());

    // Environment 管理器，可以实现配置项的获取和修改
    @Resource
    private EnvironmentManager environmentManager;

    // Jasypt 加密器，可以对配置项进行加密和加密
    @Resource
    private StringEncryptor encryptor;

    public void onApplicationEvent(EnvironmentChangeEvent event) {
        for (String key : event.getKeys()) {
            // <1> 获得 value
            Object valueObj = environmentManager.getProperty(key);
            if (!(valueObj instanceof String)) {
                continue;
            }
            String value = (String) valueObj;
            // <2> 判断 value 是否为加密。如果是，则进行解密
            if (value.startsWith("ENC(") && value.endsWith(")")) {
                value = encryptor.decrypt(StringUtils.substringBetween(value, "ENC(", ")"));
                logger.info("[onApplicationEvent][key({}) 解密后为 {}]", key, value);
                // <3> 设置到 Environment 中
                environmentManager.setProperty(key, value);
            }
        }
    }

}
```

* 2、调用接口进行测试<http://localhost:8195/order/test> 调用方法实现解密返回joyowo

![动图1](https://fy-image.oss-cn-beijing.aliyuncs.com/images/w27WechatIMG158.png)

## 十、配置加载顺序

> Nacos Config 提供了三种配置 Nacos 配置集的方式： 当三种方式共同使用时，它们的优先级关系是：1 < 2< 3 </br>
>
> - 1、通过 spring.cloud.nacos.config.shared-configs 配置项，支持多个共享 Nacos 配置集。 </br>
> - 2、通过 spring.cloud.nacos.config.extension-configs 配置项，支持多个拓展 Nacos 配置集。</br>
> - 3、通过 spring.cloud.nacos.config.name 配置项，支持一个 Nacos 配置集。 </br>

### 配置文件如下显示

``` yaml
spring:
  application:
    name: social #各服务只需修改此服务名配置，其他配置不用变更，也不建议变更
  profiles:
    active: '@profileActive@'
  cloud:
    nacos:
      config: #服务需动态刷新的配置，如开关、阀值等，如没有，可以不配置, 如需配置，请在配置中心添加，完整配置文件名为admin-refreshable.yml(例)
        name: ${spring.application.name}-refreshable
        namespace: # 使用的 Nacos 的命名空间，默认为 null
        group: DEFAULT_GROUP # 使用的 Nacos 配置分组，默认为 DEFAULT_GROUP
        file-extension: yml
        # 拓展配置集数组，对应 Config 数组
        extension-configs:
          - data-id: ${spring.application.name}-fixed.yml  #与环境无关，各服务固定的配置，不可动态刷新，如服务端口、job端口、ID生成器编号等
            group: DEFAULT_GROUP # 使用的 Nacos 配置分组，默认为 DEFAULT_GROUP
            refresh: true # 是否自动刷新配置，默认为 false
          - data-id: ${spring.application.name}-test1db.yml #数据库配置，与环境、服务都有关，需分别配置，不可动态刷新，请在配置中心添加，完整配置文件名为admin-db.yml(例)
            group: DEFAULT_GROUP # 使用的 Nacos 配置分组，默认为 DEFAULT_GROUP
            refresh: true # 是否自动刷新配置，默认为 false
        # 共享配置集数组，对应 Config 数组
        shared-configs:
          - data-id: common.yml #系统整体公共的配置，不可动态刷新，与环境、服务都无关，架构统一配置，各服务无需配置
            refresh: true # 是否自动刷新配置，默认为 false
            group: common
          - data-id: shared-midware.yml #公共的中间件配置，不可动态刷新，与环境有关，服务无关，如mq、redis、注册中心、xxl-job等，日志等级也在此配置 #运维统一配置，各服务无需配置
            refresh: true # 是否自动刷新配置，默认为 false
            group: common


#不同环境只需不同的配置中心地址，无其他额外配置，故采用单文件多文档块配置
#注意不要删了分割符“---”
---
spring:
  profiles: dev
  cloud:
    nacos:
      config:
        namespace: abd0ead4-597a-418a-92e7-efad9c0c274b
        server-addr: 172.16.16.30:8848
```

> [!note]
>
> alibaba/nacos注册中心、配置中心架构整合
>
> 麒麟系统已经引入nacos作为注册中心、配置中心,本文梳理了整个nacos架构模型。目前各环境是配置在maven中依赖配置的，在本地环境调试切换时需要实时刷新maven环境依赖，比较吃本地电脑性能。建议将环境切换配置在项目启动参数上，减少maven不必要的刷新提高本地性能，同时职责单一。
>
> **nacos 主要大纲**
>
> 1、了解注册、配置中心多环境配置过程。（开发、测试、预发布、生产等环境隔离）
>
> 2、了解自动刷新配置。（不重启项目对配置更新事件进行监听通知更新）
>
> 3、配置加密（敏感信息进行加密。如MySQL的用户名密码、第三方平台的Token令牌等）
>
> 4、了解Nacos配置集的方式
>
> 使用教程语雀地址: <https://joyowo.yuque.com/techs/regulations/xtdqrf>
