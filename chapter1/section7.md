# Feign集成OKHttp

## OkHttp官方API说明

> [!note]
>
> 参考: <https://square.github.io/okhttp/>

### Feign

* 1、在Feign中，Client是一个非常重要的组件，Feign最终发送Request请求以及接收Response响应都是由Client组件来完成的。Client在Feign源码中是一个接口，在默认情况下，Client的实现类是Client. Default。Client. Default是由HttpURLConnection来实现网络请求的。另外, Client还支持HttpClient和OkHttp3来进行网络请求。

* 2、HttpURLConnection没有连接池，但是对每个地址会保持一个长连接。可以用Apache的HTTP Client替换Feign原始的http client, 从而获取连接池、超时时间等与性能息息相关的控制能力。

### OkHttp的优点

* 1、支持HTTP/2 , 当多个请求对应同一host地址时，可共用同一个socket；
  
* 2、连接池可减少请求延迟（如果HTTP/2不可用）；

* 3、支持GZIP压缩，减少网络传输的数据大小；

* 4、支持Response数据缓存，避免重复网络请求；

## Feign使用Okhttp

### 集成项目github地址

<https://github.com/BenjaminFyang/frameService-platform.git>

### 项目结构

```shell
├── HELP.md
├── seata-service
│   ├── accountService (账号微服务)
│   ├── orderService （订单微服务）
│   ├── pom.xml
│   ├── seata-service.iml
│   └── storageService （库存微服务）
├── services-traceId.iml
├── servicesTraceId.iml
├── traceId-commons (工具包)
│   ├── feignOkHttp （feign集成OkHttp）
│   ├── pom.xml
│   ├── traceId-common-core （核心工具类）
│   ├── traceId-commons.iml
│   ├── traceId-log-springcloud-starter （日志工具类）
│   └── traceId-rocketmq-starter (Rocketmq工具类)
├── traceId-eureka （注册中心）
│   ├── pom.xml
│   ├── src
│   ├── target
│   └── traceId-eureka.iml
├── traceId-gateway （网关微服务）
│   ├── pom.xml
│   ├── src
│   ├── target
│   └── traceId-gateway.iml
└── traceId-loadbalancer （负载均衡）
    ├── pom.xml
    ├── src
    ├── target
    └── traceId-loadbalancer.iml

```

### 引入pom文件

```pom
    <dependency>
        <groupId>io.github.openfeign</groupId>
        <artifactId>feign-okhttp</artifactId>
        <version>11.0</version>
    </dependency>
```

### 引入yml

```yml
# 在配置文件中禁用默认的URLHttpConnection，启动okhttp
feign:
  # 开启okhttp
  okhttp:
    enabled: true
  httpclient:
    connectionTimeout: 5000
    followRedirects: true
  client:
    config:
      default:
        readTimeout: 5000
        writeTimeout: 5000
```

### 添加FeignOkHttpConfig.java

```java
package com.example.feignokhttp;

import okhttp3.ConnectionPool;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.cloud.commons.httpclient.OkHttpClientConnectionPoolFactory;
import org.springframework.cloud.commons.httpclient.OkHttpClientFactory;
import org.springframework.cloud.openfeign.FeignClientProperties;
import org.springframework.cloud.openfeign.support.FeignHttpClientProperties;
import org.springframework.context.annotation.Bean;

import javax.annotation.PreDestroy;
import java.util.concurrent.TimeUnit;

@ConditionalOnMissingBean(okhttp3.OkHttpClient.class)
public class FeignOkHttpConfig {

    private okhttp3.OkHttpClient okHttpClient;

    @Bean
    @ConditionalOnMissingBean(ConnectionPool.class)
    public ConnectionPool httpClientConnectionPool(FeignHttpClientProperties httpClientProperties, OkHttpClientConnectionPoolFactory connectionPoolFactory) {
        int maxTotalConnections = httpClientProperties.getMaxConnections();
        long timeToLive = httpClientProperties.getTimeToLive();
        TimeUnit ttlUnit = httpClientProperties.getTimeToLiveUnit();
        return connectionPoolFactory.create(maxTotalConnections, timeToLive, ttlUnit);
    }

    @Bean
    @ConditionalOnMissingBean(okhttp3.OkHttpClient.class)
    public okhttp3.OkHttpClient okHttpClient(OkHttpClientFactory httpClientFactory, ConnectionPool connectionPool, FeignClientProperties feignClientProperties, FeignHttpClientProperties feignHttpClientProperties) {
        FeignClientProperties.FeignClientConfiguration defaultConfig = feignClientProperties.getConfig().get("default");
        int connectionTimeout = feignHttpClientProperties.getConnectionTimeout();
        int readTimeout = defaultConfig.getReadTimeout();
        boolean disableSslValidation = feignHttpClientProperties.isDisableSslValidation();
        boolean followRedirects = feignHttpClientProperties.isFollowRedirects();
        this.okHttpClient = httpClientFactory.createBuilder(disableSslValidation)
                // 设置读超时
                .readTimeout(readTimeout, TimeUnit.MILLISECONDS)
                //设置连接超时
                .connectTimeout(connectionTimeout, TimeUnit.MILLISECONDS)
                .followRedirects(followRedirects)
                .connectionPool(connectionPool)
                // 这里设置我们自定义的拦截器
                .addInterceptor(new MyOkhttpInterceptor())
                //设置写超时
                .writeTimeout(10, TimeUnit.SECONDS)
                //是否自动重连
                .retryOnConnectionFailure(true)
                .build();
        return this.okHttpClient;
    }

    @PreDestroy
    public void destroy() {
        if (this.okHttpClient != null) {
            this.okHttpClient.dispatcher().executorService().shutdown();
            this.okHttpClient.connectionPool().evictAll();
        }
    }

}

```

