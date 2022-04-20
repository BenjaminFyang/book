# Elastic APM 应用性能监控分析及使用

> [!note]
>
> 简介: 目前麒麟系统初步完成功能上的建设，进入到推广阶段，随着推广的逐步深入，对接口性能的优化级必须提高。通过对比已有的SkyWalking与Elastic APM之后，发现Elastic APM更胜一筹。
>
> Elastic APM，用于实时监控软件服务和应用程序的各项性能指标，如：**请求访问的各项指标、访问耗时、数据库查询、缓存调用、外部 HTTP** 请求等。便于测试后端人员快速排查和修复各种性能问题.  
>
> 目前已经进行汉化处理  参考链接:
>
> 1、<https://help.aliyun.com/document_detail/326329.html>
>
> 2、<https://cloud.tencent.com/developer/article/1543781>

## Elastic APM 背景信息

### 优势

* 1、了解服务的时间花在什么上，以及它崩溃的原因。
* 2、了解服务如何相互交互，以及它的可视化瓶颈。
* 3、主动发现并修复性能瓶颈和错误。
* 4、度量指标（比如Java JVM和Go Runtime的指标）
* 5、在浏览器中跟踪终端用户链路。

### 对比SkyWalking与Elastic APM

| 对比项             | Elastic APM                                                | SkyWalking                                     |
|-----------------|------------------------------------------------------------|------------------------------------------------|
| **支持的语言**           | Java                                                       | Java                                           |
|                 | . NET                                                       | . NET Core                                      |
|                 | NodeJS                                                     | NodeJS                                         |
|                 | Python                                                     | PHP                                            |
|                 | Ruby                                                       | Go                                             |
|                 | Javascript                                                 |                                                |
|                 | Go                                                         |                                                |
| **是否支持tracing**     | 是                                                          | 否                                              |
| **支持的存储**           | Elasticsearch                                              | ElasticSearch、H2和MySQL                         |
| **UI丰富度**           | 高。相比SkyWalking，Elastic APM能够在UI中进行复杂的查询和过滤。                | 高。相比Elastic APM，SkyWalking能够提供服务间的拓扑图。         |
| **Agent易用性（代码侵入性）** | Java、. NET Core和NodeJS部分开源库无需侵入代码自动装配（instrument）。          | Java、. NET Core和NodeJS部分开源库无需侵入代码自动装配，不支持的无法使用。 |
|                 | Python、Ruby、Javascript和Go部分开源库提供SDK手动装配。                   | Go和PHP提供SDK手动装配。                               |
|                 | 对于不支持的库或框架，也能通过Public API采集Agent数据。                        |                                                |
| **查询能力**            | 能在Kibana APM UI中，查询或过滤任意APM信息。                             | 仅支持查询TraceId和Endpoint name。                    |
| **告警**              | 支持                                                         | 支持                                             |
| **JVM监控**           | 支持                                                         | 支持                                             |
| **Go Runtime监控**    | 支持                                                         | 不支持                                            |
| **收集错误和异常**         | 支持                                                         | 不支持                                            |
| **全面可观测性**          | 支持。Elastic Stack已经提供了日志及指标监控的完备解决方案，再结合APM，您可以搭建全面的可观测性系统。 | 不支持                                            |

## APM相关组件

> [!note]
>
> 应用程序性能管理（Application Performance Managemen）简称 APM。 **Elastic APM 由4个组件组成：APM 代理、APM 服务端、Elasticsearch 和 Kibana。**

