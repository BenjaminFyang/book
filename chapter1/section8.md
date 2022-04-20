# 消息队列梳理

## 系统中为什么使用消息队列

> [!note]
>
> 消息队列使用的场景主要的核心有三个：**解耦、异步、削峰**

### 解耦

* 比方、之前项目中我负责模块遇到这样一个场景。**A兼职系统**用户报名兼职，会调用**B商家报名单系统**查看商家的报名单（招聘道具）是否充足，如果不足需要通知**A兼职服务（mysql）**、**C兼职搜索引擎(ES)系统**暂停该商家下所有的招聘进行中的兼职，同时需要**推送系统D**将商家招聘道具不足进行推送、和**短信系统E**通知给商家手机上。最后将数据同步给**CRM销售系统F**进行同步。
* 目前我来梳理下这个场景。A系统查询给B系统，B系统同步回调A、C、D、E、F五个系统，都是通过接口调用发送。现在会发生这样场景 新增G系统也需要这个数据？那如果D系统现在不需要了呢？B系统负责人几乎崩溃...... 同样也无法维护迭代的成本很大

![动图1](https://fy-image.oss-cn-beijing.aliyuncs.com/images/用户报名兼职.png?versionId=CAEQGRiBgIDFmvq84xciIDRmMTIxYTliYWQ1NTRhNDY5OTk0YzdmMTU2NjA2ODY3)

* 在上面这个场景中，B系统与其他的系统严重耦合，B系统反馈商家报名单不足比较的信息，很多系统都需要B系统将这个信息同步过去。B系统需要关注A、C、D、E、F这五个系统挂了怎么办。需要做事务补偿或者重发，比较复杂了。

* 如果使用MQ，B系统产生一条数据，发送到MQ里面去，对应的系统需要数据自己去MQ里面消费。如果新系统E需要通知，直接从MQ里面消费即可；如果某个系统不需要这条数据了，就取消对MQ消息的消费即可。这样下来，B系统不需要去考虑要给谁发送数据，不需要维护这个代码，也不需要考虑人家是否调用成功、失败超时等情况。

![动图1](https://fy-image.oss-cn-beijing.aliyuncs.com/images/%E7%94%A8%E6%88%B7%E6%8A%A5%E5%90%8D%E5%85%BC%E8%81%8C%E6%B6%88%E6%81%AF%E9%80%9A%E7%9F%A5.png?versionId=CAEQGhiBgICqoLLI5BciIDY2N2E0ODQ1OGMzZTRiMDNiNjEwYzc4ZDQ1ZDU2ZGY5)

* **总结:** 通过一个 MQ，Pub/Sub 发布订阅消息这么一个模型，B系统就跟其它系统彻底解耦了

### 异步

* 在互联网中，对于用户直接的操作，要求都是在400ms以内处理完成，这样对用户的几乎是无感知的。
* 使用MQ，那么A系统联系发送2条消息到MQ队列中，假设耗时5ms，A系统从接受一个请求到返回响应给用户，总时长是3+5=8ms，对于用户而言，就好像只点了一个按钮，8ms以后就直接返回了，第一反应就是这个APP或者网站做的真好 哈哈！！（ps: 反正我平时就是这么评价App的）

### 削峰

* 正常情况下, 系统比较稳当。并发量并不是特别大，但是如果做活动或者第三方引流（支付宝引流）, 每秒并发请求量会增到8k+, 但是系统存储是直接基于MYSQL的，大量的请求涌入到Mysql，每秒钟对MYSQL执行8K条SQL.
* 一般情况下mysql扛到每秒2K并发量就到达瓶颈了。如果请求量直接打到8K，可能直接MYSQL挂掉了，导致整个系统崩溃。
* 但是一般到了中午12:00～14:00，就达到一个低峰期。请求量比较少对系统几乎没有任何压力.

![动图1](https://fy-image.oss-cn-beijing.aliyuncs.com/images/%E7%94%A8%E6%88%B7%E6%8A%A5%E5%90%8D%E5%85%BC%E8%81%8C%E6%B5%81%E7%A8%8B.png?versionId=CAEQGhiBgICn4qnI5BciIGZhNjU1ZDMwNTg4MjQ1NzdiMDkxNDAwYzcwYTUxN2Y3)

* 使用MQ，当每秒8K个请求写入MQ，系统每秒最多处理2K个请求，主要是在Mysql瓶颈上面。系统从MQ中慢慢拉取请求，每秒就能拉取2k个请求。就算在高峰时候，系统也绝对不会挂掉。 MQ每秒钟5k个请求进来，其中2k个请求出去，积压的请求在高峰期过去后，系统会快速将积压的消息给解决掉。

![动图1](https://fy-image.oss-cn-beijing.aliyuncs.com/images/%E7%94%A8%E6%88%B7%E6%8A%A5%E5%90%8D%E5%85%BC%E8%81%8C%E6%B5%81%E7%A8%8B2.png?versionId=CAEQGhiBgMDRuNLI5BciIDNiZmE1ZjFjOWZlMDRkYzU4M2FhM2ZhNWVlOWEzYTcw)

* **引入MQ后业务系统处理能力有限，将压力转嫁到MQ,消息堆积到MQ后可以慢慢进行消费.**
![动图1](https://my-blog-to-use.oss-cn-beijing.aliyuncs.com/2019-11/%E5%89%8A%E5%B3%B0-%E6%B6%88%E6%81%AF%E9%98%9F%E5%88%97.png)

## 消息队列有优缺点

### 优点

> [!note]
>
> 在特定场景下的好处，**解耦、异步、削峰**

### 缺点

#### 系统的可用性降低

> [!note]
>
> 系统引入的外部依赖越多，越容易挂掉。本来B系统调用 CDEFG 四个系统的接口就好了，加个 MQ 进来，万一MQ挂了，整套系统崩溃。需要保证消息队列的高可用，在引入MQ之后是需要考虑的。

#### 系统复杂度提高

> [!note]
>
> MQ进来，需要保证消息没有重复消费？怎么处理消息丢失的情况？怎么保证消息传递的顺序性等等问题。

#### 一致性问题

> [!note]
>
> B系统处理完了直接返回成功了，以为这个请求就成功了；但是问题是，要是CDEFG四个系统那里，CDE三个系统写库成功了，结果FG系统写库失败了，这数据就不一致了。

## RocketMQ基本概念

### 消息模型 （Message Model）

* RocketMQ主要由 Producer、Broker、Consumer 三部分组成，其中Producer 负责生产消息，Consumer 负责消费消息，Broker 负责存储消息。Broker 在实际部署过程中对应一台服务器，每个Broker可以存储多个Topic的消息，每个Topic的消息也可以分片存储于不同的 Broker。Message Queue 用于存储消息的物理地址，每个Topic中的消息地址存储于多个 Message Queue 中。ConsumerGroup 由多个Consumer 实例构成。

### 主题 （Topic）

* 表示一类消息的集合，每个主题包含若干条消息，每条消息只能属于一个主题，是RocketMQ进行消息订阅的基本单位。

### 广播消费 （Broadcasting）

* 广播消费模式下，相同Consumer Group的每个Consumer实例都接收全量的消息。

### 普通顺序消息 （Normal Ordered Message）

* 普通顺序消费模式下，消费者通过同一个消息队列（ Topic 分区，称作 Message Queue） 收到的消息是有顺序的，不同消息队列收到的消息则可能是无顺序的。

### 严格顺序消息 （Strictly Ordered Message）

* 严格顺序消息模式下，消费者收到的所有消息均是有顺序的。

### 消息 (Messsge)

* 消息系统所传输信息的物理载体，生产和消费数据的最小单位，每条消息必须属于一个主题。RocketMQ中每个消息拥有唯一的Message ID，且可以携带具有业务标识的Key。系统提供了通过Message ID和Key查询消息的功能。

## RocketMQ结构设计

### 架构图

![动图1](https://raw.githubusercontent.com/apache/rocketmq/master/docs/cn/image/rocketmq_architecture_1.png)

### 说明

> [!note]
>
> **RocketMQ架构主要分为四个部分:**

#### **Producer**

* 消息发布的角色，支持分布式集群方式部署。Producer通过MQ的负载均衡模块选择相应的Broker集群队列进行消息投递，投递的过程支持快速失败并且低延迟。

#### **Consumer**

* 消息消费的角色，支持分布式集群方式部署。支持以push推，pull拉两种模式对消息进行消费。同时也支持集群方式和广播方式的消费，提供实时消息订阅机制，满足大多数用户需求。

#### **NameServer**

* NameServicer是一个非常简单的Topic路由注册中心，其角色相当于Dubbo中的zookeeper（SpringCloud中的Eureka）, 支持Broker的动态注册与发现。主要包括两个功能: Broker管理，NameService接受Broker集群的注册信息并且保存下来作为路由信息的基本数据。然后提供心跳检测机制，检查Broker是否还存活；路由信息管理，每个NameService将保存关于Broker集群的整个路由信息和用于客户端查询的队列信息。然后Producer和Conumser通过NameServer就可以知道整个Broker集群的路由信息，从而进行消息的投递和消费。NameServer通常也是集群的方式部署，各实例间相互不进行信息通讯。Broker是向每一台NameServer注册自己的路由信息，所以每一个NameServer实例上面都保存一份完整的路由信息。当某个NameServer因某种原因下线了，Broker仍然可以向其它NameServer同步其路由信息，Producer, Consumer仍然可以动态感知Broker的路由的信息。

#### **BrokerServer**

> [!note]
>
> Broker主要负责消息的存储、投递和查询以及服务高可用保证，为了实现这些功能，Broker包含了以下几个重要子模块。

- **Remoting Module**：整个Broker的实体，负责处理来自clients端的请求。
- **Remoting Module**：整个Broker的实体，负责处理来自clients端的请求。
- **Client Manager**：负责管理客户端(Producer/Consumer)和维护Consumer的Topic订阅信息
- **Store Service**：提供方便简单的API接口处理消息存储到物理硬盘和查询功能。
- **HA Service**：高可用服务，提供Master Broker 和 Slave Broker之间的数据同步功能。
- **Index Service**：根据特定的Message key对投递到Broker的消息进行索引服务，以提供消息的快速查询。

![动图1](https://raw.githubusercontent.com/apache/rocketmq/master/docs/cn/image/rocketmq_architecture_2.png)

## 利用docker安装RocketMQ

### 安装namesrv

> [!note]
>
> 我们可以去docker官方网站，查找对应的rocketmq的镜像的地址。 <https://hub.docker.com/r/rocketmqinc/rocketmq>

#### 查询有哪些可用的rocketmq

```bash
docker search rocketmq
```

#### 拉取镜像

```bash
docker pull rocketmqinc/rocketmq
```

#### 启动namesrv服务(新建文件路径/opt/mydata/rocketmq)

```bash
## /opt/mydata/rocketmq 目录根据实际服务器中创建文件存放的日志和数据的地方

docker run -d -p 9876:9876 -v /opt/mydata/rocketmq/logs:/root/logs -v /opt/mydata/rocketmq/data:/root/store --name rmqnamesrv -e "MAX_POSSIBLE_HEAP=100000000" 09bbc30a03b6 sh mqnamesrv
```

### 安装broker

#### 创建配置文件 broker.conf

> [!note]
>
> 特别注意 ⚠️ brokerIP1,此处的坑比较大，设置的时候需要特别小心，对于mac电脑设置broker节点所在服务器的ip地址、物理ip，不能用127.0.0.1、localhost、docker内网ip 。可利用ifconfig的命令查看自己的电脑的服务的ip

```bash
  1 # 所属集群名称，如果节点较多可以配置多个
  2 brokerClusterName = DefaultCluster

  3 #broker名称，master和slave使用相同的名称，表明他们的主从关系
  4 brokerName = broker-a

  5 #0表示Master，大于0表示不同的slave
  6 brokerId = 0

  7 #表示几点做消息删除动作，默认是凌晨4点
  8 deleteWhen = 04

  9 #在磁盘上保留消息的时长，单位是小时
 10 fileReservedTime = 48

 11 #有三个值：SYNC_MASTER，ASYNC_MASTER，SLAVE；同步和异步表示Master和Slave之间同步数据的机制；
 12 brokerRole = ASYNC_MASTER

 13 #刷盘策略，取值为：ASYNC_FLUSH，SYNC_FLUSH表示同步刷盘和异步刷盘；SYNC_FLUSH消息写入磁盘后才返回成功
 14 状态，ASYNC_FLUSH不需要；
 15 flushDiskType = ASYNC_FLUSH

 16 # 设置broker节点所在服务器的ip地址、物理ip，不能用127.0.0.1、localhost、docker内网ip 
 17 brokerIP1 = 192.168.123.127                               
```

#### 启动broker容器

```bash
docker run -d  -p 10911:10911 -p 10909:10909   -v /opt/mydata/rocketmq/logs:/root/logs -v /opt/mydata/rocketmq/data:/root/store  -v /opt/mydata/rocketmq/conf/broker.conf:/opt/rocketmq/conf/broker.conf  --name rmqbroker --link rmqnamesrv:namesrv -e "NAMESRV_ADDR=namesrv:9876" -e "JAVA_OPTS=-Duser.home=/opt" -e "JAVA_OPT_EXT=-server -Xms1024m -Xmx1024m"  rocketmqinc/rocketmq sh mqbroker -c /opt/rocketmq/conf/broker.conf
```

### 安装控制台 rocket-console

#### 拉取rocket-console镜像

```bash
docker pull styletang/rocketmq-console-ng
```

#### 运行rocket-console镜像

```bash
docker run -e "JAVA_OPTS=-Drocketmq.config.namesrvAddr=192.168.123.127:9876 -Drocketmq.config.isVIPChannel=false" -p 9993:8080 -t styletang/rocketmq-console-ng
```

> [!note]
>
> 暴露端口号:9876、8080

### rocketmq控制台访问

#### gif动态图

![动图1](https://fy-image.oss-cn-beijing.aliyuncs.com/images/202010203.gif?versionId=CAEQGhiBgIDhsMvy5BciIDA4NGVhYWJhYmRhZTQwYTQ4ODgyOGJkY2YyMGEyNzgz)

## SpringBoot引入RocketMq

### 引入maven库

```xml
    <dependency>
        <groupId>org.apache.rocketmq</groupId>
        <artifactId>rocketmq-spring-boot-starter</artifactId>
        <version>2.1.1</version>
    </dependency>
    <dependency>
        <groupId>org.apache.rocketmq</groupId>
        <artifactId>rocketmq-client</artifactId>
        <version>4.8.0</version>
    </dependency>
    <dependency>
        <groupId>org.apache.rocketmq</groupId>
        <artifactId>rocketmq-common</artifactId>
        <version>4.8.0</version>
    </dependency>
```

### 封装配置文件

``` java
package com.java.xval.val.common.config;

import com.java.xval.val.common.RocketMqHelper;
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;


@ConditionalOnWebApplication
@Configuration(proxyBeanMethods = false)
public class RocketMqAutoConfiguration {

    @Bean
    public RocketMqHelper rocketMqHelper() {
        return new RocketMqHelper();
    }
}
```

### 配置启动的注解

``` java
package com.java.xval.val.common.constraints;

import com.java.xval.val.common.config.RocketMqAutoConfiguration;
import org.springframework.context.annotation.Import;

import java.lang.annotation.*;

/**
 * 开启RocketMq注解
 */
@Documented
@Retention(RetentionPolicy.RUNTIME)
@Target(ElementType.TYPE)
@Import({RocketMqAutoConfiguration.class})
public @interface EnableHyhRocketMq {
}
```

### 在SpringBoot启动类上添加注解启动

``` java
package com.java.xval.val;

import com.java.xval.val.common.constraints.EnableHyhRocketMq;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
@EnableHyhRocketMq
public class ValApplication {

    public static void main(String[] args) {
        SpringApplication.run(ValApplication.class, args);
    }

}
```

### 封装RocketMq工具类

```java
package com.java.xval.val.common;

import org.apache.rocketmq.client.producer.SendCallback;
import org.apache.rocketmq.client.producer.SendResult;
import org.apache.rocketmq.spring.core.RocketMQTemplate;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.messaging.Message;

import javax.annotation.PostConstruct;
import javax.annotation.PreDestroy;
import javax.annotation.Resource;


/**
 * 描述:
 * 〈RocketMq封装工具类〉
 *
 * @author fangyang
 * @since 2021-10-20
 */
public class RocketMqHelper {

    /**
     * 日志
     */
    private static final Logger LOG = LoggerFactory.getLogger(RocketMqHelper.class);

    /**
     * rocketmq模板注入
     */
    @Resource
    private RocketMQTemplate rocketMQTemplate;

    @PostConstruct
    public void init() {
        LOG.info("RocketMq开始实例化");
    }

    /**
     * 发送异步消息
     *
     * @param topic   消息Topic
     * @param message 消息实体
     */
    public void asyncSend(Enum topic, Message<?> message) {
        asyncSend(topic.name(), message, getDefaultSendCallBack());
    }


    /**
     * 发送异步消息
     *
     * @param topic        消息Topic
     * @param message      消息实体
     * @param sendCallback 回调函数
     */
    public void asyncSend(Enum topic, Message<?> message, SendCallback sendCallback) {
        asyncSend(topic.name(), message, sendCallback);
    }

    /**
     * 发送异步消息
     *
     * @param topic   消息Topic
     * @param message 消息实体
     */
    public void asyncSend(String topic, Message<?> message) {
        rocketMQTemplate.asyncSend(topic, message, getDefaultSendCallBack());
    }

    /**
     * 发送异步消息
     *
     * @param topic        消息Topic
     * @param message      消息实体
     * @param sendCallback 回调函数
     */
    public void asyncSend(String topic, Message<?> message, SendCallback sendCallback) {
        rocketMQTemplate.asyncSend(topic, message, sendCallback);
    }

    /**
     * 发送异步消息
     *
     * @param topic        消息Topic
     * @param message      消息实体
     * @param sendCallback 回调函数
     * @param timeout      超时时间
     */
    public void asyncSend(String topic, Message<?> message, SendCallback sendCallback, long timeout) {
        rocketMQTemplate.asyncSend(topic, message, sendCallback, timeout);
    }

    /**
     * 发送异步消息
     *
     * @param topic        消息Topic
     * @param message      消息实体
     * @param sendCallback 回调函数
     * @param timeout      超时时间
     * @param delayLevel   延迟消息的级别
     */
    public void asyncSend(String topic, Message<?> message, SendCallback sendCallback, long timeout, int delayLevel) {
        rocketMQTemplate.asyncSend(topic, message, sendCallback, timeout, delayLevel);
    }

    /**
     * 发送顺序消息
     *
     * @param message 消息实体
     * @param topic   消息Topic
     * @param hashKey 为了保证到同一个队列中，将消息发送到orderTopic主题上
     *                他的hash值计算发送到哪一个队列，用的是同一个值,那么他们的hash一样就可以保证发送到同一个队列里
     */
    public void syncSendOrderly(Enum topic, Message<?> message, String hashKey) {
        syncSendOrderly(topic.name(), message, hashKey);
    }


    /**
     * 发送顺序消息
     *
     * @param message 消息实体
     * @param topic   消息Topic
     * @param hashKey 为了保证到同一个队列中，将消息发送到orderTopic主题上
     *                他的hash值计算发送到哪一个队列，用的是同一个值,那么他们的hash一样就可以保证发送到同一个队列里
     */
    public void syncSendOrderly(String topic, Message<?> message, String hashKey) {
        LOG.info("发送顺序消息，topic:" + topic + ",hashKey:" + hashKey);
        rocketMQTemplate.syncSendOrderly(topic, message, hashKey);
    }

    /**
     * 发送顺序消息
     *
     * @param message 消息实体
     * @param topic   消息Topic
     * @param hashKey 为了保证到同一个队列中，将消息发送到orderTopic主题上
     *                他的hash值计算发送到哪一个队列，用的是同一个值,那么他们的hash一样就可以保证发送到同一个队列里
     * @param timeout 延时时间
     */
    public void syncSendOrderly(String topic, Message<?> message, String hashKey, long timeout) {
        LOG.info("发送顺序消息，topic:" + topic + ",hashKey:" + hashKey + ",timeout:" + timeout);
        rocketMQTemplate.syncSendOrderly(topic, message, hashKey, timeout);
    }

    /**
     * 默认CallBack函数
     *
     * @return SendCallback
     */
    private SendCallback getDefaultSendCallBack() {
        return new SendCallback() {
            @Override
            public void onSuccess(SendResult sendResult) {
                LOG.info("---发送MQ成功---");
            }

            @Override
            public void onException(Throwable throwable) {
                LOG.error("---发送MQ失败---" + throwable.getMessage(), throwable.getMessage());
            }
        };
    }


    @PreDestroy
    public void destroy() {
        LOG.info("---RocketMq注销---");
    }

}

```

### 添加配置文件

```yml
#rocketmq配置
rocketmq:
  name-server: localhost:9876
  # 生产者配置
  producer:
    isOnOff: on
    # 发送同一类消息的设置为同一个group，保证唯一
    group: hyh-rocketmq-group
    groupName: hyh-rocketmq-group
    # 服务地址
    namesrvAddr: localhost:9876
    # 消息最大长度 默认1024*4(4M)
    maxMessageSize: 4096
    # 发送消息超时时间,默认3000
    sendMsgTimeout: 3000
    # 发送消息失败重试次数，默认2
    retryTimesWhenSendFailed: 2
```

### 测试功能需求

#### 消息发送测试代码如下（示例）

```java
package com.java.xval.val.controller;


import com.java.xval.val.common.RocketMqHelper;
import com.java.xval.val.common.api.CommonResult;
import com.java.xval.val.model.Person;
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.bind.annotation.RestController;

import javax.annotation.Resource;

@RestController
@RequestMapping(value = "/message/send")
public class RocketMqController {

    @Resource
    private RocketMqHelper rocketMqHelper;

    private static final Integer NUM = 10;

    /**
     * 发送异步消息
     *
     * @return the CommonResult
     */
    @RequestMapping(value = "/asyncSend", method = RequestMethod.GET)
    public CommonResult<String> asyncSend() {
        Person person = new Person();
        person.setName("Java开发");
        person.setAge(25);
        rocketMqHelper.asyncSend("PERSON_ADD", MessageBuilder.withPayload(person).build());
        return CommonResult.success("发送异步消息发送成功");
    }


    /**
     * 发送同步有序的消息.
     *
     * @return CommonResult
     */
    @RequestMapping(value = "/syncSendOrderly", method = RequestMethod.GET)
    public CommonResult<String> syncSendOrderly() {
        String message = "orderly message: ";
        for (int i = 0; i < NUM; i++) {
            // 模拟有序发送消息
            rocketMqHelper.syncSendOrderly("topic-orderly", MessageBuilder.withPayload(message + i).build(), "select_queue_key");
        }
        return CommonResult.success("同步有序消息发送成功");

    }
}
```

#### 消息监听代码如下（示例）

##### 异步消息接收代码

``` java
package com.java.xval.val.common.listener;

import com.java.xval.val.model.Person;
import lombok.extern.slf4j.Slf4j;
import org.apache.rocketmq.spring.annotation.RocketMQMessageListener;
import org.apache.rocketmq.spring.core.RocketMQListener;
import org.springframework.stereotype.Component;


@Slf4j
@Component
@RocketMQMessageListener(consumerGroup = "${rocketmq.producer.groupName}", topic = "PERSON_ADD")
public class PersonMqListener implements RocketMQListener<Person> {

    @Override
    public void onMessage(Person person) {
        log.info("#PersonMqListener接收到消息，开始消费..name:" + person.getName() + ",age:" + person.getAge());
    }
}
```

##### 同步有序的消息代码

``` java
package com.java.xval.val.common.listener;


import lombok.extern.slf4j.Slf4j;
import org.apache.rocketmq.spring.annotation.ConsumeMode;
import org.apache.rocketmq.spring.annotation.RocketMQMessageListener;
import org.apache.rocketmq.spring.core.RocketMQListener;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RocketMQMessageListener(topic = "topic-orderly", consumerGroup = "orderly-consumer-group", consumeMode = ConsumeMode.ORDERLY)
public class OrderMqListener implements RocketMQListener<String> {

    @Override
    public void onMessage(String s) {
        log.info("#OrderMqListener接收到消息，开始消费.message={}:", s);
    }
}
```

#### 请求示例图

