# aibaba服务容错Sentinel

## Sentinel是什么

> [!note]
>
> <https://sentinelguard.io/zh-cn/docs/introduction.html>
> 
> Sentinel 是面向分布式服务架构的高可用防护组件，主要以流量为切入点，从流量控制、熔断降级、系统自适应保护等多个维度来帮助用户保障微服务的稳定性
>
> 随着微服务的流行，服务和服务之间的稳定性变得越来越重要。**Sentinel** 以流量为切入点，从流量控制、熔断降级、系统负载保护等多个维度保护服务的稳定性。
>
![动图1](https://user-images.githubusercontent.com/9434884/50505538-2c484880-0aaf-11e9-9ffc-cbaaef20be2b.png)

## 组成

Sentinel分为两个部分:

* 1、**核心库**（Java 客户端）不依赖任何框架/库，能够运行于所有 Java 运行时环境，同时对 Dubbo / Spring Cloud 等框架也有较好的支持。
* 2、**控制台**（Dashboard）基于 Spring Boot 开发，打包后可以直接运行，不需要额外的 Tomcat 等应用容器。

## 安装sentinel

### 下载

> 版本v1.8.3  <https://github.com/alibaba/Sentinel/releases/download/1.8.3/sentinel-dashboard-1.8.3.jar>

```bash
# 下载
➜  webApp wget https://github.com/alibaba/Sentinel/releases/download/1.8.3/sentinel-dashboard-1.8.3.jar 
```

### 启动

```bash
# 启动
java -Dserver.port=7070 -Dcsp.sentinel.dashboard.server=localhost:7070 -Dproject.name=sentinel-dashboard -jar sentinel-dashboard-1.8.3.jar 
```

### 访问界面

> [!note]
>
> 地址 <http://localhost:7070/> 默认账号密码 「sentinel / sentinel」

![动图1](https://fy-image.oss-cn-beijing.aliyuncs.com/y01WechatIMG161.png)

## 流量控制

### pom文件引入新的依赖

```xml
  <!-- 引入 Spring Cloud Alibaba Sentinel 相关依赖，使用 Sentinel 提供服务保障，并实现对其的自动配置 -->
        <dependency>
            <groupId>com.alibaba.cloud</groupId>
            <artifactId>spring-cloud-starter-alibaba-sentinel</artifactId>
        </dependency>
```

### 配置文件结构

```yaml
server:
  port: 9866 #对应服务的端口号

spring:
  application:
    name: alibaba-sentinel-service # Spring 应用名

  cloud:
    sentinel: # Sentinel 配置项，对应 SentinelProperties 配置属性类
      enabled: true # 是否开启。默认为 true 开启
      eager: true # 是否饥饿加载。默认为 false 关闭
      transport:
        dashboard: 127.0.0.1:7070 # Sentinel 控制台地址
      filter:
        url-patterns: /** # 拦截请求的地址。默认为 /*
```

### 代码测试

* 1、对应流量异常拦截器实现

```java
package com.example.alibaba.sentinel.webHandler;

import com.alibaba.csp.sentinel.adapter.spring.webmvc.callback.BlockExceptionHandler;
import com.alibaba.csp.sentinel.slots.block.BlockException;
import com.central.common.exception.BusinessException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

/**
 * 自定义sentinel异常捕获
 */
@Component
public class CustomBlockExceptionHandler implements BlockExceptionHandler {

    private static final Logger LOGGER = LoggerFactory.getLogger(CustomBlockExceptionHandler.class);

    @Override
    public void handle(HttpServletRequest request, HttpServletResponse response, BlockException e) throws Exception {
        LOGGER.error("CustomBlockExceptionHandler捕获流量异常", e);
        throw new BusinessException("捕获流量异常");
    }
}
```

* 2、测试类实现

```java
package com.example.alibaba.sentinel.controller;

import com.central.common.api.CommonResult;

import com.example.alibaba.sentinel.domain.Order;
import com.example.alibaba.sentinel.service.OrderService;
import org.springframework.web.bind.annotation.*;

import javax.annotation.Resource;

@RestController
@RequestMapping("/order")
public class OrderController {

    @Resource
    private OrderService orderService;

    @PostMapping("/create")
    public CommonResult<String> create(@RequestBody Order order) {
        orderService.create(order);
        return CommonResult.success("订单创建成功!");
    }

    @GetMapping("/sleep")
    public CommonResult<String> sleep() throws InterruptedException {
        Thread.sleep(100L);
        return CommonResult.success("sleep!");
    }
    
}

```

### idea项目启动日志

```bash
[alibaba-sentinel-service:192.168.130.167:9866] 2022-01-13 19:03:11.852 INFO 16038 [] [main] trationDelegate$BeanPostProcessorChecker Bean 'spring.cloud.sentinel-com.alibaba.cloud.sentinel.SentinelProperties' of type [com.alibaba.cloud.sentinel.SentinelProperties] is not eligible for getting processed by all BeanPostProcessors (for example: not eligible for auto-proxying)
INFO: log output type is: file
INFO: log charset is: utf-8
INFO: log base dir is: /Users/apple/logs/csp/
INFO: log name use pid is: false
[alibaba-sentinel-service:192.168.130.167:9866] 2022-01-13 19:03:12.252 INFO 16038 [] [main] trationDelegate$BeanPostProcessorChecker Bean 'com.alibaba.cloud.sentinel.custom.SentinelAutoConfiguration' of type [com.alibaba.cloud.sentinel.custom.SentinelAutoConfiguration] is not eligible for getting processed by all BeanPostProcessors (for example: not eligible for auto-proxying)
[alibaba-sentinel-service:192.168.130.167:9866] 2022-01-13 19:03:12.741 INFO 16038 [] [main] o.s.b.w.embedded.tomcat.TomcatWebServer  Tomcat initialized with port(s): 9866 (http)
[alibaba-sentinel-service:192.168.130.167:9866] 2022-01-13 19:03:12.753 INFO 16038 [] [main] o.a.coyote.http11.Http11NioProtocol      Initializing ProtocolHandler ["http-nio-9866"]
[alibaba-sentinel-service:192.168.130.167:9866] 2022-01-13 19:03:12.754 INFO 16038 [] [main] o.apache.catalina.core.StandardService   Starting service [Tomcat]
[alibaba-sentinel-service:192.168.130.167:9866] 2022-01-13 19:03:12.754 INFO 16038 [] [main] org.apache.catalina.core.StandardEngine  Starting Servlet engine: [Apache Tomcat/9.0.30]
[alibaba-sentinel-service:192.168.130.167:9866] 2022-01-13 19:03:12.876 INFO 16038 [] [main] o.a.c.c.C.[Tomcat].[localhost].[/]       Initializing Spring embedded WebApplicationContext
[alibaba-sentinel-service:192.168.130.167:9866] 2022-01-13 19:03:12.876 INFO 16038 [] [main] o.s.web.context.ContextLoader            Root WebApplicationContext: initialization completed in 2205 ms
[alibaba-sentinel-service:192.168.130.167:9866] 2022-01-13 19:03:13.320 INFO 16038 [] [main] org.redisson.Version                     Redisson 3.16.1
[alibaba-sentinel-service:192.168.130.167:9866] 2022-01-13 19:03:13.616 INFO 16038 [] [redisson-netty-2-14] o.r.c.pool.MasterPubSubConnectionPool    1 connections initialized for localhost/127.0.0.1:6379
[alibaba-sentinel-service:192.168.130.167:9866] 2022-01-13 19:03:13.637 INFO 16038 [] [redisson-netty-2-20] o.r.c.pool.MasterConnectionPool          24 connections initialized for localhost/127.0.0.1:6379
[alibaba-sentinel-service:192.168.130.167:9866] 2022-01-13 19:03:14.274 INFO 16038 [] [main] o.s.s.concurrent.ThreadPoolTaskExecutor  Initializing ExecutorService 'applicationTaskExecutor'
[alibaba-sentinel-service:192.168.130.167:9866] 2022-01-13 19:03:14.316 INFO 16038 [] [main] c.a.c.s.SentinelWebAutoConfiguration     [Sentinel Starter] register SentinelWebInterceptor with urlPatterns: [/**].
[alibaba-sentinel-service:192.168.130.167:9866] 2022-01-13 19:03:14.924 INFO 16038 [] [main] o.s.b.a.e.web.EndpointLinksResolver      Exposing 2 endpoint(s) beneath base path '/actuator'
```

### 使用浏览器访问下 <http://127.0.0.1:7070/>地址进入到Sentinel控制台

> [!note]
>
> 如下所示的菜单中，可以看到当前项目应用注册到Sentinel上的所有的实例

![动图1](https://fy-image.oss-cn-beijing.aliyuncs.com/images/m10WechatIMG162.png)

### 调用接口多次 <http://localhost:9866/order/create> 如下所示

![动图1](https://fy-image.oss-cn-beijing.aliyuncs.com/images/m10WechatIMG163.png)

![动图1](https://fy-image.oss-cn-beijing.aliyuncs.com/images/m11WechatIMG164.png)

![动图1](https://fy-image.oss-cn-beijing.aliyuncs.com/images/m12WechatIMG165.png)

### 针对/order/create接口点击[流量]按钮，弹出[新增流控规则]

> [!note]
>
> 这里创建的规则比较简单，仅允许/order/create 资源被每秒调用五次.

![动图1](https://fy-image.oss-cn-beijing.aliyuncs.com/images/m13WechatIMG166.png)

* 1、多次调用接口<http://localhost:9866/order/create> 五次以上会出现被Sentinel流量控制而拒绝 如下所示

![动图1](https://fy-image.oss-cn-beijing.aliyuncs.com/images/m14WechatIMG167.png)

### 点击 Sentinel 控制台的「实时监控」菜单，可以看到该接口被拒绝的统计

![动图1](https://fy-image.oss-cn-beijing.aliyuncs.com/images/m15WechatIMG168.png)

## 熔断降级

> [!note]
>
> 参考 <https://github.com/alibaba/Sentinel/wiki/%E7%86%94%E6%96%AD%E9%99%8D%E7%BA%A7>

### 什么是熔断降级

> [!note]
>
> 引用自：<https://github.com/alibaba/Sentinel/wiki/%E4%B8%BB%E9%A1%B5#%E6%B5%81%E9%87%8F%E6%8E%A7%E5%88%B6> 除了流量控制以外，及时对调用链路中的不稳定因素进行熔断也是Sentinel的使命之一。由于调用关系的复杂性，如果调用链路中的某个资源出现了不稳定，可能会导致请求发生堆积，进而导致联级错误。

![动图1](https://user-images.githubusercontent.com/9434884/62410811-cd871680-b61d-11e9-9df7-3ee41c618644.png)

### 熔断降级设计理念

> [!note]
>
> Sentinel和Hystrix的原则是一致的: 当检测到调用链路中某个资源出现不稳定的表现，例如请求响应时间长或异常比例升高的时候，则对这个资源的调用进行限制，让请求快速失败，避免影响到其他的资源而导致联级故障。 
> 
> 在限制的手段上，Sentinel和Hystrix采取了完全不一样的方法。 
> 
> Hystrix通过线程池隔离的方式，来对依赖（Sentinel的概念中对对应的资源）进行了隔离。这样做的好处是资源和资源之间做到了最彻底的隔离。缺点是除了增加了线程切换的成本（过多的线程池导致了线程数目过多），还需要预先给各个资源做线程池大小的分配。

### Sentinel采取的手段解决方式

* 1、通过并发线程进行限制.

  和资源池隔离的方法不同，sentinel通过限制资源并发的数量，来减少不稳定资源相对其他资源的影响。这样不但没有线程切换的损耗，也不需要预先分配线程池的大小。当某个资源出现不稳定的情况下，例如响应时间变长，对资源的直接影响就是会造成线程数的逐步堆积。当线程在特定资源上堆积到一定的数量之后，对该资源的新请求就会拒绝。堆积的线程完成任务之后才开始继续接收请求。

* 2、通过响应时间对资源进行降级。

  除了对并发线程数进行控制以外，Sentinel还可以通过相应时间快速降级不稳定的资源。当依赖的资源出现相应的时间过长后，所有对该资源的访问都会被直接拒绝，直到了指定的时间窗口之后才重新恢复。

### 测试实战

* 1、代码例子

```java
    @GetMapping("/sleep")
    public CommonResult<String> sleep() throws InterruptedException {
        Thread.sleep(200L);
        return CommonResult.success("sleep!");
    }
```

* 2、创建新的熔断规则

> 慢调用比例 (SLOW_REQUEST_RATIO)：选择以慢调用比例作为阈值，需要设置允许的慢调用 RT（即最大的响应时间），请求的响应时间大于该值则统计为慢调用。当单位统计时长1s（statIntervalMs）内请求数目大于设置的最小请求数目，并且慢调用的比例大于阈值，则接下来的熔断时长内请求会自动被熔断。经过熔断时长后熔断器会进入探测恢复状态（HALF-OPEN 状态），若接下来的一个请求响应时间小于设置的慢调用 RT 则结束熔断，若大于设置的慢调用 RT 则会再次被熔断。

![动图1](https://fy-image.oss-cn-beijing.aliyuncs.com/images/m16WechatIMG174.png)

* 3、多次调用接口测试 <http://localhost:9866/order/sleep>

![动图1](https://fy-image.oss-cn-beijing.aliyuncs.com/images/m17WechatIMG175.png)

* 4、点击Sentinel控制台，可以看看到该接口被拒绝的统计

![动图1](https://fy-image.oss-cn-beijing.aliyuncs.com/images/m18WechatIMG176.png)

## 热点数据限流

> [!note]
>
> 引用 <https://github.com/alibaba/Sentinel/wiki/%E7%83%AD%E7%82%B9%E5%8F%82%E6%95%B0%E9%99%90%E6%B5%81> </br>

### 何为热点？热点即经常访问的数据。很多时候我们希望统计某个热点数据中访问频次最高的 Top 数据，并对其访问进行限制

* 1、商品 ID 为参数，统计一段时间内最常购买的商品 ID 并进行限制
* 2、用户 ID 为参数，针对一段时间内频繁访问的用户 ID 进行限制

### 热点参数限流说明

热点参数限流会统计传入参数中的热点参数，并根据配置的限流阀值与模式，对包含热点参数的资源调用进行限流。热点参数限流可以看作是一种特殊的流量控制，仅对包含热点参数额资源调用生效.

> [!note]
>
> Sentinel 利用**LRU策略**统计最近最常访问的热点参数，结合令牌桶算法来进行参数级别的流控。热点参数限流支持集群模式。

![动图1](https://github.com/alibaba/Sentinel/wiki/image/sentinel-hot-param-overview-1.png)

### 热点参数限流测试实战

* 1、代码例子

```java
    // 测试热点数据限流
    @GetMapping("/orderInfo")
    @SentinelResource("orderInfo")
    public CommonResult<String> orderInfo(Integer id) {
        return CommonResult.success("订单编号：" + id);
    }
```

### Sentinel UI界面新增**新增热点规则**

> [!note]
>
> 这里，设置了参数索引为0，统计窗口时长为30秒，请求最大次数为10

![动图1](https://fy-image.oss-cn-beijing.aliyuncs.com/images/m19WechatIMG177.png)

### 编辑热点规则


> [!note]
>
> 这里配置了第一个参数的值为1时，限制在统计窗口中，请求最大的次数为1

![动图1](https://fy-image.oss-cn-beijing.aliyuncs.com/images/a10WechatIMG179.png)

* 1、使用浏览器访问<http://127.0.0.1:9866/demo/product_info?id=1>接口两次，可以看到接口被拒绝的统计如下

![动图1](https://fy-image.oss-cn-beijing.aliyuncs.com/images/a11WechatIMG180.png)

* 2、使用浏览器访问<http://127.0.0.1:9866/demo/product_info?id=3>接口，不会存在限流的情况。而是在快速访问10次，才会被限流。

## 系统自适应限流

> [!note]
>
> 引自: <https://github.com/alibaba/Sentinel/wiki/%E4%B8%BB%E9%A1%B5#%E7%B3%BB%E7%BB%9F%E8%B4%9F%E8%BD%BD%E4%BF%9D%E6%8A%A4>  
> 
> Sentinel同时提供系统维度的自适应保护能力。防止雪崩，是系统防护中重要一环。当系统负载较高的时候，如果还持续让请求进入，可能会导致系统崩溃，无法相应。在集群环境中，网络负载均衡会把本应这台机器承载的流量转发到其他的机器上去。如果这个时候其他的机器也处在一个边缘状态的时候，这个增加的流量就会导致这台机器崩溃，最后导致整个集群不可用。 
> 
> 针对这个情况，Sentinel 提供了对应的保护机制，让系统入口的流量和系统的负载达到一个平衡，保证系统在能力范围之内处理最多的请求。

### 新增系统保护规则

* 1、在Sentinel控制台 系统规则菜单，新增系统规则, 创建一条CPU超过1%后，自动进行系统限流如下:

![动图1](https://fy-image.oss-cn-beijing.aliyuncs.com/images/a12WechatIMG181.png)

### Sentinel的五种规则

* **1、Load自适应（仅对linux机器生效）**

> [!note]
>
> 系统的load1作为启发指标，进行自适应系统保护。当系统load1超过设定的启发值，且系统的并发线程数超过估算的系统容量时才会触发系统保护（BBR阶段）。系统容量由系统maxQps\*minRt 估算得出。设定参考值一般是 CPU cores\*2.5

* **2、CPU usage（1.50+ 版本）**

> [!note]
>
> 当系统CPU使用率超过阀值即触发系统保护，单位是毫秒。

* **3、平均RT**
  
> [!note]
>
> 当单台机器上所有入口流量的平均RT 达到阀值即触发系统保护，单位是毫秒。

* **4、并发线程数**

> [!note]
>
> 当单台机器上所有流量的并发线程数达到阀值即触发系统保护

* **5、入口QPS**

> [!note]
>
> 当单台机器上所有入口流量的QPS达到阀值即触发系统保护。

### 调用测试

![动图1](https://fy-image.oss-cn-beijing.aliyuncs.com/images/a13WechatIMG182.png)

## 黑白名单控制

> [!note]
>
> 引自: <https://github.com/alibaba/Sentinel/wiki/%E9%BB%91%E7%99%BD%E5%90%8D%E5%8D%95%E6%8E%A7%E5%88%B6>  
> 
> 很多时候，我们需要根据调用来源来判断该次请求是否允许通过放行，这时候可以使用Sentinel的来源访问控制（黑白名单）的功能。来源访问控制根据资源的请求来源（origin）限制资源是否通过：
>
> - 1、若配置白名单则只有请求来源位于白名单的内时才通过
> 
> - 2、若配置黑名单则请求来源位于黑名单时不通过，其余的请求通过

### 拦截器RequestOriginParser

> 从请求中解析到调用来源，例如说使用IP、请求头user、请求头appName等

### 实现代码

```java
package com.example.alibaba.sentinel.webFilter;

import com.alibaba.csp.sentinel.adapter.spring.webmvc.callback.RequestOriginParser;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import javax.servlet.http.HttpServletRequest;

@Component
public class CustomRequestOriginParser implements RequestOriginParser {

    @Override
    public String parseOrigin(HttpServletRequest request) {
        // <X> 从 Header 中，获得请求来源
        String origin = request.getHeader("s-user");
        // <Y> 如果为空，给一个默认的
        if (StringUtils.isEmpty(origin)) {
            origin = "default";
        }
        return origin;
    }

}
```

### 新增授权规则

> [!note]
>
> 添加方法 /order/orderInfo的授权规则

![动图1](https://fy-image.oss-cn-beijing.aliyuncs.com/images/a14WechatIMG183.png)

* 1、使用浏览器请求接口<http://localhost:9866/order/orderInfo>

![动图1](https://fy-image.oss-cn-beijing.aliyuncs.com/images/a15WechatIMG184.png)

* 2、请求头增加Head "s-user": "test"

![动图1](https://fy-image.oss-cn-beijing.aliyuncs.com/images/a17WechatIMG186.png)

![动图1](https://fy-image.oss-cn-beijing.aliyuncs.com/images/a16WechatIMG185.png)

## Sentinel客户端API

### 注解支持

> [!note]
>
> @SentinelResource 注解  引自: <https://github.com/alibaba/Sentinel/wiki/%E6%B3%A8%E8%A7%A3%E6%94%AF%E6%8C%81>  </br>
>
> - **1、value**: 资源名称，必须项（不能为空）
>
> - **2、entryType**: entry类型，可选项（默认为EntryType. OUT）
>
> - **3、blockHandler/blockHandlerClass**: blockHandler对应处理BlockException 的函数名称，可选项。blockHandler函数访问范围是public，返回类型需要与原方法相匹配，参数类型需要和原方法相匹配并且最后一个额外的参数，类型是BlockException。blockHandler函数默认需要和原方法在同一个类中。若希望使用其他类的函数，则可以指定blockHandlerClass对应的类的Class对象，注意对应的函数必须为static函数，否则无法解析. </br>
>
> - **4、fallback/fallbackClass**: fallback函数名称，可选项，用于抛出异常的时候提供fallback处理逻辑。fallback函数可以针对所有类型的异常（除了exceptionsToIgnore 里面排除掉的异常类型）进行处理。fallback 函数签名和位置要求</br>
> &ensp;&ensp;&ensp;返回值类型必须与原函数返回值类型一致； </br>
> &ensp;&ensp;&ensp;方法参数列表需要和原函数一致，或者可以额外多一个 Throwable 类型的参数用于接收对应的异常。 </br>
> &ensp;&ensp;&ensp;fallback函数默认需要和原方法在同一个类中。若希望使用其他类的函数，则可以指定fallbackClass 为对应的类的Class对象，注意对应的函数必需为 static 函数否则无法解析。 </br>
>
> - **5、defaultFallback（since 1.6.0）**：默认的 fallback 函数名称，可选项，通常用于通用的 fallback 逻辑（即可以用于很多服务或方法）。默认 fallback 函数可以针对所有类型的异常（除了 exceptionsToIgnore 里面排除掉的异常类型）进行处理。若同时配置了 fallback 和 defaultFallback，则只有 fallback 会生效。defaultFallback 函数签名要求
> &ensp;&ensp;&ensp;返回值类型必须与原函数返回值类型一致； </br>
> 方法参数列表需要为空，或者可以额外多一个 Throwable 类型的参数用于接收对应的异常。</br>
> - **6、defaultFallback** :函数默认需要和原方法在同一个类中。若希望使用其他类的函数，则可以指定 fallbackClass 为对应的类的 Class 对象，注意对应的函数必需为 static 函数，否则无法解析。 </br>

特别地，若 blockHandler 和 fallback 都进行了配置，则被限流降级而抛出 BlockException 时只会进入 blockHandler 处理逻辑。若未配置 blockHandler、fallback 和 defaultFallback，则被限流降级时会将 BlockException 直接抛出（若方法本身未定义 throws BlockException 则会被 JVM 包装一层 UndeclaredThrowableException）。

### 注解代码示例

> [!note]
>
> blockHandler和fallback都进行配置，则被限流而抛出BlockException时只会进入blockHandler处理逻辑. </br>
> 
> fallback和fallHandler的差异点，在于clockHandler只能处理**BlockException**异常，fallback能处理所有的异常

```java
    // 测试「Sentinel @SentinelResource 注解」
    @GetMapping("/annotations")
    @SentinelResource(value = "annotations", blockHandler = "blockHandler", fallback = "fallback")
    public CommonResult<String> annotationsDemo(@RequestParam(required = false) Integer id) {
        if (id == null) {
            throw new BusinessException("id 参数不允许为空");
        }
        return CommonResult.success("success...");
    }

    // BlockHandler 处理函数，参数最后多一个 BlockException，其余与原函数一致.
    public CommonResult<String> blockHandler(Integer id, BlockException ex) {
        return CommonResult.success("block：" + ex.getClass().getSimpleName());
    }

    // Fallback 处理函数，函数签名与原函数一致或加一个 Throwable 类型的参数.
    public CommonResult<String> fallback(Integer id, Throwable throwable) {
        return CommonResult.success("fallback：" + throwable.getMessage());
    }
```

## 规则管理及推送

> [!note]
>
> 引自: <https://github.com/alibaba/Sentinel/wiki/%E5%9C%A8%E7%94%9F%E4%BA%A7%E7%8E%AF%E5%A2%83%E4%B8%AD%E4%BD%BF%E7%94%A8-Sentinel>

### 规则管理及推送三种模式

| 推送模式    | 说明                                                                                                                          | 优点             | 缺点                                |
|---------|-----------------------------------------------------------------------------------------------------------------------------|----------------|-----------------------------------|
| **原始模式**    | API 将规则推送至客户端并直接更新到内存中，扩展写数据源（WritableDataSource）                                                                           | 简单，无任何依赖       | 不保证一致性；规则保存在内存中，重启即消失。严重不建议用于生产环境 |
| **Pull模式** | 扩展写数据源（WritableDataSource）， 客户端主动向某个规则管理中心定期轮询拉取规则，这个规则中心可以是 RDBMS、文件 等                                                     | 简单，无任何依赖；规则持久化 | 不保证一致性；实时性不保证，拉取过于频繁也可能会有性能问题。    |
| **Push模式** | 扩展读数据源（ReadableDataSource），规则中心统一推送，客户端通过注册监听器的方式时刻监听变化，比如使用 Nacos、Zookeeper 等配置中心。这种方式有更好的实时性和一致性保证。生产环境下一般采用 push 模式的数据源。 | 规则持久化；一致性；快速   | 引入第三方依赖                           |

### Push模式

> [!note]
>
> 生产环境下一般更常用的是 push 模式的数据源。对于 push 模式的数据源,如远程配置中心（ZooKeeper, Nacos, Apollo等等），推送的操作不应由 Sentinel 客户端进行，而应该经控制台统一进行管理，直接进行推送，数据源仅负责获取配置中心推送的配置并更新到本地。因此推送规则正确做法应该是 配置中心控制台/Sentinel 控制台 → 配置中心 → Sentinel 数据源 → Sentinel，而不是经 Sentinel 数据源推送至配置中心。这样的流程就非常清晰了

![动图1](https://user-images.githubusercontent.com/9434884/53381986-a0b73f00-39ad-11e9-90cf-b49158ae4b6f.png)

## 使用Nacos作为数据源

> [!note]
>
> 使用Nacos作为Sentinel规则的数据源，并使用Push模式推送规则

### 引入pom依赖

```xml
<!-- Sentinel 对 Nacos 作为数据源的支持 -->
<dependency>
    <groupId>com.alibaba.csp</groupId>
    <artifactId>sentinel-datasource-nacos</artifactId>
</dependency>
```

### 配置文件

```yaml
server:
  port: 9866 #对应服务的端口号

spring:
  application:
    name: alibaba-sentinel-service # Spring 应用名
  cloud:
    # Sentinel 配置项，对应 SentinelProperties 配置属性类
    sentinel:
      enabled: true # 是否开启。默认为 true 开启
      eager: true # 是否饥饿加载。默认为 false 关闭
      transport:
        dashboard: 127.0.0.1:7070 # Sentinel 控制台地址
      filter:
        url-patterns: /** # 拦截请求的地址。默认为 /*
      # Sentinel 规则的数据源，是一个 Map 类型。key 为数据源名，可自定义；value 为数据源的具体配置
      datasource:
        ds1:
          # 对应 DataSourcePropertiesConfiguration 类
          nacos:
            server-addr: 127.0.0.1:8848 # Nacos 服务器地址
            namespace: # Nacos 命名空间
            group-id: DEFAULT_GROUP # Nacos 分组
            data-id: ${spring.application.name}-flow-rule # Nacos 配置集编号
            data-type: json # 数据格式
            rule-type: FLOW # 规则类型
```

> [!note]
>
> 通过添加 spring.cloud.sentinel.datasource 配置项，设置接入的 Sentinel 规则的数据源。注意它是一个 Map 类型

- **1、key**: 为数据源名，可自定义，无特殊含义。
- **2、value** :为数据源的具体配置，对应 DataSourcePropertiesConfiguration 类，可以选择 file、nacos、zk、apollo、redis 任一作为数据的数据源。这里我们选择 nacos 来接入 Nacos 作为数据源
  - **rule-type**：数据源对应的 Sentinel 规则类型，在 RuleType 类枚举。这里我们设置了 FLOW 对应流量控制的规则
  - **data-type**：数据源的数据格式，默认为 json。这里我们设置了 json，所以稍后创建的 Nacos 配置集的数据格式要为 JSON。
  - **server-addr**：Nacos 服务器地址。
  - **namespace**：Nacos 分组。
  - **data-id**：Nacos 配置集编号。推荐配置集编号的命名规则为 ${applicationName}-${ruleType}，因此这里我们设置为 alibaba-sentinel-service，即 alibaba-sentinel 应用的流控规则。