![动图1](https://ucc.alicdn.com/pic/developer-ecology/85b38782698c401a8b1f701fd360b652.png)

* **APM Agent** : 以应用程序库的形式提供，负责收集应用运行时的性能监控数据和错误数据，短时间缓存后发送APM Server。
* **APM Server** : 一个独立的组件，负责接收APM Agent中发送的性能监控数据。验证并处理完数据后，会转存储到Elasticsearch中，之后就可以在Kibana APM 应用中查看性能监控数据了。
* **Elasticsearch** : 用于存储应用性能监控数据并提供聚合功能。
* **Kibana APM app** : 可视化查看APM性能监控数据，有助于找到性能瓶颈。

## 架构及数据模型

> [!note]
>
> APM Agent采集器从其监测的应用程序中收集不同类型的信息和数据，这些被称为事件。事件支持的类型包括Spans、Transaction、Errors和Metrics。

### Elastic APM事件

* **Span（跨度）**：Span包含一次操作过程中代码执行路径的信息。它从操作的开始到结束进行度量，并且可以与其他Span具有父/子关系。
* **Transaction（事务**）：Transaction是一种特殊的Span，具有与之关联的其他属性。它描述了Elastic APM Agent捕获的最高级别事件，比如一次请求、一次批处理任务等。
* **Error（错误）**：Error事件至少包含错误发生的原始异常或创建的日志的信息。
* **Metric（度量）**：APM Agent 自动获取基本的主机级别指标，包括系统和进程级别的CPU和内存指标。也可以获取特定于代理的指标，例如Java Agent中的JVM指标和Go Agent中的Go运行时指标。

## 使用实践

### 安装步骤

// todo

### 查看APM中包含的所有服务

![动图1](https://fy-image.oss-cn-beijing.aliyuncs.com/images/qq1231641280253_.pic_hd.jpg?versionId=CAEQHBiBgIDMvd6P8RciIDBlNjc5ZjFlM2JjOTQzNTc5OTg5MzY5YjJmNzFjNTU5)

### 多次调用应用接口，即可查看到应用性能信息

> 以kylin-pre-social事务服务为例，服务信息如下图（每项服务都具有类似的布局）

![动图1](https://fy-image.oss-cn-beijing.aliyuncs.com/images/20qWechatIMG124.png)

### 打开某个事物（Transaction）查看详情，可以看到连SQL执行耗时信息

![动图1](https://fy-image.oss-cn-beijing.aliyuncs.com/images/21qWechatIMG125.png)

### 打开执行查询的Span查看详情，SQL语句也已经收集

![动图1](https://fy-image.oss-cn-beijing.aliyuncs.com/images/22qWechatIMG126.png)

### 查询依赖调用的的微服务链路

* **如下依赖了kylin-pre-crmproject、kylin-pre-supplier、kylin-pre-entry服务**

* 社保SocStaffIncreaseRecordController#submitIncreaseRecord调用链路图

![动图1](https://fy-image.oss-cn-beijing.aliyuncs.com/images/23qWechatIMG127.png)

* 点击依赖的kylin-pre-crmproject详情

![动图1](https://fy-image.oss-cn-beijing.aliyuncs.com/images/24qWechatIMG128.png)

* 点击依赖的kylin-pre-suppliert详情

![动图1](https://fy-image.oss-cn-beijing.aliyuncs.com/images/25qWechatIMG129.png)

### 服务异常跟踪

> [!note]
>
> 点击错误tab进行切换，可以看到目前社保（social）目前收集到的错误系信息的统计

![动图1](https://fy-image.oss-cn-beijing.aliyuncs.com/images/30qWechatIMG130.png)

* 点击查看对应的异常堆栈追溯信息
  
![动图1](https://fy-image.oss-cn-beijing.aliyuncs.com/images/31qWechatIMG131.png)

* **点击元数据可以通过http.response.headers. Insignia:p_927938471752896512查看整个链路的日志标识**

![动图1](https://fy-image.oss-cn-beijing.aliyuncs.com/images/32qWechatIMG132.png)

### 主机的度量信息，CPU、内存、JVM信息都有，以后性能调优的时候可以看看

![动图1](https://fy-image.oss-cn-beijing.aliyuncs.com/images/40qWechatIMG133.png)

## 总结

**Elastic APM** 完全可以取代SkyWalking来做分布式请求链路追踪，并且提供了数据库及缓存调用时长的统计，还可以用来实时监控应用性能信息及度量指标，连错误日志也收集。相比下Elastic APM更加性能监控更为强大.

## Elastic APM 应用性能监控分析及使用

> [!note]
>
> 目前麒麟系统初步完成功能上的建设，进入到推广阶段，对接口性能的优化需要提高。对比已有的SkyWalking与Elastic APM之后，Elastic APM更胜一筹。目前pre环境已经搭建好了Elastic APM，大家可以先熟悉下，后续生产环境上的SkyWalking将会下掉，用Elastic APM进行替代。

## Elastic APM 功能

* 1、了解服务的时间花在什么上，以及它崩溃的原因。
* 2、了解服务如何相互交互，以及它的可视化瓶颈。
* 3、主动发现并修复性能瓶颈和错误。
* 4、度量指标（比如Java JVM和Go Runtime的指标）
* 5、在浏览器中跟踪终端用户链路。

语雀地址:  <https://joyowo.yuque.com/techs/regulations/xtdqrf>
