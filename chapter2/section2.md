
# Arthas Trace 化接口性能

## 🎨 需求背景

### 模块场景

> 社保政策包导入处理的数据量比较大，其中导入涉及查询和插入的表多达**27**张，但是又需要确保导入的数据的完整性所以加上导入之前需要做的业务逻辑验证有**280**多条之多。模块比较复杂。年前做过一波优化，导入500条数据能控制在10秒左右，但是目前业务反馈导入500条政策包数据需要将近50多秒。本文记录如何利用 **Arthas** ，将接口优化到5秒左右。

### 测试环境

- 本地MacOs

### 社保导入时序图

> **温馨提示** :代码逻辑可以不用看，没有上下文的情况下很难明白接口什么意思。主要看Arthas Trace的结果与优化思路。可以直接跳过下面的时序图

![动图1](https://fy-image.oss-cn-beijing.aliyuncs.com/images/222%E6%94%BF%E7%AD%96%E5%8C%85%E5%AF%BC%E5%85%A5%5B%E9%99%A9%E7%A7%8D%E6%98%8E%E7%BB%86%5D.png?versionId=CAEQHBiBgMDoxrjb7hciIGVlYzA5MGMwZjEyZTRkNGRhOGJjNDc1OTQ0MGJjMTdl)

### 导入设计技术点

- 1、阿里规则引擎qlexpress <https://github.com/alibaba/QLExpress.git>
- 2、EasyExcel <https://github.com/alibaba/easyexcel.git>
- 3、Validation自定义参数验证
- 4、CompletableFuture Java8新的异步编程
- 5、引入线程池

### 优化需要的工具

> 具体的安装操作命令我就不在详细说明、下面给出了官方文档可以学习。

- **Arthas** <https://arthas.aliyun.com/doc/>

## 🎨 优化过程

### Arthas Trace的链路基本命令

#### 1、启动Arthas（阿尔萨斯）

```bash
➜  webApp java -jar arthas-boot.jar
[INFO] arthas-boot version: 3.5.4
[INFO] Process 64966 already using port 3658
[INFO] Process 64966 already using port 8563
[INFO] Found existing java process, please choose one and input the serial number of the process, eg : 1. Then hit ENTER.
* [1]: 64966 com.joyowo.smarthr.social.app.SocialSecurityApplication
  [2]: 84225 org.jetbrains.jps.cmdline.Launcher
  [3]: 63942 org.elasticsearch.bootstrap.Elasticsearch
  [4]: 88406 com.central.SCGatewayApp
  [5]: 5783 org.logstash.Logstash
  [6]: 82760 org.jetbrains.idea.maven.server.RemoteMavenServer36
  [7]: 40202 
  [8]: 13835 com.macro.mall.tiny.MallTinyApplication
```

#### 2、可以看到目前运行java程序有8个，对应的社保服务为 [1]: 64966

#### 3、输入1监控社保服务
  
```bash
1
[INFO] arthas home: /Users/apple/.arthas/lib/3.5.4/arthas
[INFO] The target process already listen port 3658, skip attach.
[INFO] arthas-client connect 127.0.0.1 3658
  ,---.  ,------. ,--------.,--.  ,--.  ,---.   ,---.                           
 /  O  \ |  .--. ''--.  .--'|  '--'  | /  O  \ '   .-'                          
|  .-.  ||  '--'.'   |  |   |  .--.  ||  .-.  |`.  `-.                          
|  | |  ||  |\  \    |  |   |  |  |  ||  | |  |.-'    |                         
`--' `--'`--' '--'   `--'   `--'  `--'`--' `--'`-----'                          
                                                                                

wiki       https://arthas.aliyun.com/doc                                        
tutorials  https://arthas.aliyun.com/doc/arthas-tutorials.html                  
version    3.5.4                                                                
main_class com.joyowo.smarthr.social.app.SocialSecurityApplication              
pid        64966                                                                
time       2021-12-20 14:20:25 
```

#### 4、输入需要监控的类方法名

```bash
trace -E com.joyowo.smarthr.social.app.controller.soc.SocPolicyPackageImportController|com.joyowo.smarthr.social.app.service.soc.service.excel.excelImpl.SocImportInsurancePolicyServiceImpl inputPolicyData|fileImportLogic -n 5
```

#### 5、利用postMen调用接口开始监控

```bash
`---ts=2021-12-20 16:50:49;thread_name=http-nio-9130-exec-6;id=d1;is_daemon=true;priority=5;TCCL=org.springframework.boot.web.embedded.tomcat.TomcatEmbeddedWebappClassLoader@6444ee23
    `---[41715.350639ms] com.joyowo.smarthr.social.app.service.soc.service.excel.excelImpl.SocImportInsurancePolicyServiceImpl$$EnhancerBySpringCGLIB$$e1a7a7ec:fileImportLogic()
        `---[41715.26805ms] org.springframework.cglib.proxy.MethodInterceptor:intercept()
            `---[41715.183862ms] com.joyowo.smarthr.social.app.service.soc.service.excel.excelImpl.SocImportInsurancePolicyServiceImpl:fileImportLogic()
                +---[108.65751ms] com.joyowo.smarthr.social.common.util.ConvertUtil:convertList() #116
                +---[0.013542ms] org.apache.commons.collections.CollectionUtils:isEmpty() #117
                +---[0.041739ms] java.util.List:parallelStream() #124
                +---[0.024564ms] java.util.stream.Stream:peek() #125
                +---[0.012501ms] java.util.stream.Stream:filter() #130
                +---[0.013719ms] java.util.stream.Collectors:toList() #131
                +---[0.904377ms] java.util.stream.Stream:collect() #131
                +---[0.006979ms] java.util.ArrayList:<init>() #134
                +---[0.012424ms] java.util.List:get() #137
                +---[0.005452ms] com.joyowo.smarthr.social.infra.vo.soc.incr.InsurancePolicyImportQuery:getVersion() #138
                +---[0.005392ms] org.apache.commons.lang3.StringUtils:isNotEmpty() #139
                +---[0.003361ms] java.util.List:parallelStream() #147
                +---[0.004242ms] java.util.stream.Stream:filter() #148
                +---[0.03109ms] java.util.stream.Collectors:groupingBy() #149
                +---[0.373782ms] java.util.stream.Stream:collect() #149
                +---[0.088922ms] java.util.Map:forEach() #150
                +---[0.010076ms] java.lang.System:currentTimeMillis() #153
                +---[0.010491ms] java.util.List:stream() #156
                +---[0.013278ms] java.util.stream.Stream:map() #157
                +---[0.003152ms] java.util.stream.Collectors:toList() #158
                +---[0.678801ms] java.util.stream.Stream:collect() #158
                +---[0.003608ms] java.util.List:stream() #161
                +---[0.004828ms] java.util.stream.Stream:map() #162
                +---[0.047344ms] java.util.stream.Stream:flatMap() #162
                +---[0.005207ms] java.util.stream.Collectors:toList() #163
                +---[14983.270241ms] java.util.stream.Stream:collect() #163
                +---[0.00341ms] java.lang.StringBuilder:<init>() #164
                +---[min=0.001995ms,max=0.02124ms,total=0.026597ms,count=3] java.lang.StringBuilder:append() #164
                +---[0.003568ms] java.lang.System:currentTimeMillis() #164
                +---[0.002694ms] java.lang.StringBuilder:toString() #164
                +---[0.08997ms] org.slf4j.Logger:info() #164
                +---[0.003315ms] java.lang.System:currentTimeMillis() #166
                +---[3.971702ms] com.joyowo.smarthr.social.app.service.soc.service.excel.excelImpl.SocImportInsurancePolicyServiceImpl:checkInsuredType() #169
                +---[0.003303ms] java.lang.StringBuilder:<init>() #171
                +---[min=0.002061ms,max=0.005269ms,total=0.010399ms,count=3] java.lang.StringBuilder:append() #171
                +---[0.003186ms] java.lang.System:currentTimeMillis() #171
                +---[0.002907ms] java.lang.StringBuilder:toString() #171
                +---[0.057445ms] org.slf4j.Logger:info() #171
                +---[0.005981ms] java.util.List:addAll() #174
                +---[26613.044218ms] com.joyowo.smarthr.social.app.service.soc.service.SocImportMiddlePolicyService:insertSocImportMiddleExcel() #175
                `---[0.017433ms] com.joyowo.smarthr.social.infra.dto.soc.socserviceinfo.ImportServiceResDto:<init>() #177
```

- 从上面的监控结果可以看出+---[14983.270241ms] java.util.stream.Stream:collect() #163 与 +---[26613.044218ms] com.joyowo.smarthr.social.app.service.soc.service.SocImportMiddlePolicyService:insertSocImportMiddleExcel() #175 这两快处理的时间比较长14秒与26秒

#### 7、[14983.270241ms] java.util.stream.Stream:collect() #1633 优化

- 定位代码

``` java
    // 同步线程池处理分别处理 单个政策包险种明细集合.
    List<CompletableFuture<List<InsurancePolicyImportQuery>>> completableFutureList = insurancePolicyImportQueryListNew
            .stream()
            .map(insurancePolicyImportList -> CompletableFuture.supplyAsync(() -> builderPolicyImportQuery(insurancePolicyImportList, staffId), executorServiceThreadPool))
            .collect(Collectors.toList());

    // 线程池数据流汇总
    List<InsurancePolicyImportQuery> policyImportQueryList = completableFutureList.stream()
            .map(CompletableFuture::join).flatMap(Collection::stream)
            .collect(Collectors.toList());
```

- 从代码上面看异步线程CompletableFuture流消耗了比较长的时间，这块我已经用了线程池处理了但是还是需要14秒的时间。下面我定位下具体的性能瓶颈在那一块

- 执行命令

``` bash
### 查看builderPolicyImportQuery最近500次调用消耗的时间
tt -t com.joyowo.smarthr.social.app.service.soc.service.excel.excelImpl.SocImportInsurancePolicyServiceImpl builderPolicyImportQuery -n 500 

INDEX        TIMESTAMP                        COST(ms)        IS-RET       IS-EXP       OBJECT                  CLASS                                            METHOD                                          
------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------
 1005         2021-12-20 16:56:51              156.198211      true         false        0x63e1155d              SocImportInsurancePolicyServiceImpl              builderPolicyImportQuery                        
 1006         2021-12-20 16:56:52              559.348797      true         false        0x63e1155d              SocImportInsurancePolicyServiceImpl              builderPolicyImportQuery                        
 1007         2021-12-20 16:56:52              569.815901      true         false        0x63e1155d              SocImportInsurancePolicyServiceImpl              builderPolicyImportQuery                        
 1008         2021-12-20 16:56:52              421.197444      true         false        0x63e1155d              SocImportInsurancePolicyServiceImpl              builderPolicyImportQuery                        
 1009         2021-12-20 16:56:52              582.496309      true         false        0x63e1155d              SocImportInsurancePolicyServiceImpl              builderPolicyImportQuery                        
 1010         2021-12-20 16:56:52              588.031464      true         false        0x63e1155d              SocImportInsurancePolicyServiceImpl              builderPolicyImportQuery                        
 1011         2021-12-20 16:56:52              139.14546       true         false        0x63e1155d              SocImportInsurancePolicyServiceImpl              builderPolicyImportQuery                        
 1012         2021-12-20 16:56:52              256.157896      true         false        0x63e1155d              SocImportInsurancePolicyServiceImpl              builderPolicyImportQuery                        
 1013         2021-12-20 16:56:52              506.299105      true         false        0x63e1155d              SocImportInsurancePolicyServiceImpl              builderPolicyImportQuery                        
 1014         2021-12-20 16:56:53              823.741301      true         false        0x63e1155d              SocImportInsurancePolicyServiceImpl              builderPolicyImportQuery                        
 1015         2021-12-20 16:56:53              882.290655      true         false        0x63e1155d              SocImportInsurancePolicyServiceImpl              builderPolicyImportQuery                        
 1016         2021-12-20 16:56:53              1052.131126     true         false        0x63e1155d              SocImportInsurancePolicyServiceImpl              builderPolicyImportQuery                        
 1017         2021-12-20 16:56:53              662.626201      true         false        0x63e1155d              SocImportInsurancePolicyServiceImpl              builderPolicyImportQuery                        
 1018         2021-12-20 16:56:53              211.884633      true         false        0x63e1155d              SocImportInsurancePolicyServiceImpl              builderPolicyImportQuery                        
 1019         2021-12-20 16:56:53              647.383149      true         false        0x63e1155d              SocImportInsurancePolicyServiceImpl              builderPolicyImportQuery                        
 1020         2021-12-20 16:56:53              439.697766      true         false        0x63e1155d              SocImportInsurancePolicyServiceImpl              builderPolicyImportQuery                        
 1021         2021-12-20 16:56:53              207.636597      true         false        0x63e1155d              SocImportInsurancePolicyServiceImpl              builderPolicyImportQuery                        
 1022         2021-12-20 16:56:53              493.055679      true         false        0x63e1155d              SocImportInsurancePolicyServiceImpl              builderPolicyImportQuery                        
 1023         2021-12-20 16:56:53              117.143492      true         false        0x63e1155d              SocImportInsurancePolicyServiceImpl              builderPolicyImportQuery                        
 1024         2021-12-20 16:56:53              534.628504      true         false        0x63e1155d              SocImportInsurancePolicyServiceImpl              builderPolicyImportQuery                        
 1025         2021-12-20 16:56:53              501.005884      true         false        0x63e1155d              SocImportInsurancePolicyServiceImpl              builderPolicyImportQuery                        
 1026         2021-12-20 16:56:53              473.501408      true         false        0x63e1155d              SocImportInsurancePolicyServiceImpl              builderPolicyImportQuery                        
 1027         2021-12-20 16:56:54              140.610755      true         false        0x63e1155d              SocImportInsurancePolicyServiceImpl              builderPolicyImportQuery                        
 1028         2021-12-20 16:56:54              133.576507      true         false        0x63e1155d              SocImportInsurancePolicyServiceImpl              builderPolicyImportQuery                        
 1029         2021-12-20 16:56:54              352.980987      true         false        0x63e1155d              SocImportInsurancePolicyServiceImpl              builderPolicyImportQuery                        
 1030         2021-12-20 16:56:54              389.299099      true         false        0x63e1155d              SocImportInsurancePolicyServiceImpl              builderPolicyImportQuery                        
 1031         2021-12-20 16:56:54              675.418435      true         false        0x63e1155d              SocImportInsurancePolicyServiceImpl              builderPolicyImportQuery                        
 1032         2021-12-20 16:56:54              604.228142      true         false        0x63e1155d              SocImportInsurancePolicyServiceImpl              builderPolicyImportQuery                        
 1033         2021-12-20 16:56:54              145.504299      true         false        0x63e1155d              SocImportInsurancePolicyServiceImpl              builderPolicyImportQuery                        
 1034         2021-12-20 16:56:54              664.244686      true         false        0x63e1155d              SocImportInsurancePolicyServiceImpl              builderPolicyImportQuery                        
 1035         2021-12-20 16:56:54              515.78755       true         false        0x63e1155d              SocImportInsurancePolicyServiceImpl              builderPolicyImportQuery                        
 1036         2021-12-20 16:56:54              511.892287      true         false        0x63e1155d              SocImportInsurancePolicyServiceImpl              builderPolicyImportQuery                        
 1037         2021-12-20 16:56:54              260.505313      true         false        0x63e1155d              SocImportInsurancePolicyServiceImpl              builderPolicyImportQuery                        
 1038         2021-12-20 16:56:55              711.800169      true         false        0x63e1155d              SocImportInsurancePolicyServiceImpl              builderPolicyImportQuery                        
 1039         2021-12-20 16:56:55              851.01159       true         false        0x63e1155d              SocImportInsurancePolicyServiceImpl              builderPolicyImportQuery                        
 1040         2021-12-20 16:56:55              847.755956      true         false        0x63e1155d              SocImportInsurancePolicyServiceImpl              builderPolicyImportQuery                        
 1041         2021-12-20 16:56:55              996.35076       true         false        0x63e1155d              SocImportInsurancePolicyServiceImpl              builderPolicyImportQuery                        
 1042         2021-12-20 16:56:56              275.979225      true         false        0x63e1155d              SocImportInsurancePolicyServiceImpl              builderPolicyImportQuery                        
 1043         2021-12-20 16:56:56              677.394178      true         false        0x63e1155d              SocImportInsurancePolicyServiceImpl              builderPolicyImportQuery                        
 1044         2021-12-20 16:56:56              1155.758544     true         false        0x63e1155d              SocImportInsurancePolicyServiceImpl              builderPolicyImportQuery                        
 1045         2021-12-20 16:56:56              649.718017      true         false        0x63e1155d              SocImportInsurancePolicyServiceImpl              builderPolicyImportQuery                        
 1046         2021-12-20 16:56:56              561.551393      true         false        0x63e1155d              SocImportInsurancePolicyServiceImpl              builderPolicyImportQuery                        
 1047         2021-12-20 16:56:56              376.715522      true         false        0x63e1155d              SocImportInsurancePolicyServiceImpl              builderPolicyImportQuery                        
 1048         2021-12-20 16:56:56              409.12387       true         false        0x63e1155d              SocImportInsurancePolicyServiceImpl              builderPolicyImportQuery                        
 1049         2021-12-20 16:56:56              424.200906      true         false        0x63e1155d              SocImportInsurancePolicyServiceImpl              builderPolicyImportQuery                        
 1050         2021-12-20 16:56:56              416.129167      true         false        0x63e1155d              SocImportInsurancePolicyServiceImpl              builderPolicyImportQuery                        
 1051         2021-12-20 16:56:56              397.683419      true         false        0x63e1155d              SocImportInsurancePolicyServiceImpl              builderPolicyImportQuery                        
 1052         2021-12-20 16:56:56              199.520089      true         false        0x63e1155d              SocImportInsurancePolicyServiceImpl              builderPolicyImportQuery                        
 1053         2021-12-20 16:56:56              199.541889      true         false        0x63e1155d              SocImportInsurancePolicyServiceImpl              builderPolicyImportQuery                        
 1054         2021-12-20 16:56:56              127.332295      true         false        0x63e1155d              SocImportInsurancePolicyServiceImpl              builderPolicyImportQuery                        
 1055         2021-12-20 16:56:56              128.146418      true         false        0x63e1155d              SocImportInsurancePolicyServiceImpl              builderPolicyImportQuery                        
 1056         2021-12-20 16:56:57              555.03217       true         false        0x63e1155d              SocImportInsurancePolicyServiceImpl              builderPolicyImportQuery                        
 1057         2021-12-20 16:56:57              603.304011      true         false        0x63e1155d              SocImportInsurancePolicyServiceImpl              builderPolicyImportQuery                        
 1058         2021-12-20 16:56:57              727.218251      true         false        0x63e1155d              SocImportInsurancePolicyServiceImpl              builderPolicyImportQuery                        
 1059         2021-12-20 16:56:57              748.817439      true         false        0x63e1155d              SocImportInsurancePolicyServiceImpl              builderPolicyImportQuery                        
 1060         2021-12-20 16:56:57              429.241338      true         false        0x63e1155d              SocImportInsurancePolicyServiceImpl              builderPolicyImportQuery                        
 1061         2021-12-20 16:56:57              408.41402       true         false        0x63e1155d              SocImportInsurancePolicyServiceImpl              builderPolicyImportQuery                        
 1062         2021-12-20 16:56:57              348.346705      true         false        0x63e1155d              SocImportInsurancePolicyServiceImpl              builderPolicyImportQuery                        
 1063         2021-12-20 16:56:57              383.235937      true         false        0x63e1155d              SocImportInsurancePolicyServiceImpl              builderPolicyImportQuery                        
 1064         2021-12-20 16:56:57              406.197608      true         false        0x63e1155d              SocImportInsurancePolicyServiceImpl              builderPolicyImportQuery                        
 1065         2021-12-20 16:56:57              187.260667      true         false        0x63e1155d              SocImportInsurancePolicyServiceImpl              builderPolicyImportQuery                        
 1066         2021-12-20 16:56:57              418.535668      true         false        0x63e1155d              SocImportInsurancePolicyServiceImpl              builderPolicyImportQuery                        
 1067         2021-12-20 16:56:57              370.246684      true         false        0x63e1155d              SocImportInsurancePolicyServiceImpl              builderPolicyImportQuery                        
 1068         2021-12-20 16:56:58              399.736148      true         false        0x63e1155d              SocImportInsurancePolicyServiceImpl              builderPolicyImportQuery                        
 1069         2021-12-20 16:56:58              431.076321      true         false        0x63e1155d              SocImportInsurancePolicyServiceImpl              builderPolicyImportQuery                        
 1070         2021-12-20 16:56:58              568.676063      true         false        0x63e1155d              SocImportInsurancePolicyServiceImpl              builderPolicyImportQuery                        
 1071         2021-12-20 16:56:58              484.667405      true         false        0x63e1155d              SocImportInsurancePolicyServiceImpl              builderPolicyImportQuery                        
 1072         2021-12-20 16:56:58              499.288637      true         false        0x63e1155d              SocImportInsurancePolicyServiceImpl              builderPolicyImportQuery                        
 1073         2021-12-20 16:56:58              311.684799      true         false        0x63e1155d              SocImportInsurancePolicyServiceImpl              builderPolicyImportQuery                        
 1074         2021-12-20 16:56:58              117.612873      true         false        0x63e1155d              SocImportInsurancePolicyServiceImpl              builderPolicyImportQuery                        
 1075         2021-12-20 16:56:58              428.263849      true         false        0x63e1155d              SocImportInsurancePolicyServiceImpl              builderPolicyImportQuery                        
 1076         2021-12-20 16:56:58              658.919487      true         false        0x63e1155d              SocImportInsurancePolicyServiceImpl              builderPolicyImportQuery                        
 1077         2021-12-20 16:56:59              787.732449      true         false        0x63e1155d              SocImportInsurancePolicyServiceImpl              builderPolicyImportQuery                        
 1078         2021-12-20 16:56:59              911.645046      true         false        0x63e1155d              SocImportInsurancePolicyServiceImpl              builderPolicyImportQuery                        
 1079         2021-12-20 16:56:59              735.019036      true         false        0x63e1155d              SocImportInsurancePolicyServiceImpl              builderPolicyImportQuery                        
 1080         2021-12-20 16:56:59              890.92491       true         false        0x63e1155d              SocImportInsurancePolicyServiceImpl              builderPolicyImportQuery                        
 1081         2021-12-20 16:56:59              120.465664      true         false        0x63e1155d              SocImportInsurancePolicyServiceImpl              builderPolicyImportQuery                        
 1082         2021-12-20 16:56:59              535.779343      true         false        0x63e1155d              SocImportInsurancePolicyServiceImpl              builderPolicyImportQuery                        
 1083         2021-12-20 16:56:59              339.609844      true         false        0x63e1155d              SocImportInsurancePolicyServiceImpl              builderPolicyImportQuery                        
 1084         2021-12-20 16:56:59              451.043089      true         false        0x63e1155d              SocImportInsurancePolicyServiceImpl              builderPolicyImportQuery                        
 1085         2021-12-20 16:56:59              432.077921      true         false        0x63e1155d              SocImportInsurancePolicyServiceImpl              builderPolicyImportQuery                        
 1086         2021-12-20 16:56:59              429.262895      true         false        0x63e1155d              SocImportInsurancePolicyServiceImpl              builderPolicyImportQuery                        
 1087         2021-12-20 16:56:59              432.023935      true         false        0x63e1155d              SocImportInsurancePolicyServiceImpl              builderPolicyImportQuery                        
 1088         2021-12-20 16:57:00              529.162614      true         false        0x63e1155d              SocImportInsurancePolicyServiceImpl              builderPolicyImportQuery                        
 1089         2021-12-20 16:57:00              546.750688      true         false        0x63e1155d              SocImportInsurancePolicyServiceImpl              builderPolicyImportQuery                        
 1091         2021-12-20 16:57:00              650.361298      true         false        0x63e1155d              SocImportInsurancePolicyServiceImpl              builderPolicyImportQuery                         
 1090         2021-12-20 16:57:00              691.807741      true         false        0x63e1155d              SocImportInsurancePolicyServiceImpl              builderPolicyImportQuery                        
 1092         2021-12-20 16:57:00              771.424599      true         false        0x63e1155d              SocImportInsurancePolicyServiceImpl              builderPolicyImportQuery                        
 1093         2021-12-20 16:57:00              701.501705      true         false        0x63e1155d              SocImportInsurancePolicyServiceImpl              builderPolicyImportQuery                        
 1094         2021-12-20 16:57:00              578.724         true         false        0x63e1155d              SocImportInsurancePolicyServiceImpl              builderPolicyImportQuery                        
 1095         2021-12-20 16:57:00              324.075264      true         false        0x63e1155d              SocImportInsurancePolicyServiceImpl              builderPolicyImportQuery                        
 1096         2021-12-20 16:57:01              549.158852      true         false        0x63e1155d              SocImportInsurancePolicyServiceImpl              builderPolicyImportQuery                        
 1097         2021-12-20 16:57:01              388.971617      true         false        0x63e1155d              SocImportInsurancePolicyServiceImpl              builderPolicyImportQuery                        
 1098         2021-12-20 16:57:01              700.969975      true         false        0x63e1155d              SocImportInsurancePolicyServiceImpl              builderPolicyImportQuery                        
 1099         2021-12-20 16:57:01              272.819632      true         false        0x63e1155d              SocImportInsurancePolicyServiceImpl              builderPolicyImportQuery                        
 1100         2021-12-20 16:57:01              600.302636      true         false        0x63e1155d              SocImportInsurancePolicyServiceImpl              builderPolicyImportQuery                        
 1101         2021-12-20 16:57:01              146.323093      true         false        0x63e1155d              SocImportInsurancePolicyServiceImpl              builderPolicyImportQuery                        
 1102         2021-12-20 16:57:01              220.823071      true         false        0x63e1155d              SocImportInsurancePolicyServiceImpl              builderPolicyImportQuery                        
 1103         2021-12-20 16:57:01              187.723078      true         false        0x63e1155d              SocImportInsurancePolicyServiceImpl              builderPolicyImportQuery                        
 1104         2021-12-20 16:57:01              426.163659      true         false        0x63e1155d              SocImportInsurancePolicyServiceImpl              builderPolicyImportQuery                        
 1105         2021-12-20 16:57:01              161.651799      true         false        0x63e1155d              SocImportInsurancePolicyServiceImpl              builderPolicyImportQuery                        
 1106         2021-12-20 16:57:01              215.692463      true         false        0x63e1155d              SocImportInsurancePolicyServiceImpl              builderPolicyImportQuery                        
 1107         2021-12-20 16:57:01              236.421642      true         false        0x63e1155d              SocImportInsurancePolicyServiceImpl              builderPolicyImportQuery                        
 1108         2021-12-20 16:57:01              279.777291      true         false        0x63e1155d              SocImportInsurancePolicyServiceImpl              builderPolicyImportQuery                        
 1109         2021-12-20 16:57:01              136.03506       true         false        0x63e1155d              SocImportInsurancePolicyServiceImpl              builderPolicyImportQuery                        
 1110         2021-12-20 16:57:02              375.909926      true         false        0x63e1155d              SocImportInsurancePolicyServiceImpl              builderPolicyImportQuery                        
 1111         2021-12-20 16:57:02              751.352407      true         false        0x63e1155d              SocImportInsurancePolicyServiceImpl              builderPolicyImportQuery                        
 1112         2021-12-20 16:57:02              780.499661      true         false        0x63e1155d              SocImportInsurancePolicyServiceImpl              builderPolicyImportQuery                        
 1113         2021-12-20 16:57:02              371.019642      true         false        0x63e1155d              SocImportInsurancePolicyServiceImpl              builderPolicyImportQuery                        
 1114         2021-12-20 16:57:02              954.038269      true         false        0x63e1155d              SocImportInsurancePolicyServiceImpl              builderPolicyImportQuery                        
 1115         2021-12-20 16:57:02              234.74004       true         false        0x63e1155d              SocImportInsurancePolicyServiceImpl              builderPolicyImportQuery                        
 1116         2021-12-20 16:57:03              899.032271      true         false        0x63e1155d              SocImportInsurancePolicyServiceImpl              builderPolicyImportQuery                        
 1117         2021-12-20 16:57:03              801.408514      true         false        0x63e1155d              SocImportInsurancePolicyServiceImpl              builderPolicyImportQuery                        
 1118         2021-12-20 16:57:03              1769.934957     true         false        0x63e1155d              SocImportInsurancePolicyServiceImpl              builderPolicyImportQuery                        
 1119         2021-12-20 16:57:03              1196.529583     true         false        0x63e1155d              SocImportInsurancePolicyServiceImpl              builderPolicyImportQuery                        
 1120         2021-12-20 16:57:03              707.24919       true         false        0x63e1155d              SocImportInsurancePolicyServiceImpl              builderPolicyImportQuery                        
 1121         2021-12-20 16:57:03              442.303587      true         false        0x63e1155d              SocImportInsurancePolicyServiceImpl              builderPolicyImportQuery                        
 1122         2021-12-20 16:57:04              657.802616      true         false        0x63e1155d              SocImportInsurancePolicyServiceImpl              builderPolicyImportQuery                        
 1123         2021-12-20 16:57:04              697.023453      true         false        0x63e1155d              SocImportInsurancePolicyServiceImpl              builderPolicyImportQuery                        
 1124         2021-12-20 16:57:04              947.249422      true         false        0x63e1155d              SocImportInsurancePolicyServiceImpl              builderPolicyImportQuery                        
 1125         2021-12-20 16:57:04              928.698927      true         false        0x63e1155d              SocImportInsurancePolicyServiceImpl              builderPolicyImportQuery                        
 1126         2021-12-20 16:57:04              877.01401       true         false        0x63e1155d              SocImportInsurancePolicyServiceImpl              builderPolicyImportQuery                        
 1127         2021-12-20 16:57:04              585.528493      true         false        0x63e1155d              SocImportInsurancePolicyServiceImpl              builderPolicyImportQuery                        
 1128         2021-12-20 16:57:04              537.837003      true         false        0x63e1155d              SocImportInsurancePolicyServiceImpl              builderPolicyImportQuery                        
 1129         2021-12-20 16:57:04              402.441286      true         false        0x63e1155d              SocImportInsurancePolicyServiceImpl              builderPolicyImportQuery                        
 1130         2021-12-20 16:57:04              420.973766      true         false        0x63e1155d              SocImportInsurancePolicyServiceImpl              builderPolicyImportQuery                        
 1131         2021-12-20 16:57:05              340.704898      true         false        0x63e1155d              SocImportInsurancePolicyServiceImpl              builderPolicyImportQuery                        
 1132         2021-12-20 16:57:05              135.479258      true         false        0x63e1155d              SocImportInsurancePolicyServiceImpl              builderPolicyImportQuery                        
 1133         2021-12-20 16:57:05              935.354655      true         false        0x63e1155d              SocImportInsurancePolicyServiceImpl              builderPolicyImportQuery                        
 1134         2021-12-20 16:57:05              912.185536      true         false        0x63e1155d              SocImportInsurancePolicyServiceImpl              builderPolicyImportQuery                        
 1135         2021-12-20 16:57:05              918.861673      true         false        0x63e1155d              SocImportInsurancePolicyServiceImpl              builderPolicyImportQuery                        
 1136         2021-12-20 16:57:05              1215.071462     true         false        0x63e1155d              SocImportInsurancePolicyServiceImpl              builderPolicyImportQuery                        
 1137         2021-12-20 16:57:06              710.389417      true         false        0x63e1155d              SocImportInsurancePolicyServiceImpl              builderPolicyImportQuery                        
 1138         2021-12-20 16:57:06              572.092564      true         false        0x63e1155d              SocImportInsurancePolicyServiceImpl              builderPolicyImportQuery                        
 1139         2021-12-20 16:57:06              600.60913       true         false        0x63e1155d              SocImportInsurancePolicyServiceImpl              builderPolicyImportQuery                        
 1140         2021-12-20 16:57:06              312.879781      true         false        0x63e1155d              SocImportInsurancePolicyServiceImpl              builderPolicyImportQuery                        
 1141         2021-12-20 16:57:06              493.355215      true         false        0x63e1155d              SocImportInsurancePolicyServiceImpl              builderPolicyImportQuery                        
 1142         2021-12-20 16:57:06              492.064888      true         false        0x63e1155d              SocImportInsurancePolicyServiceImpl              builderPolicyImportQuery                        
 1143         2021-12-20 16:57:06              611.985171      true         false        0x63e1155d              SocImportInsurancePolicyServiceImpl              builderPolicyImportQuery                        
 1144         2021-12-20 16:57:06              591.307317      true         false        0x63e1155d              SocImportInsurancePolicyServiceImpl              builderPolicyImportQuery                        
 1145         2021-12-20 16:57:06              242.383294      true         false        0x63e1155d              SocImportInsurancePolicyServiceImpl              builderPolicyImportQuery                        
 1146         2021-12-20 16:57:06              570.557541      true         false        0x63e1155d              SocImportInsurancePolicyServiceImpl              builderPolicyImportQuery                        
 1147         2021-12-20 16:57:06              567.69116       true         false        0x63e1155d              SocImportInsurancePolicyServiceImpl              builderPolicyImportQuery                        
 1148         2021-12-20 16:57:06              170.721323      true         false        0x63e1155d              SocImportInsurancePolicyServiceImpl              builderPolicyImportQuery                        
 1149         2021-12-20 16:57:07              418.166728      true         false        0x63e1155d              SocImportInsurancePolicyServiceImpl              builderPolicyImportQuery                        
 1150         2021-12-20 16:57:07              451.995443      true         false        0x63e1155d              SocImportInsurancePolicyServiceImpl              builderPolicyImportQuery                        
 1151         2021-12-20 16:57:07              544.764398      true         false        0x63e1155d              SocImportInsurancePolicyServiceImpl              builderPolicyImportQuery
```

- 从上面的执行记录列表来看调用消耗时间最长的为id 1118 消耗的时间为1769.934957 但是远远没有14秒这么长。这个时间我就开始怀疑是不是自定的线程池的核心线程数不够，导致线程排队阻塞等待消耗了过长的时间。

- 将核心线程数改为12（这个需要根据实际服务器CPU进行定义、因为我的电脑能同时并行运行12个线程，所以进行修改测试）

``` java
[arthas@63089]$ trace com.joyowo.smarthr.social.app.service.soc.service.excel.excelImpl.SocImportInsurancePolicyServiceImpl fileImportLogic  -n 5 --skipJDKMethod false Press Q or Ctrl+C to abort.
Affect(class count: 2 , method count: 2) cost in 301 ms, listenerId: 1
`---ts=2021-12-20 17:11:26;thread_name=http-nio-9130-exec-2;id=cc;is_daemon=true;priority=5;TCCL=org.springframework.boot.web.embedded.tomcat.TomcatEmbeddedWebappClassLoader@2eb217bb
    `---[45325.494296ms] com.joyowo.smarthr.social.app.service.soc.service.excel.excelImpl.SocImportInsurancePolicyServiceImpl$$EnhancerBySpringCGLIB$$71b2bc42:fileImportLogic()
        `---[45325.217732ms] org.springframework.cglib.proxy.MethodInterceptor:intercept()
            `---[45324.163449ms] com.joyowo.smarthr.social.app.service.soc.service.excel.excelImpl.SocImportInsurancePolicyServiceImpl:fileImportLogic()
                +---[200.346805ms] com.joyowo.smarthr.social.common.util.ConvertUtil:convertList() #116
                +---[3.090551ms] org.apache.commons.collections.CollectionUtils:isEmpty() #117
                +---[0.028626ms] java.util.List:parallelStream() #124
                +---[0.142501ms] java.util.stream.Stream:peek() #125
                +---[0.017361ms] java.util.stream.Stream:filter() #130
                +---[0.017943ms] java.util.stream.Collectors:toList() #131
                +---[2.131175ms] java.util.stream.Stream:collect() #131
                +---[0.012446ms] java.util.ArrayList:<init>() #134
                +---[0.014743ms] java.util.List:get() #137
                +---[0.009844ms] com.joyowo.smarthr.social.infra.vo.soc.incr.InsurancePolicyImportQuery:getVersion() #138
                +---[0.009193ms] org.apache.commons.lang3.StringUtils:isNotEmpty() #139
                +---[0.006981ms] java.util.List:parallelStream() #147
                +---[0.009976ms] java.util.stream.Stream:filter() #148
                +---[0.025218ms] java.util.stream.Collectors:groupingBy() #149
                +---[0.479762ms] java.util.stream.Stream:collect() #149
                +---[0.07377ms] java.util.Map:forEach() #150
                +---[0.014985ms] java.lang.System:currentTimeMillis() #153
                +---[0.019603ms] java.util.List:stream() #156
                +---[0.019997ms] java.util.stream.Stream:map() #157
                +---[0.007591ms] java.util.stream.Collectors:toList() #158
                +---[6.658965ms] java.util.stream.Stream:collect() #158
                +---[0.009125ms] java.util.List:stream() #161
                +---[0.014407ms] java.util.stream.Stream:map() #162
                +---[0.021132ms] java.util.stream.Stream:flatMap() #162
                +---[0.006878ms] java.util.stream.Collectors:toList() #163
                +---[14642.628763ms] java.util.stream.Stream:collect() #163
                +---[0.007086ms] java.lang.StringBuilder:<init>() #164
                +---[min=0.004245ms,max=0.023373ms,total=0.033361ms,count=3] java.lang.StringBuilder:append() #164
                +---[0.006404ms] java.lang.System:currentTimeMillis() #164
                +---[0.004974ms] java.lang.StringBuilder:toString() #164
                +---[0.154858ms] org.slf4j.Logger:info() #164
                +---[0.005872ms] java.lang.System:currentTimeMillis() #166
                +---[7.02309ms] com.joyowo.smarthr.social.app.service.soc.service.excel.excelImpl.SocImportInsurancePolicyServiceImpl:checkInsuredType() #169
                +---[0.007092ms] java.lang.StringBuilder:<init>() #171
                +---[min=0.004313ms,max=0.007412ms,total=0.018182ms,count=3] java.lang.StringBuilder:append() #171
                +---[0.005551ms] java.lang.System:currentTimeMillis() #171
                +---[0.006326ms] java.lang.StringBuilder:toString() #171
                +---[0.062544ms] org.slf4j.Logger:info() #171
                +---[0.006236ms] java.util.List:addAll() #174
                +---[30456.739038ms] com.joyowo.smarthr.social.app.service.soc.service.SocImportMiddlePolicyService:insertSocImportMiddleExcel() #175
                `---[0.067713ms] com.joyowo.smarthr.social.infra.dto.soc.socserviceinfo.ImportServiceResDto:<init>() #177
```

- 修改完核心线程数后、在进行监控发现性能并未得到提升。这样让我陷入困境。后面思考很久才反应过来虽然builderPolicyImportQuery执行的最长时间不超过1.7秒。但是一次行导入数据量太大了、不过怎么样线程阻塞时是避免不了的，但是能不能减少线程阻塞的时间让builderPolicyImportQuery运行的速度更加快。现在我用开始监控分析builderPolicyImportQuery()方法

``` java
[arthas@63089]$ trace com.joyowo.smarthr.social.app.service.soc.service.excel.excelImpl.SocImportInsurancePolicyServiceImpl builderPolicyImportQuery  -n 5 --skipJDKMethod false 
Press Q or Ctrl+C to abort. 
`---ts=2021-12-20 17:27:50;thread_name=consumer-queue_one-thread-3;id=107;is_daemon=false;priority=5;TCCL=org.springframework.boot.web.embedded.tomcat.TomcatEmbeddedWebappClassLoader@2eb217bb
    `---[616.425333ms] com.joyowo.smarthr.social.app.service.soc.service.excel.excelImpl.SocImportInsurancePolicyServiceImpl:builderPolicyImportQuery()
        +---[84.994047ms] com.joyowo.smarthr.social.app.service.soc.service.excel.excelImpl.SocImportInsurancePolicyServiceImpl:buildValidateServiceName() #266
        +---[0.011161ms] com.joyowo.smarthr.social.infra.dto.soc.socPolicyPackageImport.InsurancePolicyImportResultDTO:getInsurancePolicyImportQueryList() #267
        +---[0.008431ms] com.joyowo.smarthr.social.infra.dto.soc.socPolicyPackageImport.InsurancePolicyImportResultDTO:getValidateCode() #268
        +---[207.762527ms] com.joyowo.smarthr.social.app.service.soc.service.excel.excelImpl.SocImportInsurancePolicyServiceImpl:verificationInsurancePolicy() #273
        +---[0.006818ms] com.joyowo.smarthr.social.infra.dto.soc.socPolicyPackageImport.InsurancePolicyImportResultDTO:getInsurancePolicyImportQueryList() #274
        +---[0.005635ms] com.joyowo.smarthr.social.infra.dto.soc.socPolicyPackageImport.InsurancePolicyImportResultDTO:getValidateCode() #275
        +---[0.029254ms] com.joyowo.smarthr.social.app.service.soc.service.excel.excelImpl.SocImportInsurancePolicyServiceImpl:JudgeBasicInformation() #280
        +---[0.04544ms] com.joyowo.smarthr.social.app.service.soc.service.excel.excelImpl.SocImportInsurancePolicyServiceImpl:validationSuccessfulData() #285
        +---[0.00473ms] com.joyowo.smarthr.social.infra.dto.soc.socPolicyPackageImport.InsurancePolicyImportResultDTO:getInsurancePolicyImportQueryList() #286
        +---[0.004546ms] com.joyowo.smarthr.social.infra.dto.soc.socPolicyPackageImport.InsurancePolicyImportResultDTO:getValidateCode() #287
        +---[323.311175ms] com.joyowo.smarthr.social.app.service.soc.service.excel.excelImpl.SocImportInsurancePolicyServiceImpl:validSeasonYearPayment() #293
        +---[0.006555ms] com.joyowo.smarthr.social.infra.dto.soc.socPolicyPackageImport.InsurancePolicyImportResultDTO:getInsurancePolicyImportQueryList() #294
        `---[0.004222ms] com.joyowo.smarthr.social.infra.dto.soc.socPolicyPackageImport.InsurancePolicyImportResultDTO:getValidateCode() #295
```

- [207.762527ms] com.joyowo.smarthr.social.app.service.soc.service.excel.excelImpl.SocImportInsurancePolicyServiceImpl:verificationInsurancePolicy() #273 这块涉及的表查询比较多暂时先放着
- 看下+---[323.311175ms] com.joyowo.smarthr.social.app.service.soc.service.excel.excelImpl.SocImportInsurancePolicyServiceImpl:validSeasonYearPayment() #293  里面的主体方法为

``` java
public static String check(Object obj) {
        Class<?> clazz = obj.getClass();
        Field[] fields = clazz.getDeclaredFields();
        DataCheckBus bus = new DataCheckBus();

        // 可以进行优化.
        try {
            for (Field field : fields) {
                boolean fieldHasAnno = field.isAnnotationPresent(DataCheckAno.class);
                field.setAccessible(true);
                if (field.getName().equals("subject")) {
                    bus.addCtxValue("缴纳主体", field.get(obj));
                }

                if (fieldHasAnno) {
                    DataCheckAno dataCheckAno = field.getAnnotation(DataCheckAno.class);
                    boolean isExcelProperty = field.isAnnotationPresent(ExcelProperty.class);
                    String msg = dataCheckAno.errMsg();
                    if (isExcelProperty) {
                        ExcelProperty excelProperty = field.getAnnotation(ExcelProperty.class);
                        if (StringUtils.isEmpty(msg)) {
                            msg = excelProperty.value()[0] + "有问题";
                        }
                    }
                    Object value = field.get(obj);
                    if (Objects.nonNull(value)) {
                        DataCheck dataCheck = DataCheckFactory.CreateDataCheck(dataCheckAno.checkType(), getCheckElements(dataCheckAno), value.toString(), dataCheckAno.splitChar(), msg);
                        bus.addDataCheck(field.getName(), dataCheck);

                    }

                    bus.addCtxValue(field.getName(), value);
                }
            }

            // 这里利用阿里开源的 QLExpress表达式.进行多个字段的匹配.
            bus.exec();
        } catch (Exception e) {
            log.error("出错了", e);
            return e.getMessage();
        }

        return bus.getErrMsg();
    }
```
  
- 线程池优化后代码
  
``` java
   public static String check(Object obj) {
        Class<?> clazz = obj.getClass();
        Field[] fields = clazz.getDeclaredFields();
        DataCheckBus bus = new DataCheckBus();

        List<CompletableFuture<DataCheckBus>> completableFutureList = Arrays.stream(fields)
                .map(field -> CompletableFuture.supplyAsync(() -> getDataCheckBus(obj, bus, field)))
                .collect(Collectors.toList());

        Optional<String> first = completableFutureList.stream().map(CompletableFuture::join)
                .map(DataCheckBus::getErrMsg)
                .findFirst();
        return first.orElse("");
    }

    private static DataCheckBus getDataCheckBus(Object obj, DataCheckBus bus, Field field) {
        try {
            boolean fieldHasAnno = field.isAnnotationPresent(DataCheckAno.class);
            field.setAccessible(true);
            if (field.getName().equals("subject")) {
                bus.addCtxValue("缴纳主体", field.get(obj));
            }

            if (fieldHasAnno) {
                DataCheckAno dataCheckAno = field.getAnnotation(DataCheckAno.class);
                boolean isExcelProperty = field.isAnnotationPresent(ExcelProperty.class);
                String msg = dataCheckAno.errMsg();
                if (isExcelProperty) {
                    ExcelProperty excelProperty = field.getAnnotation(ExcelProperty.class);
                    if (StringUtils.isEmpty(msg)) {
                        msg = excelProperty.value()[0] + "有问题";
                    }
                }
                Object value;

                value = field.get(obj);
                if (Objects.nonNull(value)) {
                    DataCheck dataCheck = DataCheckFactory.CreateDataCheck(dataCheckAno.checkType(), getCheckElements(dataCheckAno), value.toString(), dataCheckAno.splitChar(), msg);
                    bus.addDataCheck(field.getName(), dataCheck);
                }
                bus.addCtxValue(field.getName(), value);
            }
        } catch (Exception e) {
            log.error("出错了", e);
            bus.setErrMsg(e.getMessage());
        }
        return bus;
    }
```

- 执行监控脚本

``` bash
`---ts=2021-12-20 17:52:00;thread_name=http-nio-9130-exec-8;id=df;is_daemon=true;priority=5;TCCL=org.springframework.boot.web.embedded.tomcat.TomcatEmbeddedWebappClassLoader@22794e83
    `---[30014.605814ms] com.joyowo.smarthr.social.app.service.soc.service.excel.excelImpl.SocImportInsurancePolicyServiceImpl$$EnhancerBySpringCGLIB$$ffc811e0:fileImportLogic()
        `---[30014.577853ms] org.springframework.cglib.proxy.MethodInterceptor:intercept()
            `---[30014.535968ms] com.joyowo.smarthr.social.app.service.soc.service.excel.excelImpl.SocImportInsurancePolicyServiceImpl:fileImportLogic()
                +---[110.543212ms] com.joyowo.smarthr.social.common.util.ConvertUtil:convertList() #116
                +---[0.006952ms] org.apache.commons.collections.CollectionUtils:isEmpty() #117
                +---[0.007221ms] java.util.List:parallelStream() #124
                +---[0.00729ms] java.util.stream.Stream:peek() #125
                +---[0.004984ms] java.util.stream.Stream:filter() #130
                +---[0.005093ms] java.util.stream.Collectors:toList() #131
                +---[1.525554ms] java.util.stream.Stream:collect() #131
                +---[0.006266ms] java.util.ArrayList:<init>() #134
                +---[0.020966ms] java.util.List:get() #137
                +---[0.010964ms] com.joyowo.smarthr.social.infra.vo.soc.incr.InsurancePolicyImportQuery:getVersion() #138
                +---[0.008972ms] org.apache.commons.lang3.StringUtils:isNotEmpty() #139
                +---[0.011198ms] java.util.List:parallelStream() #147
                +---[0.006467ms] java.util.stream.Stream:filter() #148
                +---[0.006202ms] java.util.stream.Collectors:groupingBy() #149
                +---[0.249894ms] java.util.stream.Stream:collect() #149
                +---[0.033361ms] java.util.Map:forEach() #150
                +---[0.005818ms] java.lang.System:currentTimeMillis() #153
                +---[0.005607ms] java.util.List:stream() #156
                +---[0.005114ms] java.util.stream.Stream:map() #157
                +---[0.004887ms] java.util.stream.Collectors:toList() #158
                +---[0.750822ms] java.util.stream.Stream:collect() #158
                +---[0.006638ms] java.util.List:stream() #161
                +---[0.00571ms] java.util.stream.Stream:map() #162
                +---[0.006889ms] java.util.stream.Stream:flatMap() #162
                +---[0.004805ms] java.util.stream.Collectors:toList() #163
                +---[2313.680118ms] java.util.stream.Stream:collect() #163
                +---[0.006116ms] java.lang.StringBuilder:<init>() #164
                +---[min=0.00523ms,max=0.011674ms,total=0.023571ms,count=3] java.lang.StringBuilder:append() #164
                +---[0.005221ms] java.lang.System:currentTimeMillis() #164
                +---[0.017401ms] java.lang.StringBuilder:toString() #164
                +---[0.08629ms] org.slf4j.Logger:info() #164
                +---[0.008679ms] java.lang.System:currentTimeMillis() #166
                +---[2.850653ms] com.joyowo.smarthr.social.app.service.soc.service.excel.excelImpl.SocImportInsurancePolicyServiceImpl:checkInsuredType() #169
                +---[0.006886ms] java.lang.StringBuilder:<init>() #171
                +---[min=0.00595ms,max=0.013286ms,total=0.028281ms,count=3] java.lang.StringBuilder:append() #171
                +---[0.019469ms] java.lang.System:currentTimeMillis() #171
                +---[0.007883ms] java.lang.StringBuilder:toString() #171
                +---[0.103541ms] org.slf4j.Logger:info() #171
                +---[0.007226ms] java.util.List:addAll() #174
                +---[27583.77427ms] com.joyowo.smarthr.social.app.service.soc.service.SocImportMiddlePolicyService:insertSocImportMiddleExcel() #175
                `---[0.009766ms] com.joyowo.smarthr.social.infra.dto.soc.socserviceinfo.ImportServiceResDto:<init>() #177
```

- 从上面看 +---[2313.680118ms] java.util.stream.Stream:collect() #163 由原来的14秒降为2.5秒左右，可以看出优化后的效果很明显了,但是数据库插入还是需要优化的空间很大，插入数量需要27.5秒。还是不能容忍。

#### 8、[26613.044218ms] com.joyowo.smarthr.social.app.service.soc.service.SocImportMiddlePolicyService:insertSocImportMiddleExcel() #175 优化

- 社保插入代码定位

```  java
    @Override
    public void insertSocImportMiddleExcel(List<InsurancePolicyImportQuery> insurancePolicyImportQueryList, Long staffId) {

        InsurancePolicyImportQuery insurancePolicyImportQuery01 = insurancePolicyImportQueryList.get(0);
        String version = insurancePolicyImportQuery01.getVersion();

        // 单个政策包分组.
        Map<Optional<Object>, List<InsurancePolicyImportQuery>> serviceNameMap;
        if (StringUtils.isEmpty(version)) {
            // 正常的政策包数据的导入.
            serviceNameMap = insurancePolicyImportQueryList
                    .stream()
                    .collect(Collectors.groupingBy(insurancePolicyImportQuery -> Optional.ofNullable(insurancePolicyImportQuery.getServiceName())));
        } else {
            // 期初数据的处理
            serviceNameMap = insurancePolicyImportQueryList
                    .stream()
                    .collect(Collectors.groupingBy(insurancePolicyImportQuery -> Optional.of(new OldInsurance(insurancePolicyImportQuery.getServiceName(), insurancePolicyImportQuery.getVersion()))));
        }

        // 批量导入政策包下面对应的险种明细.
        serviceNameMap.forEach((serviceName, listInsurancePolicyImportQuery) -> batchInsertPolicyDetails(listInsurancePolicyImportQuery, staffId));
    }
```

- 利用Arthas进行链路监控

```  bash
[arthas@2639]$ trace com.joyowo.smarthr.social.app.service.soc.service.excel.excelImpl.SocImportMiddlePolicyServiceImpl insertSocImportMiddleExcel  -n 5 --skipJDKMethod false 
Press Q or Ctrl+C to abort.
Affect(class count: 2 , method count: 2) cost in 155 ms, listenerId: 2
`---ts=2021-12-20 18:03:58;thread_name=http-nio-9130-exec-1;id=d8;is_daemon=true;priority=5;TCCL=org.springframework.boot.web.embedded.tomcat.TomcatEmbeddedWebappClassLoader@22794e83
    `---[29677.192994ms] com.joyowo.smarthr.social.app.service.soc.service.excel.excelImpl.SocImportMiddlePolicyServiceImpl$$EnhancerBySpringCGLIB$$c3100da3:insertSocImportMiddleExcel()
        `---[29677.131038ms] org.springframework.cglib.proxy.MethodInterceptor:intercept()
            `---[29677.047348ms] com.joyowo.smarthr.social.app.service.soc.service.excel.excelImpl.SocImportMiddlePolicyServiceImpl:insertSocImportMiddleExcel()
                +---[0.034151ms] java.util.List:get() #76
                +---[0.009812ms] com.joyowo.smarthr.social.infra.vo.soc.incr.InsurancePolicyImportQuery:getVersion() #77
                +---[0.010957ms] org.springframework.util.StringUtils:isEmpty() #81
                +---[0.013738ms] java.util.List:stream() #84
                +---[0.033014ms] java.util.stream.Collectors:groupingBy() #85
                +---[0.232753ms] java.util.stream.Stream:collect() #85
                `---[29675.068969ms] java.util.Map:forEach() #94
```

- 可以看出为这里以单个政策包集合维度循环遍历插入，消耗了大量的时间（ps:可能有同学问为啥不直接批量插入，为啥以政策包纬度拆分成多个政策包集合循环插入，因为在开始的设计中假设专员导入20个政策包，一个政策包里面有20条数据，如果全部批量导入其中一个政策包导入有问题，会导致其他19个政策包也受到影响全部回滚，同时事物过大，也会有死锁性能瓶颈，改成单个政策包插入失败不影响其他的已经导入成功的政策包，同时也适应版本产品业务的扩展）
  
- 现在将循环插入改成异步线程同时插入进行优化 优化后的代码如下

```  java
    @Override
    public void insertSocImportMiddleExcel(List<InsurancePolicyImportQuery> insurancePolicyImportQueryList, Long staffId) {

        InsurancePolicyImportQuery insurancePolicyImportQuery01 = insurancePolicyImportQueryList.get(0);
        String version = insurancePolicyImportQuery01.getVersion();

        // 单个政策包分组.
        Map<Optional<Object>, List<InsurancePolicyImportQuery>> serviceNameMap;
        if (StringUtils.isEmpty(version)) {
            // 正常的政策包数据的导入.
            serviceNameMap = insurancePolicyImportQueryList
                    .stream()
                    .collect(Collectors.groupingBy(insurancePolicyImportQuery -> Optional.ofNullable(insurancePolicyImportQuery.getServiceName())));
        } else {
            // 期初数据的处理
            serviceNameMap = insurancePolicyImportQueryList
                    .stream()
                    .collect(Collectors.groupingBy(insurancePolicyImportQuery -> Optional.of(new OldInsurance(insurancePolicyImportQuery.getServiceName(), insurancePolicyImportQuery.getVersion()))));
        }

        // 批量导入政策包下面对应的险种明细.
        List<CompletableFuture<Void>> completableFutureList = serviceNameMap.values().stream()
                .map(listInsurancePolicyImportQuery -> CompletableFuture.runAsync(() -> batchInsertPolicyDetails(listInsurancePolicyImportQuery, staffId), executorServiceThreadPool))
                .collect(Collectors.toList());

        List<Void> collect = completableFutureList.stream()
                .map(CompletableFuture::join)
                .collect(Collectors.toList());
    }
```

- 利用Arthas第二次进行链路监控

```  bash
`---ts=2021-12-20 18:18:26;thread_name=http-nio-9130-exec-1;id=c9;is_daemon=true;priority=5;TCCL=org.springframework.boot.web.embedded.tomcat.TomcatEmbeddedWebappClassLoader@1dc7aa5e
    `---[5773.558748ms] com.joyowo.smarthr.social.app.service.soc.service.excel.excelImpl.SocImportInsurancePolicyServiceImpl$$EnhancerBySpringCGLIB$$4955362a:fileImportLogic()
        `---[5773.527098ms] org.springframework.cglib.proxy.MethodInterceptor:intercept()
            `---[5773.482916ms] com.joyowo.smarthr.social.app.service.soc.service.excel.excelImpl.SocImportInsurancePolicyServiceImpl:fileImportLogic()
                +---[88.971279ms] com.joyowo.smarthr.social.common.util.ConvertUtil:convertList() #116
                +---[0.003749ms] org.apache.commons.collections.CollectionUtils:isEmpty() #117
                +---[0.003795ms] java.util.List:parallelStream() #124
                +---[0.005299ms] java.util.stream.Stream:peek() #125
                +---[0.003141ms] java.util.stream.Stream:filter() #130
                +---[0.003218ms] java.util.stream.Collectors:toList() #131
                +---[0.30375ms] java.util.stream.Stream:collect() #131
                +---[0.00307ms] java.util.ArrayList:<init>() #134
                +---[0.002584ms] java.util.List:get() #137
                +---[0.003098ms] com.joyowo.smarthr.social.infra.vo.soc.incr.InsurancePolicyImportQuery:getVersion() #138
                +---[0.002834ms] org.apache.commons.lang3.StringUtils:isNotEmpty() #139
                +---[0.003085ms] java.util.List:parallelStream() #147
                +---[0.003221ms] java.util.stream.Stream:filter() #148
                +---[0.003221ms] java.util.stream.Collectors:groupingBy() #149
                +---[0.10336ms] java.util.stream.Stream:collect() #149
                +---[0.043665ms] java.util.Map:forEach() #150
                +---[0.003108ms] java.lang.System:currentTimeMillis() #153
                +---[0.002985ms] java.util.List:stream() #156
                +---[0.002976ms] java.util.stream.Stream:map() #157
                +---[0.002776ms] java.util.stream.Collectors:toList() #158
                +---[0.385588ms] java.util.stream.Stream:collect() #158
                +---[0.004416ms] java.util.List:stream() #161
                +---[0.003196ms] java.util.stream.Stream:map() #162
                +---[0.004249ms] java.util.stream.Stream:flatMap() #162
                +---[0.00259ms] java.util.stream.Collectors:toList() #163
                +---[3091.015869ms] java.util.stream.Stream:collect() #163
                +---[0.007667ms] java.lang.StringBuilder:<init>() #164
                +---[min=0.003987ms,max=0.007206ms,total=0.017818ms,count=3] java.lang.StringBuilder:append() #164
                +---[0.02226ms] java.lang.System:currentTimeMillis() #164
                +---[0.004207ms] java.lang.StringBuilder:toString() #164
                +---[0.077231ms] org.slf4j.Logger:info() #164
                +---[0.004189ms] java.lang.System:currentTimeMillis() #166
                +---[1.441181ms] com.joyowo.smarthr.social.app.service.soc.service.excel.excelImpl.SocImportInsurancePolicyServiceImpl:checkInsuredType() #169
                +---[0.004972ms] java.lang.StringBuilder:<init>() #171
                +---[min=0.004123ms,max=0.006863ms,total=0.01571ms,count=3] java.lang.StringBuilder:append() #171
                +---[0.004527ms] java.lang.System:currentTimeMillis() #171
                +---[0.003641ms] java.lang.StringBuilder:toString() #171
                +---[0.046302ms] org.slf4j.Logger:info() #171
                +---[0.003856ms] java.util.List:addAll() #174
                +---[2590.486166ms] com.joyowo.smarthr.social.app.service.soc.service.SocImportMiddlePolicyService:insertSocImportMiddleExcel() #175
                `---[0.006675ms] com.joyowo.smarthr.social.infra.dto.soc.socserviceinfo.ImportServiceResDto:<init>() #177
```

- 政策包的插入可以看出由原来的30s已经优化到2.5s,性能提升明显。

## 🔌 总结

### 性能提升7倍

- 原来导入500条政策包的数据由41.7秒提升至5.7秒，但是还如我刚才所说的还是有优化空间的代码。但是目前也足够支撑业务逻辑了。在就是大批量数据插入数据库也需要2.5秒也是性能瓶颈，如果需要达到秒级话，可以使用mogodb替代mysql

### 结论

- 对于性能分析和优化一定要有合适工具，才能得出有用的结论并针对性优化。一开始我以为增加核心线程数就可以异步线程编程就万事大吉了，但实际上性能消耗的大头并不在这里。还是得借助 Arthas 的 Trace 才能真正针对性地优化。

## 四、👉  Arthas—常用命令汇总

![动图1](https://images.gitee.com/uploads/images/2020/0108/104941_6631b8d1_32691.png)

## 实战Arthas工具Trace命令排查接口调用链路将Excel政策包导入性能提升七倍

### 大纲

> 目前线上排查整个接口的调用主要还是依赖Skywalking，但是Skywalking不能很直观的统计接口中对应的每个方法调用的次数和所消耗的时间，Arthas是Alibaba开源的Java诊断工具，通过Arthas可以得到监控。下面是我在使用在使用Arthas对社保系统中政策包导入（导入过程中涉及27张表的查询和插入，整体系统逻辑比较复杂）在排查优化过程中遇到的问题的思考的方法的排查过程。在本地调试优化后将原有的500条政策包导入数据由原来的45秒压缩至5秒多。提升整体的系统性能。

- 代码逻辑可以不用看，没有上下文的情况下很难明白接口什么意思。主要看Arthas Trace的结果与优化思路

### 优化后压测结果(还有优化空间，但是目前足以满足业务需求)

- 500条政策包数据导入 消耗时间5.5s

- 1000条政策包数据导入 消耗时间10s （ps:数据库瓶瓶颈、入库消耗4.5s）

- 2000条政策包数据导入 消耗时间20s （ps:数据库瓶颈，入库消耗10s）

