# RocketMQ分布式事务

## 分布式事务概念

> [!note]
>
> - 1.在微服务架构下，由于数据库和应用服务的拆分，导致原本一个事务单元中的多个DML操作，变成了跨服务、跨数据库的多个事务单元的多个DML操作，而传统的数据库事务无法解决这类的问题，所以就引出了分布式事务的概念。
>
> - 2.分布式事务本质上要解决的就是跨网络节点的多个事务的数据一致性问题，业内常见的解决方法有两种
>
> - （1）强一致性，就是所有的事务参与者要么全部成功，要么全部失败，全局事务协调者需要知道每个事务参与者的执行状态，再根据状态来决定数据的提交或者回滚！
>
> - （2）最终一致性，也叫弱一致性，也就是多个网络节点的数据允许出现不一致的情况，但是在最终的某个时间点会达成数据一致。基于CAP定理我们可以知道，强一致性方案对于应用的性能和可用性会有影响，所以对于数据一致性要求不高的场景，就会采用最终一致性算法。
>
> - 3.在分布式事务的实现上，对于强一致性，我们可以通过基于XA协议下的二阶段提交来实现，对于弱一致性，可以基于TCC事务模型、消息队列模型等方案来实现。
>
> - 4.市面上有很多针对这些理论模型实现的分布式事务框架，我们可以在应用中集成这些框架来实现分布式事务。

> **分布式事务就是指事务的参与者、支持事务的服务器、资源服务器以及事务管理器分别位于不同的分布式系统的不同节点之上** 简单的来说，就是一次大的操作由不同的小操作组成，这些小的操作那么全部成功，要么全部失败。分布式事务就是为了保证不同的数据库的数据一致性.

## 前言

> 目前分布式事务是还没有彻底的解决的难题，在考虑到实现方案前。需要考虑到当前项目是不是真的需要追求强的一致性。参考<font color=red>**BASE**</font>理论，在分布式系统中，允许不同的服务节点在同步过程中存在延时，但可以经过一段时间修复，能达到数据的最终一致性。