### 添加feign拦截器

```java
package com.example.feignokhttp;

import okhttp3.Interceptor;
import okhttp3.Request;
import okhttp3.Response;
import okhttp3.ResponseBody;
import org.apache.commons.lang3.StringUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.IOException;

/**
 * 对feign微服务调用的拦截 自定义返回结果.
 */
public class MyOkhttpInterceptor implements Interceptor {

    Logger logger = LoggerFactory.getLogger(MyOkhttpInterceptor.class);

    public Response intercept(Chain chain) {
        Request originRequest = chain.request();
        Request request = originRequest.newBuilder().build();
        if (StringUtils.isNotEmpty(originRequest.header("Accept-Encoding"))) {
            request = originRequest.newBuilder().removeHeader("Accept-Encoding").build();
        }

        long doTime = System.nanoTime();
        Response response = null;
        try {
            response = chain.proceed(request);
            ResponseBody responseBody = response.peekBody(1024 * 1024);
            long currentTime = System.nanoTime();
            logger.info(String.format("接收响应: [%s] %n返回json:【%s】 %.1fms%n", response.request().url(), responseBody.string(), (currentTime - doTime) / 1e6d));
        } catch (IOException e) {
            logger.error("MyOkhttpInterceptor调用微服务异常需处理", e);
        }
        return response;
    }
}
```

### 微服务引用

```java
package com.example.orderservice.config;

import com.example.feignokhttp.FeignOkHttpConfig;
import org.springframework.context.annotation.Configuration;

@Configuration(proxyBeanMethods = false)
public class OrderFeignOkHttpConfig extends FeignOkHttpConfig {

}
```

## 微服务项目启动

* 请求接口
  
```bash
curl --location --request POST 'http://localhost:8180/order/create' \
--header 'Content-Type: application/json' \
--data-raw '{
    "userId": 22,
    "money": 22,
    "status": 2
}'
```

* 日志打印

```bash
[seata-order-service:192.168.130.167:8180] 2021-12-02 11:32:15.305 INFO 35216 [DED5839FF006473690890B1D7C5936B7] [ConsumeMessageThread_1] c.e.o.rocketMqConsumer.Demo01Consumer    Consumer-获取消息-主题topic为=DEMO_01, 消费消息为={"id":null,"userId":22,"productId":null,"count":null,"money":22,"status":2}
[seata-order-service:192.168.130.167:8180] 2021-12-02 11:32:15.309 INFO 35216 [DED5839FF006473690890B1D7C5936B7] [ConsumeMessageThread_1] c.e.o.rocketMqConsumer.Demo01Consumer    接受到消息通知order={"money":22,"status":2,"userId":22}
[seata-order-service:192.168.130.167:8180] 2021-12-02 11:32:18.641 INFO 35216 [DED5839FF006473690890B1D7C5936B7] [http-nio-8180-exec-1] c.e.feignokhttp.MyOkhttpInterceptor      接收响应: [http://192.168.130.167:8181/storage/decrease] 
返回json:【{"code":200,"message":"操作成功","data":"扣减库存成功！"}】 3174.9ms

[seata-order-service:192.168.130.167:8180] 2021-12-02 11:32:18.650 INFO 35216 [DED5839FF006473690890B1D7C5936B7] [http-nio-8180-exec-1] c.e.o.service.impl.OrderServiceImpl      ------->order-service中扣减库存结束
[seata-order-service:192.168.130.167:8180] 2021-12-02 11:32:18.650 INFO 35216 [DED5839FF006473690890B1D7C5936B7] [http-nio-8180-exec-1] c.e.o.service.impl.OrderServiceImpl      ------->order-service中扣减余额开始
[seata-order-service:192.168.130.167:8180] 2021-12-02 11:32:18.652 INFO 35216 [DED5839FF006473690890B1D7C5936B7] [http-nio-8180-exec-1] c.c.log.trace.FeignTraceInterceptor      FeignTraceInterceptor.request: /account/decrease?userId=22&money=22
[seata-order-service:192.168.130.167:8180] 2021-12-02 11:32:21.835 INFO 35216 [DED5839FF006473690890B1D7C5936B7] [http-nio-8180-exec-1] c.e.feignokhttp.MyOkhttpInterceptor      接收响应: [http://192.168.130.167:8182/account/decrease?userId=22&money=22] 
返回json:【{"code":200,"message":"操作成功","data":"扣减账户余额成功！"}】 3162.5ms

```

## jmeter压测对比

- todo
