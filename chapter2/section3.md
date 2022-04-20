# 代码ReCoding同步钉钉考勤记录

> [!note]
>
> 目前钉钉同步考勤定时执行很慢、故做此ReCoding优化
> 文档: <https://developers.dingtalk.com/document/app/invocation-frequency-limit>

## 钉钉第三方文档

### IP维度

* 每个IP调用所有接口总量，最高20秒6000次。
* 触发限流，会禁止调用5分钟。

### 企业内部应用

* 每个应用，调用每个接口，最高频率40次/秒。触发限流，返回错误码90018。
* 每个应用，调用每个接口，最高频率1500次/分。触发限流，返回错误码90006。

### 批量处理数据

* 钉钉每次限制最多批量处理50条数据

## 涉及的表名称

* 1、dd_business_info **企业客户信息表**
* 2、dd_person **每日投保项目人员表**
* 3、dd_attendance_record **考勤记录表**
* 4、dd_daily_insurance_person **每日投保项目人员表**

## 性能分析优化方案

> [!note]
>
> **同步钉钉考勤打卡记录**.

- 1、目前是定时器每半个小时执行一次(是否可以减少执行频率)
  
- 2、每次都是扫描全部的钉钉人员，如果对于已经打卡成功的需要做个标识，下次定时器进来的时候。把这批数据过滤掉。减少数据量。或者吧这批数据全部放入缓存中。减少对数据库连接的压力。
  
- 3、执行完成一次的正常平均时间是2分钟。（存在2分钟的数据库表的行级锁锁定数据，占用大量服务器资源得不到释放、从而导致很卡）
  
- 4、大事物包裹@Transactional注解包裹的整个方法都是使用同一个connection连接。出现了耗时的操作，调用钉钉第三方接口调用，业务逻辑复杂，大批量数据处理等就会导致我们我们占用这个connection的时间会很长，数据库连接一直被占用不释放。一旦类似操作过多，就会导致数据库连接池耗尽。
  
- 5、 for循环嵌套的太多，性能瓶颈。 立采用了两次递归 感觉没必要。
  
- 6、采用声明式编程式事务代替原有的spring官方自带的事物注解.
  
- 7、如果需要知道这批人员的执行成功的数据，必须采用线程池进行优化。如果不需要的话，采用RocketMQ进行解耦。宁愿每个人员的执行发送一次消息，这样可以在短时间内减少对数据库链接释放时间。
  
- 8、尽量把所有的update和insert放在同一个事物中，将select剔除出去. 将整体的事物更小细粒话。不然会出现批量执行1000条数据，其中901条失败，会将前面900已经成功的数据全部回滚，导致死锁。执行时间长达30分钟
  
- 9、代码规范需要在抽象下，一些set方法可以放在对象中 代码简洁  DDD模式

- 10、SELECT id   FROM dd_person   WHERE dd_user_id = ?   AND business_id = ?   AND is_delete = 0  LIMIT 1  将单个索引改成组合索引 （ KEY `idx_dduserid` (`dd_user_id`) USING BTREE,KEY `idx_businessid` (`business_id`) USING BTREE）。调用数据库的次数太多，可以考虑放到缓存redis中 .

```xml
EXPLAIN SELECT
 id 
FROM
 dd_person 
WHERE
 dd_user_id = 403243223326492142
 AND business_id = 137241432330272768
 AND is_delete = 0 
 LIMIT 1
```

<https://www.cnblogs.com/xuanzhi201111/p/4175635.html>  表结构索引建立无效、需要修改

## 同步钉钉考勤记录代码重构优化

### 重构分支地址

* master_fixedFY

### 重构新增技术点

* 1、引入线程池（自己封装的在com.joyowo.util.thread. TreadPoolConfig类下面）
* 2、利用CompletableFuture Java8新的异步编程方式有优化
* 3、基于PlatformTransactionManager的编程式事务管理优化原有的大事物。减少死锁占有数据库链接的现象
* 4、日志系统加入了彩色日志依赖的渲染类个人习惯 logback-spring.xml

### 目前重构情况

* 已经重构了百分之80、细节方面我并不打算在进行补充。理论上按照目前的的方案。接口应该能在10秒内跑完。目前并没有线上数据库的权限。无法进行压测评估.

### 后续

* <font color=red>后续的慢接口参考目前我这边的代码建议。也可以进行优化。现在主要是给做一个范例进行参考</font>