* <font color=red> **此文是依赖已有代码基础。本地代码已上传 [**远程仓库**](https://github.com/BenjaminFyang/javaVal.git) <https://github.com/BenjaminFyang/javaVal.git>** </font>

### 强一致性

* 考虑XA协议，通过二阶段提交或者三阶段提交来保证。实现起来对代码侵入性比较强

### 最终一致性

* 考虑采用 TCC 模式，补偿模式，或者基于消息队列的模式。基于消息队列模式，可以采用 <font color=red>**RocketMQ**</font>，下面我将介绍RocketMQ在分布式系统中事务中的使用。
  
* <font color=red>**重点: Rocketmq考虑的是数据最终一致性。上游服务提交之后，下游服务最终只能成功，做不到回滚上游数据**</font>
  
> 比如有个订单服务，订单服务下面存在积分服务、商品服务、优惠券服务等。下订单的同时需要通知积分服务增加积分、商品服务减少预售库存、去优惠券服务查询订单是否有可用的优惠券。使用消息队列最终一致性可能有这么一种情况，积分服务和优惠券服务调用成功，但是对应的后台服务商品库存不足为0扣减失败情况下、如何回滚订单、积分、优惠券服务数据。消息队列下游服务最终只能成功，做不到回滚上游数据。显然可以看出使用消息队列最终数据最终一致性，是存在使用局限的。

### [**阿里开源的Seata**](http://seata.io/zh-cn/docs/overview/what-is-seata.html)

> 不过我个人安利推荐使用下阿里开源Seata，是一款开源的分布式事务解决方案，致力于提供高性能和简单易用的分布式事务服务。<font color=red>**Seata 将为用户提供了AT、TCC、SAGA 和XA事务模式**</font>

## 麒麟系统架构图

![动图1](https://fy-image.oss-cn-beijing.aliyuncs.com/images/%E9%BA%92%E9%BA%9F%E7%B3%BB%E7%BB%9F%E6%9C%8D%E5%8A%A1%E6%9E%B6%E6%9E%84%E5%9B%BE%20.png?versionId=CAEQGhiBgMC7zaCg5RciIGExYTllNjhjMzRhYjQ5MGI4ZmQ0ZTQzYzc0MDQzMmY2)

> 如上图所示目前操作一次麒麟系统流程是需要跨各个不同的服务进行交互。要保证这些不同的系统之间操作的数据要么全部成功要么全部失败，控制好分布式事务是很重要的。下面主要是讲解RocketMQ事务分布式事务的处理原理和方式。

## RocketMQ事务消息

* Apache RocketMQ在4.3.0版中已经支持分布式事务消息，这里RocketMQ采用了2PC的思想来实现了提交事务消息，同时增加一个补偿逻辑来处理二阶段超时或者失败的消息，如下图所示

![动图1](https://img2020.cnblogs.com/blog/584866/202109/584866-20210913112245127-628282584.png)

### RocketMQ事务消息流程概要

> 上图说明了事务消息的大致方案, 其中分为两个流程: 正常事务消息的发送及提交、事务消息的补偿流程。

#### 事务消息发送及提交

* 1、发送消息（half消息）.
* 2、服务端响应消息写入结果。
* 3、根据发送结果执行本地事务（如果写入失败，<font color=red>**此时half消息对业务不可见**</font>，本地逻辑不执行）
* 4、根据本地事务状态执行Commit或者Rollback（Commit操作生成消息索引， <font color=red>**消息对消费者可见**</font>）

#### 补偿流程

* 5、对没有Commit/Rollback的事务消息（pending状态的消息），定时任务从服务端发起一次“回查”。
* 6、Producer收到回查消息，检查回查消息对应的本地事务的状态。
* 7、根据本地事务状态，重新Commit或者Rollback。

> 其中、补偿阶段用于解决消息Commit或者Rollback发生超时或者失败的情况。

### RocketMQ事务消息设计

#### 一阶段：Prepared阶段（预备阶段）事务消息在一阶段对用户不可见

* 发送half消息，将<font color=red>**备份原消息**</font>的主题与消息消费队列，然后改变主题为RMQ_SYS_TRANS_HALF_TOPIC
* 消费组未订阅该主题，故消费端无法消费half类型的消息，然后RocketMQ会开启一个定时任务，从Topic为RMQ_SYS_TRANS_HALF_TOPIC中拉取消息进行消费，根据生产者组获取一个服务提供者发送回查事务状态请求，根据事务状态来决定是提交或回滚消息。

#### 二阶段：Commit和Rollback操作（确认阶段）

* **Commit** : 在完成一阶段写入一条对用户不可见的消息后，二阶段如果是Commit操作，则需要让消息对用户可见；
* **Rollback** : 需要撤销一阶段的消息。对于Rollback，本身一阶段的消息对用户是不可见的，其实不需要真正撤销消息。

> RocketMQ <font color=red>**引入了Op消息**</font> 的概念，用Op消息<font color=red>**标识事务消息已经确定状态**</font> （Commit或者Rollback）。如果一条事务消息没有对应的Op消息，说明这个事务的状态还无法确定（可能是二阶段失败了）。引入Op消息后，事务消息无论是Commit或者Rollback都会记录一个Op操作。Commit相对于Rollback只是在写入Op消息前创建Half消息的索引（可以被消费者消费到）。

#### Op消息的存储和对应关系

* RocketMQ将Op消息写入到全局一个特定的Topic中通过源码中的方法—TransactionalMessageUtil.buildOpTopic()；这个Topic是一个内部的Topic（像Half消息的Topic一样），不会被用户消费。<font color=red>**Op消息的内容为对应的Half消息的存储的Offset**</font>，这样通过Op消息能索引到Half消息进行后续的回查操作.

![动图1](https://img2020.cnblogs.com/blog/584866/202109/584866-20210915111714783-512677287.png)

#### Half消息的索引构建

> 在执行二阶段Commmit操作时，需要构建出Half消息的消息的索引。一阶段的Half消息由于是写入到一个特殊的Topic，所以二阶段构建索引时需要读取出Half消息，并将Topic和Queue替换成真正的目标的Topic和Queue，之后通过一次普通的写入操作来生成一条对用户可见的消息。所以<font color=red>RocketMQ事务消息二阶段其实是利用了一阶段储存的消息的内容，在二阶段时恢复出一条完整的普通消息，然后走一遍消息写入流程</font>。

#### 如何处理二阶段失败的消息？

* 如果在RocketMQ事务消息的二阶段过程中失败了, 例如在做Commit操作时，出现网络问题导致Commit失败，那么需要通过一定的策略使这条消息最终被Commit。RocketMQ采用了一种补偿机制，称为“回查”。Broker端对未确定状态的消息发起回查，将消息发送到对应的Producer端（同一个Group的Producer），由Producer根据消息来检查本地事务的状态，进而执行Commit或者Rollback。Broker端通过对比Half消息和Op消息进行事务消息的回查并且推进CheckPoint（记录那些事务消息的状态是确定的）。

> <font color=red>**Rocketmq并不会无休止的的信息事务状态回查，默认回查15次，如果15次回查还是无法得知事务状态，rocketmq默认回滚该消息。**</font>

## RocketMQ事务方案

### 下单流程示意图

* 下单代码就以 <font color=red>**订单服务、积分服务**</font>为例子
* 首先看下具体的业务场景: 用户购买商品后，需要生成对应的订单和增加对应的会员积分

![动图1](https://fy-image.oss-cn-beijing.aliyuncs.com/images/%E7%94%A8%E6%88%B7%E4%B8%8B%E5%8D%95%E9%80%BB%E8%BE%91%E5%A4%84%E7%90%86%E6%B5%81%E7%A8%8B.png?versionId=CAEQGhiBgMCt0bfc5RciIDQ5ZmQwMDBkNDFkZDRmZjc4MDYxYzU5MWM1NTU2Yjcw)

### 流程梳理

* 1、在下单之前，先发送预备消息
* 2、发送预备消息成功后, <font color=red>**执行本地下单事务**</font>
* 3、本地下单成功后，<font color=red>**在发送确认消息**</font>  
* 4、消息端（积分业务）可以看到确认消息，<font color=red>**消费消息，进行增加积分**</font>  

### 消息异常情况

* **异常一** 发送预备消息失败，下面的流程不会走下去；这个是正常的
* **异常二** 发送预备消息成功，但是执行本地事务失败；这个也是正常的，<font color=red>**预备消息不会被消费端订阅到，消费端不会执行业务**</font>=
* **异常三** 如果发送预备消息成功，执行本地事务成功，但是发送确认消息失败，这个就是问题。例: 用户下订单成功了，但是用户对应的积分却没有增加。<font color=red>**出现了数据不一致**</font>

### RocketMq回查

![动图1](https://fy-image.oss-cn-beijing.aliyuncs.com/images/RocketMq%E6%B6%88%E6%81%AF%E5%9B%9E%E6%9F%A5.png?versionId=CAEQGhiBgMCh3oHe5RciIDE2YWUyMTgxZGU5MTQ1ZmVhZWRhNzRmMzcxNjNhZWU0)

* RocketMq利用了 **状态回查**来解决异常三出现的情况，也就是说RocketMq会定时遍历commitlog中的预备消息。

> 预备消息最终会**变成变为commit消息或Rollback消息**，在定时执行遍历预备消息回查本地业务的执行状态，如果<font color=red>**发现本地业务没有执行成功就rollBack，如果执行成功就发送commit消息**</font>

* 对于上面的异常3，发送预备消息成功，本地就创建订单，但是发送确认消息失败；因为 **RocketMq会进行回查预备消息**，在回查过程中发现 **本地的订单已经创建成功了**，就补发**发送commit确认消息**，后续的积分系统就可以订阅到此消息了。同样在异常2的情况中发现**本地订单事务没有执行成功，就会触发RollBack确认消息，把消息进行删除**。

## SpringBoot整合RocketMQ

### 订单服务

#### 事务日志表

```sql
CREATE TABLE `transaction_log` (
  `id` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT '事务ID',
  `business` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT '业务标识',
  `foreign_key` varchar(32) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL COMMENT '对应业务表中的主键',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_bin;
```

* transaction_log主要是用于事务的回查。当提交业务数据时候，会向这张表也插入一条数据。是出于同一个本地的事务中。通过事务ID查询该表，如果返回记录，则证明本地事务已提交；如果未返回记录，则本地事务可能是未知状态或者是回滚状态。

#### 事务发送实例

> 主要就是创建事务消息的发送者。在这里，我们重点关注 OrderTransactionListener，它负责执行本地事务和事务状态回查。

```java
package com.java.xval.val.mq;

import com.java.xval.val.service.listenerTransaction.OrderTransactionListener;
import org.springframework.stereotype.Component;

import javax.annotation.PostConstruct;
import javax.annotation.Resource;
import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;

/**
 * 订单事务监听器.
 */
@Component
public class OrderTransactionProducer extends TransactionProducer {

    // 用于执行本地事务和事务状态回查的监听器 需要自定义事务监听器 用于事务的二次确认和事务回查
    @Resource
    private OrderTransactionListener orderTransactionListener;

    // 官方建议自定义线程 给线程取自定义名称 发现问题更好排查
    private final ExecutorService executorService = new ThreadPoolExecutor(2, 5, 100, TimeUnit.SECONDS, new ArrayBlockingQueue<>(200), r -> {
        Thread thread = new Thread(r);
        thread.setName("client-transaction-producer-check-thread");
        return thread;
    });

    // Spring容器启动的时候初始化订单事务监听器.
    @PostConstruct
    public void buildInit() {
        init(orderTransactionListener, executorService);
    }
}
```

```java
package com.java.xval.val.mq;

import com.java.xval.val.common.config.RocketMqDataConfig;
import org.apache.rocketmq.client.exception.MQClientException;
import org.apache.rocketmq.client.producer.TransactionListener;
import org.apache.rocketmq.client.producer.TransactionMQProducer;
import org.apache.rocketmq.client.producer.TransactionSendResult;
import org.apache.rocketmq.common.message.Message;
import org.springframework.stereotype.Component;

import javax.annotation.Resource;
import java.util.concurrent.ExecutorService;

@Component
public class TransactionProducer {

    private TransactionMQProducer transactionMQProducer;

    @Resource
    private RocketMqDataConfig rocketMqDataConfig;

    /**
     * 启动监听器
     *
     * @param transactionListener 事务监听器
     * @param executorService     自定义线程池<根据不同的场景定义>
     */
    public void init(TransactionListener transactionListener, ExecutorService executorService) {
        transactionMQProducer = new TransactionMQProducer(rocketMqDataConfig.getOrderTopic());
        transactionMQProducer.setNamesrvAddr(rocketMqDataConfig.getNameServer());
        transactionMQProducer.setSendMsgTimeout(Integer.MAX_VALUE);
        transactionMQProducer.setExecutorService(executorService);
        transactionMQProducer.setTransactionListener(transactionListener);
        this.start();
    }

    /**
     * 启动
     * 对象在使用之前必须要调用一次，只能初始化一次
     */
    private void start() {
        try {
            this.transactionMQProducer.start();
        } catch (MQClientException e) {
            e.printStackTrace();
        }
    }

    /**
     * 事务消息发送
     *
     * @param data  消息发送对象.
     * @param topic 消息队列的主题.
     * @return the TransactionSendResult
     * @throws MQClientException 对应的异常的抛出.
     */
    public TransactionSendResult send(String data, String topic) throws MQClientException {
        Message message = new Message(topic, data.getBytes());
        return this.transactionMQProducer.sendMessageInTransaction(message, null);
    }
}
```

#### 自定义事务监听器

```java
package com.java.xval.val.service.listenerTransaction;

import com.alibaba.fastjson.JSON;
import com.alibaba.fastjson.JSONObject;
import com.java.xval.val.model.Order;
import com.java.xval.val.service.OrderService;
import com.java.xval.val.service.TransactionLogService;
import org.apache.commons.lang3.StringUtils;
import org.apache.rocketmq.client.producer.LocalTransactionState;
import org.apache.rocketmq.client.producer.TransactionListener;
import org.apache.rocketmq.common.message.Message;
import org.apache.rocketmq.common.message.MessageExt;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import javax.annotation.Resource;

/**
 * 订单分布式事务RocketMQ 生产者
 */
@Component
public class OrderTransactionListener implements TransactionListener {

    @Resource
    private OrderService orderService;

    @Resource
    private TransactionLogService transactionLogService;

    Logger logger = LoggerFactory.getLogger(this.getClass());

    @Override
    public LocalTransactionState executeLocalTransaction(Message message, Object o) {

        //  本地事务执行会有三种可能
        //  1、commit 成功
        //  2、Rollback 失败
        //  3、网络等原因服务宕机收不到返回结果
        //  执行创建订单的本地事务，这里完成订单数据和事务日志的插入.
        logger.info("OrderTransactionListener开始执行本地事务message={}....", JSON.toJSONString(message));
        LocalTransactionState state;
        try {
            String body = new String(message.getBody());
            Order order = JSONObject.parseObject(body, Order.class);
            orderService.create(order, message.getTransactionId());
            state = LocalTransactionState.COMMIT_MESSAGE;
            logger.info("OrderTransactionListener本地事务已提交。{}", message.getTransactionId());
        } catch (Exception e) {
            logger.info("OrderTransactionListener执行本地事务失败", e);
            state = LocalTransactionState.ROLLBACK_MESSAGE;
        }
        return state;
    }

    /**
     * 只有上面接口返回 LocalTransactionState.UNKNOW 才会调用查接口被调用
     *
     * @param messageExt the messageExt
     * @return LocalTransactionState 事务状态.
     * @see org.apache.rocketmq.client.producer.LocalTransactionState
     */
    @Override
    public LocalTransactionState checkLocalTransaction(MessageExt messageExt) {

        // 因为有种情况就是：上面本地事务执行成功了，但是return LocalTransactionState.COMMIT_MESSAG的时候服务挂了，那么最终 Brock还未收到消息的二次确定，还是个预消息，所以当重新启动的时候还是回调这个回调接口。
        // 如果不先查询上面本地事务的执行情况 直接在执行本地事务，那么就相当于成功执行了两次本地事务了。
        logger.info("OrderTransactionListener开始回查本地事务状态{}", messageExt.getTransactionId());
        LocalTransactionState state;
        String transactionId = messageExt.getTransactionId();

        if (StringUtils.isNotBlank(transactionLogService.get(transactionId))) {
            state = LocalTransactionState.COMMIT_MESSAGE;
        } else {
            state = LocalTransactionState.UNKNOW;
        }
        logger.info("OrderTransactionListener结束本地事务状态查询：{}", state);
        return state;
    }
}

```

* 通过transactionMQProducer.sendMessageInTransaction消息发送成功后，会调用executeLocalTransaction(Message message, Object o)方法，执行本地事务，订单数据和事务日志在这里完成插入.

#### LocalTransactionState本地事务状态枚举解析

* **1、COMMIT_MESSAGE**: 提交事务消息，消费者可以看到此消息
* **2、ROLLBACK_MESSAGE**: 回滚事务消息，消费者不会看到此消息
* **3、UNKNOW**: 事务未知状态，需要调用事务状态回查，确定此消息是提交还是回滚

> <font color=red>**checkLocalTransaction(MessageExt messageExt)**</font>方法就是用于事务状态的查询，上面的例子中通过事务的ID查询表<font color=red>**transaction_log**</font>，如果可以查询到结果，就提交事务消息；如果没有查询到，就返回事务未知状态。

#### 业务订单实现类

```java
package com.java.xval.val.service.impl;

import com.alibaba.fastjson.JSON;
import com.java.xval.val.mapper.OrderMapper;
import com.java.xval.val.mapper.TransactionLogMapper;
import com.java.xval.val.model.Order;
import com.java.xval.val.model.TransactionLog;
import com.java.xval.val.mq.MqConstant;
import com.java.xval.val.mq.OrderTransactionProducer;
import com.java.xval.val.service.OrderService;
import org.apache.rocketmq.client.exception.MQClientException;
import org.apache.rocketmq.client.producer.TransactionSendResult;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import javax.annotation.Resource;

/**
 * 订单业务实现类
 */
@Service
public class OrderServiceImpl implements OrderService {

    private static final Logger LOGGER = LoggerFactory.getLogger(OrderServiceImpl.class);

    @Resource
    private OrderMapper orderMapper;

    @Resource
    private TransactionLogMapper transactionLogMapper;

    @Resource
    private OrderTransactionProducer orderTransactionProducer;

    Logger logger = LoggerFactory.getLogger(this.getClass());

    @Override
    @Transactional(rollbackFor = Exception.class)
    public void create(Order order, String transactionId) {

        LOGGER.info("OrderServiceImpl开始进行下单的操作={},transactionId={}", JSON.toJSONString(order), transactionId);

        // 1、本应用创建订单
        orderMapper.create(order);

        // 2.写入事务日志
        TransactionLog log = new TransactionLog();
        log.setId(transactionId);
        log.setBusiness(MqConstant.Top.USER_ORDER_TOPIC);
        log.setForeignKey(String.valueOf(order.getId()));
        transactionLogMapper.insert(log);
        logger.info("OrderServiceImpl订单创建完成={}", order);
    }

    @Override
    public void createOrder(Order order) throws MQClientException {
        TransactionSendResult transactionSendResult = orderTransactionProducer.send(JSON.toJSONString(order), MqConstant.Top.USER_ORDER_TOPIC);
        transactionSendResult.getSendStatus();
    }
}
```

### 积分系统

#### 积分对应的订单的消费者监听启动

```java
package com.java.xval.val.mq;

import com.java.xval.val.common.config.RocketMqDataConfig;
import com.java.xval.val.service.listenerTransaction.PointTransactionListener;
import org.apache.rocketmq.client.consumer.DefaultMQPushConsumer;
import org.apache.rocketmq.client.exception.MQClientException;
import org.springframework.stereotype.Component;

import javax.annotation.PostConstruct;
import javax.annotation.Resource;

/**
 * 订单消费者监听
 */
@Component
public class PointProductConsumer {

    @Resource
    private RocketMqDataConfig rocketMqDataConfig;

    @Resource
    private PointTransactionListener orderListener;

    @PostConstruct
    public void init() throws MQClientException {
        DefaultMQPushConsumer defaultMQPushConsumer = new DefaultMQPushConsumer(MqConstant.ConsumeGroup.USER_ORDER_GROUP);
        defaultMQPushConsumer.setNamesrvAddr(rocketMqDataConfig.getNameServer());
        defaultMQPushConsumer.subscribe(MqConstant.Top.USER_ORDER_TOPIC, "*");
        defaultMQPushConsumer.registerMessageListener(orderListener);
        defaultMQPushConsumer.start();
    }

}
```

* 需要指定一个消费的topic和监听器就好了.

#### 积分消费者监听器

```java
package com.java.xval.val.service.listenerTransaction;

import com.alibaba.fastjson.JSONObject;
import com.java.xval.val.model.Order;
import org.apache.rocketmq.client.consumer.listener.ConsumeConcurrentlyContext;
import org.apache.rocketmq.client.consumer.listener.ConsumeConcurrentlyStatus;
import org.apache.rocketmq.client.consumer.listener.MessageListenerConcurrently;
import org.apache.rocketmq.common.message.MessageExt;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import java.util.List;

@Component
public class PointTransactionListener implements MessageListenerConcurrently {

    Logger logger = LoggerFactory.getLogger(this.getClass());

    @Override
    public ConsumeConcurrentlyStatus consumeMessage(List<MessageExt> list, ConsumeConcurrentlyContext context) {
        logger.info("消费者线程监听到消息。");
        try {
            for (MessageExt message : list) {
                logger.info("开始处理订单数据，准备增加积分....");
                Order order = JSONObject.parseObject(message.getBody(), Order.class);
                if (!processor(message)) {
                    return ConsumeConcurrentlyStatus.RECONSUME_LATER;
                }

                // todo 开始插入对应的积分数据.
                logger.info("开始插入积分数据，增加积分....");
            }
            return ConsumeConcurrentlyStatus.CONSUME_SUCCESS;
        } catch (Exception e) {
            logger.error("处理消费者数据发生异常", e);
            return ConsumeConcurrentlyStatus.RECONSUME_LATER;
        }
    }

    /**
     * 消息处理，第3次处理失败后，发送邮件或者短信通知人工介入
     *
     * @param message the message
     * @return boolean
     */
    private boolean processor(MessageExt message) {
        String body = new String(message.getBody());
        try {
            logger.info("PointTransactionListener消息处理....{}", body);
            int k = 1 / 0;
            return true;
        } catch (Exception e) {
            if (message.getReconsumeTimes() >= 3) {
                logger.error("PointTransactionListener消息重试已达最大次数，将通知业务人员排查问题。{}", message.getMsgId());
                // todo 发送短信或者邮件通知.
                return true;
            }
            return false;
        }
    }
}
```

#### 幂等性

* 1、执行前可以先查询此订单是否已经执行过
* 2、额外增加一张表来进行记录
* 3、放到redis缓存里，在入库之前先查询缓存

#### 消费异常

> 消费者处理失败后会返回 RECONSUME_LATER ，让消息来重试，默认最多重试16次

* 可以在消费者端设置这个次数。

```java
//设置消息重试最大次数
consumer.setMaxReconsumeTimes(3);
```

![动图1](https://fy-image.oss-cn-beijing.aliyuncs.com/Oct-26-2021%2014-40-18222.gif?versionId=CAEQGhiBgICVv6rt5RciIGQ5MzcxZDNkYWYzZTQ2ZTg5MTUwY2IyZWM1ZDM2ZDhj)

#### 查看RocketMQ控制台情况

![动图1](https://fy-image.oss-cn-beijing.aliyuncs.com/Oct-26-2021%2014-45-547777.gif?versionId=CAEQGhiBgMDnoLPt5RciIGFiMmQyZTU5NzlkYjRjZTc4ODIxMGJiYmQxMTVkYWNl)

## 重点

### RocketMQ处理事务的局限性

* **1、Rocketmq考虑的是数据最终一致性。上游服务提交之后，下游服务最终只能成功，做不到回滚上游数据。**
* **2、创建订单➕扣减库存，比如producer端是订单的创建，创建好发送消息到库存服务，库存扣减，但是库存为0扣减失败。这个时候RocketMQ是不支持数据TCC回滚的。针对这样的情况可以考虑使用阿里的Seata**
