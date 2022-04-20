# 技术方案示例

> [!note]
>
> 本次政策服务网点迭代主要迭代功能
>
> - 增加<font color=red>**【残保金比例】**</font>参数  政策包的险种类型等于残保金时显示，且必填
>
> - 增加<font color=red>**【所有险种统一】**</font>参数 政策包的险种类型=社保或公积金时显示，且必选一个
>
> - 修改增加<font color=red>**【参保时公积金是否必缴参数】改为【参保时公积金按户籍性质设置】**</font>参数
>
> - 参保时公积金按户籍性质设置: 均必缴、均可选、自主设置，默认为均必缴
>   - <font color=red>**【必缴户籍】**</font> 选择自主设置时，【必缴户籍】参数显示
>
> - 历史数据处理
>
> - 社保接单导入支持险种异常导入
>   - 待申报
>   - 申报中
>   - 派单异常
> - 反馈异常，消息通知

## 社保服务用例图

> 注：蓝色表示本次迭代需要修改的用例、红色代表目前暂时不作修改的用例

### 社保服务网点用例图

![图片3](https://fy-image.oss-cn-beijing.aliyuncs.com/images/234usecase-sample.png?versionId=CAEQFRiBgIDngNS52hciIGY4NDc5ZDUxZjkxODRjMmViN2IyMGI5YmQ0Zjg3ZmY0)

### 社保增加接单用例图

![图片4](https://fy-image.oss-cn-beijing.aliyuncs.com/images/4444usecase-sample.png?versionId=CAEQFRiBgICr.aTI2hciIGJjNjc2NWM3YjliNTQ0MzA4N2YwMWYyMTY1Y2JkNDQz)

## 数据库模型图

### 社保服务网点数据模型图

### 社保增员派单接单模型图

## 社保服务列表

### 社保服务表

```sql
ADD COLUMN `disability_proportion` decimal(18) UNSIGNED NOT NULL DEFAULT 0.00 COMMENT '残保金比例' AFTER `reconciliation_manner`,
ALTER TABLE `smarthr-service`.`soc_service_info`
ADD COLUMN is_mandatory int(11) NULL COMMENT '参保时公积金按户籍性质设置：0-均可选,1-均必缴,2-自主设置';
ADD COLUMN `insurance_agreement` int(3) NOT NULL DEFAULT 0 COMMENT '是否所有险种统一 0:否 1:是' AFTER `disability_proportion`,

CREATE TABLE `soc_service_info_census` (
  `id` bigint(20) NOT NULL COMMENT '主键',
  `service_id` bigint(20) NOT NULL COMMENT '社保服务网点ID',
  `census_id` bigint(20) NOT NULL COMMENT '户籍性质ID 对应census_info-ID',
  `census_name` varchar(64) DEFAULT NULL COMMENT '户籍性质',
  `hidden_memo` varchar(255) DEFAULT '' COMMENT '备注，对项目隐藏，仅在数据库中可见',
  `create_staff_id` bigint(20) NOT NULL DEFAULT '-1' COMMENT '创建人staffId',
  `create_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
  `update_staff_id` bigint(20) DEFAULT '-1' COMMENT '更新者staffId',
  `update_time` datetime DEFAULT CURRENT_TIMESTAMP COMMENT '更新时间',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COMMENT='必缴纳的户籍信息表';

```

### 管理端展现

![图片2](https://fy-image.oss-cn-beijing.aliyuncs.com/images/13WechatIMG27.png?versionId=CAEQFRiBgMCk0Za22hciIDRjNmMxN2Y0N2NhZDQ4YzM4YzhjYTU5NDY1MzRkYWY1)

## 四、社保预计开发时间

![图片5](https://fy-image.oss-cn-beijing.aliyuncs.com/images/77WechatIMG30.png?versionId=CAEQFRiBgIDSu8a32hciIGY4ZjA0YzAzM2UzYzQ1YmE5ZDA1NDc5MGNkOWViYzM2)
