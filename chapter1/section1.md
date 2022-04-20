# 规则引擎QLExpress

## 前言

> [!note]
>
> - 目前业务逻辑比较复杂，只有不断的添加if-else去满足复杂的业务场景，规则逻辑在不断的发生改变，如果在代码中写死，那么发生一个改变就需要改一下代码，测试人员需要进行全链路的回归后，在进行系统的发布上线，引擎可以改变目前现状，通过高效可靠的方式去适应这些业务规则的改变。
> - 增加业务的透明程度，目前只能通过代码口口相传.
> - 规则引擎能将业务判断逻辑从系统逻辑中捷解藕出来，使多种逻辑可以独立而变化，降低逻辑的维护成本。
> - 减少业务人员和开发人员的矛盾，开发人员通常会因为一些时间因素或者一些理解不到位导致业务人员的规则实现有偏差。
> - 之前刚进如社保组的写的第一个模块是政策包导入，一个完整的excel表头字段有150个，目前先抛开性能优化的解决的难点。目前只讨论针对灵活多变的参数验证可以多达300多条，单纯用java硬编码的话，单单验证这块代码量可能就会超过一万行。这个时候就需要引入今天我要说的规则引擎。
> - 说明: 下面的活动图、状态图都是根据plantuml脚本语言生成的。另外还支持顺序图、用例图、类图、对象图、组建图、部署图、时序图等。 网站:<https://plantuml.com/zh/>

## 常见的案例分析

> [!note]
>
> 首先来看下项目中一些实际业务场景。通过这些场景能更好的理解什么是规则。在每个场景后面都介绍系统现在使用的解决方案以及主要的优缺点。

### **对于表单投保（康康）信息验证**

#### 场景

康康中的企业表单投保导入入库前，投保单作为投保的第一个门卡，其中的第一步就是针对一些字段的校验规则。 </br>
下面梳理了在投保过程中投保人信息的业务校验的规则模型（简化），如下图 :

![动图1](https://fy-image.oss-cn-beijing.aliyuncs.com/%E8%A1%A8%E5%8D%95%E6%8A%95%E4%BF%9D.png)

规则主体包含三部分

* **1、分支条件**: 分支内逻辑条件为“==”和“<”。
* **2、简单计算规则**: 如：字符串长度。
* **3、业务定制计算规则**: 岗位选定范围、投保年龄要求、日志格式等。

#### 方案-硬编码

```java
// 验证基础信息
private void checkBaseInfo(FormImportBO importBO, StringBuilder errMsg, PcFormStaffRecordEntity entity) {
    if (StringUtils.isEmpty(importBO.getName())) {
        errMsg.append("员工姓名不能为空;");
    }
    if (StringUtils.isNotEmpty(importBO.getName()) && !StringUtils.isName(importBO.getName().trim())) {
        errMsg.append("员工姓名格式不正确;");
    }
    if (StringUtils.isEmpty(importBO.getIdentityCard())) {
        errMsg.append("身份证号码不能为空;");
    }
    if (StringUtils.isNotEmpty(importBO.getIdentityCard()) && !StringUtils.isIDCard(importBO.getIdentityCard().trim())) {
        errMsg.append("身份证号码格式不正确;");
    }
    if (StringUtils.isNotEmpty(importBO.getPhone()) && !StringUtils.isMobile(importBO.getPhone().trim())) {
        errMsg.append("手机号格式不正确;");
    }
    if (StringUtils.isNotEmpty(importBO.getDepartment()) && importBO.getDepartment().trim().length() > 50) {
        errMsg.append("部门字数不可超过50;");
    }
```

#### 优点

* 1、当规则较少、变动不频繁时，开发效率最高。
* 2、稳定性较佳：语法级别错误不会出现，由编译系统保证。

#### 缺点

* 1、规则迭代成本高：对规则的少量改动就需要走全流程（开发、测试、部署）。
* 2、当存量规则较多时，可维护性差。
* 3、规则开发和维护门槛高：规则对业务分析人员不可见。业务分析人员有规则变更需求后无法自助完成开发，需要由开发人员介入开发。

### **发票报销审批流程**

> [!note]
>
> 流程控制中心（负责在运行时根据输入的报销金额大小选择不同的流程流程节点从而构建一个流程实例），根据报销金额的大小确定本次审批走那些节点，其中的选择策略模型如下。

#### 规则配置流转图

![动图1](https://fy-image.oss-cn-beijing.aliyuncs.com/%E6%8A%A5%E9%94%80%E9%87%91%E9%A2%9D%E5%AE%A1%E6%89%B9%E6%B5%81%E7%A8%8B.png)

规则主体是分支条件

* 分支条件是“>、boolean”，参与计算的参数是固定值和用户输入时序报销的金额。

#### 正常的规则配置流程

![动图1](https://fy-image.oss-cn-beijing.aliyuncs.com/%E8%A7%84%E5%88%99%E6%B5%81%E8%BD%AC%E6%B5%81%E7%A8%8B.png)

上图中QLExpress就是规则的主体，可配置的规则如下

```bash
if (approved(经理, 金额)) {
    if (金额 > 5000) {
        if (审批通过(总监, 金额)) {
            if (审批通过(财务, 金额)) {
                报销入账(金额)
            } else {
                打回修改(申请人)
            }
        } else {
            打回修改(申请人)
        }
    } else {
        if (审批通过(财务, 金额)) {
            报销入账(金额)
        } else {
            打回修改(申请人)
        }
    }
} else {
    打回修改(申请人)
}
打印("完成")

function 审批通过(String a, int b){
    System.out.println(a + "审批:金额:" + b);
    if(b > 6000)
        return false;
    return true;
}

function 报销入账(int a){
    System.out.println("报销入卡:金额:" + a);
}

function 打回修改(String a){
    System.out.println("重填:申请人:" + a);
}
```

#### 3、Java脚本语言示例

```java
/**
     * 执行一段文本
     *
     * @throws Exception 异常抛出
     */
    @Test
    public void testApprove1() throws Exception {
        String express = ""
                + "if (审批通过(经理, 金额)) {\n"
                + "    if (金额 > 5000) {\n"
                + "        if (审批通过(总监, 金额)) {\n"
                + "            if (审批通过(财务, 金额)) {\n"
                + "                报销入账(金额)\n"
                + "            } else {\n"
                + "                打回修改(申请人)\n"
                + "            }\n"
                + "        } else {\n"
                + "            打回修改(申请人)\n"
                + "        }\n"
                + "    } else {\n"
                + "        if (审批通过(财务, 金额)) {\n"
                + "            报销入账(金额)\n"
                + "        } else {\n"
                + "            打回修改(申请人)\n"
                + "        }\n"
                + "    }\n"
                + "} else {\n"
                + "    打回修改(申请人)\n"
                + "}\n"
                + "打印(\"完成\")\n";
        System.out.println("express = " + express);
        ExpressRunner runner = new ExpressRunner();

        // 定义操作符别名
        runner.addFunctionOfServiceMethod("打印", new AccountServiceApplicationTests(), "println", new String[]{"String"}, null);

        // 定义方法
        runner.addFunction("审批通过", new ApproveOperator(1));
        runner.addFunction("报销入账", new ApproveOperator(2));
        runner.addFunction("打回修改", new ApproveOperator(3));

        // 设置上下文变量
        IExpressContext<String, Object> expressContext = new DefaultContext<>();
        expressContext.put("经理", "王经理");
        expressContext.put("总监", "李总监");
        expressContext.put("财务", "张财务");
        expressContext.put("申请人", "小强");
        expressContext.put("金额", 4000);

        runner.execute(express, expressContext, null, false, false);
    }

package com.example.accountservice;

import com.ql.util.express.Operator;

/**
 * 定义一个继承自com.ql.util.express.Operator的操作符
 */
public class ApproveOperator extends Operator {

    private final int operator;

    public ApproveOperator(int op) {
        this.operator = op;
    }

    @Override
    public Object executeInner(Object[] list) {
        if (this.operator == 1) {
            System.out.println(list[0] + "审批:金额:" + list[1]);
            return ((Integer) list[1]) <= 6000;
        } else if (this.operator == 2) {
            System.out.println("报销入卡:金额:" + list[0]);
        } else {
            System.out.println("重填:申请人:" + list[0]);
        }
        return true;
    }
}

```

#### 4、优点

* 策略规则和执行逻辑解耦方便维护。
* <font color=blue>可以将对应的规则语句放入到mysql等数据库，如果规则有变更，可通过后台管理端对数据库中的规则语句进行操作，规则引擎直接读取最新的规则语句，就可以达到动态更新规则不影响业务需求和运行的服务实例。 </font>

#### 5、缺点

* 1、业务分析师无法独立完成规则配置：由于规则主体QLE是编程语言（支持Java），因此仍然需要开发工程师维护。
* 2、规则规模变大以后也会变得不好维护，相对硬编码的优势便不复存在。

### **其他待补充todo**

## QLExpree介绍

### 背景介绍

> [!note]
>
> 由阿里的电商业务规则、表达式（布尔组合）、特殊数学公式计算（高精度）、语法分析、脚本二次定制等强需求而设计的一门动态脚本引擎解析工具。 在阿里集团有很强的影响力，同时为了自身不断优化、发扬开源贡献精神，于2012年开源。
> QLExpress脚本引擎被广泛应用在阿里的电商业务场景，具有以下的一些特性:
> 下面介绍都是引用地址: <https://github.com/alibaba/QLExpress> 具体的可以看开源的框架的介绍 里面介绍的更加较详细.
>
> - 1、线程安全，引擎运算过程中的产生的临时变量都是threadlocal类型。
>
> - 2、高效执行，比较耗时的脚本编译过程可以缓存在本地机器，运行时的临时变量创建采用了缓冲池的技术，和groovy性能相当。
>
> - 3、弱类型脚本语言，和groovy，javascript语法类似，虽然比强类型脚本语言要慢一些，但是使业务的灵活度大大增强。
>
> - 4、安全控制, 可以通过设置相关运行参数，预防死循环、高危系统api调用等情况。
>
> - 5、代码精简，依赖最小，250k的jar包适合所有java的运行环境，在android系统的低端pos机也得到广泛运用。

### java语法

> [!note]
>
> 支持 +, -, *, /, <, >, <=, >=, ==, !=, <>【等同于!=】, %, mod【取模等同于%】, ++, --, in【类似sql】, like【sql语法】, &&, ||, !, 等操作符 支持for，break、continue、if then else 等标准的程序控制逻辑

#### 1、与java语法相比，避免的一些ql写法错误

* 1、不支持try{}catch{}
* 2、注释目前只支持 /****/，不支持单行注释 //
* 3、不支持java8的lambda表达式
* 4、不支持for循环集合操作for (Item item : list)
* 5、弱类型语言，请不要定义类型声明, 更不要用Template（Map<String, List>之类的）
* 6、array的声明不一样
* 7、min, max, round, print, println, like, in 都是系统默认函数的关键字，请不要作为变量名

#### 2、依赖引入

```pom
<dependency>
  <groupId>com.alibaba</groupId>
  <artifactId>QLExpress</artifactId>
  <version>3.2.0</version>
</dependency>
```

#### 3、扩展操作符Operator

##### 1、替换 if then else 等关键字

```java
  /**
     * 替换 if then else 等关键字
     *
     * @throws Exception 异常抛出
     */
    @Test
    public void test1() throws Exception {
        ExpressRunner runner = new ExpressRunner();

        runner.addOperatorWithAlias("如果", "if", null);
        runner.addOperatorWithAlias("则", "then", null);
        runner.addOperatorWithAlias("否则", "else", null);

        String express = "如果 (语文 + 数学 + 英语 > 270) 则 {return 1;} 否则 {return 0;}";
        DefaultContext<String, Object> context = new DefaultContext<>();
        Object execute = runner.execute(express, context, null, false, false, null);
        log.info("返回值:" + execute.toString());
    }
```

##### 2、自定义Operator

```java
package com.example.accountservice;

import com.ql.util.express.Operator;

/**
 * 定义一个继承自com.ql.util.express.Operator的操作符
 */
public class ApproveOperator extends Operator {

    private final int operator;

    public ApproveOperator(int op) {
        this.operator = op;
    }

    @Override
    public Object executeInner(Object[] list) {
        if (this.operator == 1) {
            System.out.println(list[0] + "审批:金额:" + list[1]);
            return ((Integer) list[1]) <= 6000;
        } else if (this.operator == 2) {
            System.out.println("报销入卡:金额:" + list[0]);
        } else {
            System.out.println("重填:申请人:" + list[0]);
        }
        return true;
    }
}
```

##### 3、如何使用Operator

```java
    @Test
    public void test2() throws Exception {
        ExpressRunner runner = new ExpressRunner();
        DefaultContext<String, Object> context = new DefaultContext<>();
        runner.addFunction("join", new ApproveOperator(1));

        String express = "join('客户经理', 2000)";
        Object execute = runner.execute(express, context, null, false, false, null);
        log.info("返回值:" + execute.toString());
    }
```

#### 4、绑定java类或者对象的method

```java
    /**
     * 绑定java类或者对象的method
     *
     * @param abc 需要转换大小的字符串.
     * @return the String
     */
    public static String upper(String abc) {
        return abc.toUpperCase();
    }

    /**
     * 绑定java类或者对象的method.
     *
     * @throws Exception 数据异常.
     */
    @Test
    public void test4() throws Exception {
        ExpressRunner runner = new ExpressRunner();
        runner.addFunctionOfClassMethod("转换为大写", AccountServiceApplicationTests.class.getName(), "upper", new String[]{"String"}, null);
        String express = "转换为大写(\"hello world\")";
        DefaultContext<String, Object> context = new DefaultContext<>();
        Object execute = runner.execute(express, context, null, false, false, null);
        log.info("返回值:" + execute.toString());
    }

```

#### 5、macro 宏定义

```java
    /**
     * macro 宏定义<可以在导入的时候做参数验证></>
     *
     * @throws Exception 异常数据
     */
    @Test
    public void test5() throws Exception {
        ExpressRunner runner = new ExpressRunner();
        runner.addMacro("计算平均成绩", "(语文+数学+英语)/3.0");
        runner.addMacro("是否优秀", "计算平均成绩>90");
        IExpressContext<String, Object> context = new DefaultContext<>();
        context.put("语文", 88);
        context.put("数学", 99);
        context.put("英语", 95);
        Object result = runner.execute("是否优秀", context, null, false, false);
        log.info("是否优秀:" + result);

        Object execute = runner.execute("计算平均成绩", context, null, false, false);
        log.info("计算平均成绩:" + execute);
    }
```

#### 6、编译脚本，查询外部需要定义的变量和函数

```java
    /**
     * 获取一个表达式需要的外部变量名称列表
     *
     * @throws Exception 异常信息.
     */
    @Test
    public void test6() throws Exception {
        String express = "int 平均分 = (语文 + 数学 + 英语 + 综合考试.科目2) / 4.0; return 平均分";
        ExpressRunner runner = new ExpressRunner(true, true);
        String[] names = runner.getOutVarNames(express);
        for (String s : names) {
            log.info("var:" + s);
        }
    }
```

#### 7、集合的快捷写法

```java
    /**
     * 集合的快捷写法
     *
     * @throws Exception 异常信息
     */
    @Test
    public void test7() throws Exception {

        ExpressRunner runner = new ExpressRunner(false, false);
        DefaultContext<String, Object> context = new DefaultContext<>();

        String express = "abc = NewMap(1:1, 2:2); return abc.get(1) + abc.get(2);";
        Object r = runner.execute(express, context, null, false, false);
        log.info("r :" + r);

        express = "abc = NewList(1, 2, 3); return abc.get(1) + abc.get(2)";
        r = runner.execute(express, context, null, false, false);
        log.info("r :" + r);

        express = "abc = [1, 2, 3]; return abc[1] + abc[2];";
        r = runner.execute(express, context, null, false, false);
        log.info("r :" + r);
    }
```

## 运行参数和API列表介绍

![动图1](https://camo.githubusercontent.com/87a5599b4d8d89367e32e96121519f10767ae061120885789101ae9c87065659/687474703a2f2f617461322d696d672e636e2d68616e677a686f752e696d672d7075622e616c6979756e2d696e632e636f6d2f64656339303462303033616261313563626631616632373236393134646465652e6a7067)

### 1、属性开关

#### **isPrecise**

> 高精度计算在会计财务中非常重要，java的float、double、int、long存在很多隐式转换，做四则运算和比较的时候其实存在非常多的安全隐患。 所以类似汇金的系统中，会有很多BigDecimal转换代码。而使用QLExpress，你只要关注数学公式本身 订单总价 = 单价 *数量 + 首重价格 + （ 总重量 - 首重）* 续重单价 ，然后设置这个属性即可，所有的中间运算过程都会保证不丢失精度。

```java
/**
 * 是否需要高精度计算
 */
private boolean isPrecise = false;
```

#### **isTrace**

```java
/**
 * 是否输出所有的跟踪信息，同时还需要log级别是DEBUG级别
 */
private boolean isTrace = false;
```

### 2、调用入参

```java
/**
 * 执行一段文本
 * @param expressString 程序文本
 * @param context 执行上下文，可以扩展为包含ApplicationContext
 * @param errorList 输出的错误信息List
 * @param isCache 是否使用Cache中的指令集,建议为true
 * @param isTrace 是否输出详细的执行指令信息，建议为false
 * @param aLog 输出的log
 * @return object
 * @throws Exception
 */
Object execute(String expressString, IExpressContext<String, Object> context, List<String> errorList, boolean isCache, boolean isTrace, Log aLog);
```

## 功能扩展API列表

### 安全风险控制

#### 防止死循环

```java
try {
    express = "sum = 0; for(i = 0; i < 1000000000; i++) {sum = sum + i;} return sum;";
    //可通过timeoutMillis参数设置脚本的运行超时时间:1000ms
    Object r = runner.execute(express, context, null, true, false, 1000);
    System.out.println(r);
    throw new Exception("没有捕获到超时异常");
} catch (QLTimeOutException e) {
    System.out.println(e);
}
```

#### 防止调用不安全的系统api

```java
ExpressRunner runner = new ExpressRunner();
QLExpressRunStrategy.setForbiddenInvokeSecurityRiskMethods(true);

DefaultContext<String, Object> context = new DefaultContext<String, Object>();
try {
    express = "System.exit(1);";
    Object r = runner.execute(express, context, null, true, false);
    System.out.println(r);
    throw new Exception("没有捕获到不安全的方法");
} catch (QLException e) {
    System.out.println(e);
}
```

## 增强上下文参数Context相关的api与spring框架集成

### 与spring框架的无缝集成

> 上下文参数 IExpressContext context 非常有用，它允许put任何变量，然后在脚本中识别出来

```java
package com.example.orderservice.service.spring;

import com.ql.util.express.IExpressContext;
import org.springframework.context.ApplicationContext;

import java.util.HashMap;
import java.util.Map;

public class QLExpressContext extends HashMap<String, Object> implements IExpressContext<String, Object> {
    private final ApplicationContext applicationContext;

    public QLExpressContext(ApplicationContext applicationContext) {
        this.applicationContext = applicationContext;
    }

    public QLExpressContext(Map<String, Object> properties, ApplicationContext applicationContext) {
        super(properties);
        this.applicationContext = applicationContext;
    }

    /**
     * 抽象方法：根据名称从属性列表中提取属性值
     */
    @Override
    public Object get(Object name) {
        Object result;
        result = super.get(name);
        try {
            if (result == null && this.applicationContext != null && this.applicationContext.containsBean((String) name)) {
                // 如果在Spring容器中包含bean，则返回String的Bean
                result = this.applicationContext.getBean((String) name);
            }
        } catch (Exception e) {
            throw new RuntimeException(e);
        }
        return result;
    }

    @Override
    public Object put(String name, Object object) {
        return super.put(name, object);
    }
}
```

```java
ppackage com.example.orderservice.service.spring;

import com.ql.util.express.ExpressRunner;
import com.ql.util.express.IExpressContext;
import lombok.Getter;
import org.springframework.beans.BeansException;
import org.springframework.context.ApplicationContext;
import org.springframework.context.ApplicationContextAware;
import org.springframework.stereotype.Component;

import java.util.Map;

/**
 * （1）打通了spring容器，通过扩展IExpressContext->QLExpressContext
 * 获取本地变量的时候，可以获取到spring的bean
 * （2）在runner初始化的时候，使用了函数映射功能：addFunctionOfServiceMethod
 * （3）在runner初始化的时候，使用了代码映射功能：addMacro
 */
@Component
public class QlExpressUtil implements ApplicationContextAware {

    private static final ExpressRunner runner;

    static {
        runner = new ExpressRunner();
    }

    private static boolean isInitialRunner = false;
    private ApplicationContext applicationContext;// spring上下文

    /**
     * @param statement 执行语句
     * @param context   上下文
     * @throws Exception 异常处理.
     */
    public Object execute(String statement, Map<String, Object> context) throws Exception {
        initRunner();
        IExpressContext<String, Object> expressContext = new QLExpressContext(context, applicationContext);
        return runner.execute(statement, expressContext, null, true, false);
    }

    private void initRunner() {

        if (isInitialRunner) {
            return;
        }

        synchronized (QlExpressUtil.runner) {
            if (isInitialRunner) {
                return;
            }

            try {
                QlExpressUtil.runner.addFunctionOfServiceMethod("读取用户信息", applicationContext.getBean("userServiceImpl"), "get", new Class[]{String.class}, null);
                QlExpressUtil.runner.addMacro("判定用户是否vip", "userDO.salary>200000");
            } catch (Exception e) {
                throw new RuntimeException("初始化失败表达式", e);
            }
        }
        isInitialRunner = true;
    }

    @Override
    public void setApplicationContext(ApplicationContext applicationContext) throws BeansException {
        this.applicationContext = applicationContext;
    }
}

```

### 对应的Controller脚本语言

```java
package com.example.orderservice.controller;

import com.central.common.api.CommonResult;
import com.example.orderservice.service.OrderService;
import com.example.orderservice.service.spring.QlExpressUtil;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import javax.annotation.Resource;
import java.util.HashMap;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping(value = "/order")
public class OrderController {

    @Resource
    private QlExpressUtil qlExpressUtil;

    @RequestMapping("/qle")
    public CommonResult<String> test() throws Exception {

        // 数据开始处理.
        String express = ""
                + "if(userServiceImpl.get(nick)!=null) {"
                + "    userDO = userServiceImpl.get(nick);"
                + "    if(userDO.salary>20000 && userDO.salary<20000) {"
                + "        System.out.println('高级客户:'+userDO.nick);"
                + "    return '规则引擎该用户是高级客户哈';"
                + "    } else if(userDO.salary>=200000) {"
                + "        System.out.println('vip客户:'+userDO.nick);"
                + "    return '规则引擎该用户是VIP用户哈';"
                + "    } else {"
                + "        System.out.println('普通客户:'+userDO.nick);"
                + "    return '规则引擎该用户是普通用户';"
                + "    }"
                + "} else {"
                + "    System.out.println('用户信息不存在');"
                + "    return '查询不到用户信息';"
                + "}";

        Map<String, Object> context = new HashMap<>();
        context.put("nick", "马总");
        Object execute2 = qlExpressUtil.execute(express, context);
        log.info(execute2.toString());

        context.put("nick", "小王");
        Object execute = qlExpressUtil.execute(express, context);
        log.info(execute.toString());

        context.put("nick", "XXX");
        Object execute1 = qlExpressUtil.execute(express, context);
        log.info(execute1.toString());

        return CommonResult.success("规则引擎");
    }

    @RequestMapping("/qle2")
    public CommonResult<String> test2() throws Exception {

        // 规则表达式处理.
        String express = ""
                + "userDO = 读取用户信息(nick);"
                + "if(userDO != null) {"
                + "    if(判定用户是否vip)"
                + "        System.out.println('vip客户:' + nick);"
                + "} else {"
                + "    System.out.println('用户信息不存在，nick:' + nick);"
                + "}";

        Map<String, Object> context = new HashMap<>();

        context.put("nick", "马总");
        qlExpressUtil.execute(express, context);

        context.put("nick", "小王");
        qlExpressUtil.execute(express, context);

        context.put("nick", "XXX");
        qlExpressUtil.execute(express, context);

        return CommonResult.success("规则引擎执行的方法.");
    }
}
```

## 麒麟系统社保政策变更申请导入参数验证应用引擎规则

### 单例的规则封装

> [!note]
>
> 这快目前写在代码中，后续可以单独放在表中或者专门有一个规则的系统进行服务。存在数据库可以动态的修改对应的模块的规则

```java
package com.joyowo.smarthr.social.common.excel;

import java.util.ArrayList;
import java.util.List;

public class SocPolicyChangeApplySingleton {

    private static List<String> singleton = null;

    /**
     * 获取Singleton实例，也叫静态工厂方法
     *
     * @return Singleton
     */
    public static synchronized List<String> getSingleton() {
        if (singleton == null) {
            singleton = getAggregation();
        }
        return singleton;
    }

    /**
     * 关联参数验证.
     *
     * @return the list of errMessage
     */
    private static List<String> getAggregation() {

        List<String> ruleList = new ArrayList<>();

        // 缴纳主体 0:个人 1:企业 2:个+企
        // 月缴个缴计算规则：0-按固定值，1-按基数比例
        ruleList.add("if (subject==null){return \"数据库缴纳主体为空\"}");

        // 停止执行年月 需晚于等于执行开始时间
        ruleList.add("if (getAggregation1(startYearMonthRightsAndInterests,startYearMonth)){return \"开始执行年月最多可往前选择12个月\"}");
        ruleList.add("if (getAggregation2(startYearMonth,endYearMonth)){return \"停止执行年月 需晚于等于执行开始时间\"}");

        // 追溯对象不为空的情况下、应该与缴纳主体一致 perTrace
        ruleList.add("if (getAggregation4(whetherRetroactive,perTrace,subject)){return \"追溯对象应该与政策包缴纳主体一致\"}");

        // 企缴固定金额（元）收费频率等于按月 缴纳主体等于企业或者全部 当且仅当“当月缴企缴规则等于按固定值”时必填
        ruleList.add("if (chargingFrequency==0 && subject in [1,2] && monthEntCalRule==0 && entAmount==null){return \"企缴固定金额（元）收费频率等于按月 缴纳主体等于企业或者全部 当且仅当“当月缴企缴规则等于按固定值”时必填\"}");

        // 个缴固定金额（元）收费频率等于按月 缴纳主体等于个人或者全部 当且仅当“月缴个缴规则等于按固定值”时必填
        ruleList.add("if (chargingFrequency==0 && (subject==0 || subject==2) && monthPerCalRule==0 && perAmount==null){return \"个缴固定金额（元） 收费频率等于按月 缴纳主体等于个人或者全部 当且仅当“月缴个缴规则等于按固定值”时必填\"}");

        // 企缴最低基数（元):收费频率为月,月缴企缴计算规则等于缴基数比例,缴纳主体等于企业或者全部时必填
        ruleList.add("if (chargingFrequency==0 && subject in [1,2] && monthEntCalRule==1 && entMinCardinal==null){return \"企缴最低基数（元):收费频率为月,月缴企缴计算规则等于缴基数比例,缴纳主体等于企业或者全部时必填\"}");

        // 企缴最低基数（元):收费频率等于季年,季年缴计算规则等于按基数比例,缴纳主体等于企业或者全部时必填
        ruleList.add("if (chargingFrequency!=0 && subject in [1,2] && seasonYearBaseCalRule==1 && entMinCardinal==null){return \"企缴最低基数（元):收费频率等于季年,季年缴计算规则等于按基数比例,缴纳主体等于企业或者全部时必填\"}");

        // 企缴最高基数（元):收费频率为月,月缴企缴计算规则等于缴基数比例,缴纳主体等于企业或者全部时必填
        ruleList.add("if (chargingFrequency==0 && subject in [1,2] && monthEntCalRule==1 && entMaxCardinal==null){return \"企缴最高基数（元):收费频率为月,月缴企缴计算规则等于缴基数比例,缴纳主体等于企业或者全部时必填\"}");

        // 企缴最高基数（元）收费频率等于季年,季年缴计算规则等于按基数比例,缴纳主体等于个人或者全部时必填
        ruleList.add("if (chargingFrequency!=0 && subject in [1,2] && seasonYearBaseCalRule==1 && entMaxCardinal==null){return \"企缴最高基数（元）收费频率等于季年,季年缴计算规则等于按基数比例,缴纳主体等于个人或者全部时必填\"}");

        // 企缴最高基数（元）大于等于 企缴最低基数（元)
        ruleList.add("if (entMinCardinal!=null && entMaxCardinal!=null && getAggregation3(entMaxCardinal,entMinCardinal)){return \"企缴最高基数（元）应该大于等于企缴最低基数（元)\"}");

        // 个缴最低基数(元）:收费频率为月,月缴个缴计算规则等于缴基数比例,缴纳主体等于个人或者全部时必填
        ruleList.add("if (chargingFrequency==0 && (subject==0 || subject==2) && monthPerCalRule==1 && perMinCardinal==null){return \"个缴最低基数(元）收费频率为月 月缴个缴计算规则等于缴基数比例，缴纳主体等于个人或者全部时必填\"}");

        // 个缴最低基数(元）:收费频率等于季年,季年缴计算规则等于按基数比例,缴纳主体等于个人或者全部时必填
        ruleList.add("if (chargingFrequency!=0 && (subject==0 || subject==2) && seasonYearBaseCalRule==1 && perMinCardinal==null){return \"个缴最低基数(元）收费频率等于季年 季年缴计算规则等于按基数比例 缴纳主体等于个人或者全部时必填\"}");

        // 个缴最高基数（元）:收费频率为月,月缴个缴计算规则等于缴基数比例,缴纳主体等于个人或者全部时必填
        ruleList.add("if (chargingFrequency==0 && (subject==0 || subject==2) && monthPerCalRule==1 && perMaxCardinal==null){return \"个缴最高基数（元）收费频率为月 月缴个缴计算规则等于缴基数比例 缴纳主体等于个人或者全部时必填\"}");

        // 个缴最高基数（元）:收费频率等于季年,季年缴计算规则等于按基数比例,缴纳主体等于个人或者全部时必填
        ruleList.add("if (chargingFrequency!=0 && (subject==0 || subject==2) && seasonYearBaseCalRule==1 && perMaxCardinal==null){return \"个缴最高基数（元）收费频率等于季年 季年缴计算规则等于按基数比例 缴纳主体等于个人或者全部时必填\"}");

        // 个缴最高基数（元）大于等于 个缴最低基数(元）
        ruleList.add("if ( (subject==0 || subject==2) && perMinCardinal!=null && perMaxCardinal!=null && getAggregation3(perMaxCardinal,perMinCardinal)){return \"个缴最高基数（元）应该大于等于个缴最低基数(元）\"}");

        // 企缴比例(%)+个缴比例（%):收费频率为月,月缴个缴计算规则等于按基数比例，缴纳主体等于个人或者全部时必填
        ruleList.add("if (chargingFrequency==0 && (subject==0 || subject==2) && monthPerCalRule==1 && totalRatio==null){return \"企缴比例(%)+个缴比例（%)收费频率为月 月缴个缴计算规则等于缴基数比例，缴纳主体等于个人或者全部时必填\"}");

        // 企缴比例(%)+个缴比例（%):收费频率等于季年 季年缴计算规则等于按基数比例,缴纳主体等于个人或者全部时必填
        ruleList.add("if (chargingFrequency!=0 && (subject==0 || subject==2) && seasonYearBaseCalRule==1 && totalRatio==null){return \"企缴比例(%)+个缴比例（%):收费频率等于季年 季年缴计算规则等于按基数比例,缴纳主体等于个人或者全部时必填\"}");

        // 企缴比例(%)+个缴比例（%):收费频率为月,月缴企缴计算规则等于按基数比例，缴纳主体等于企业或者全部时必填
        ruleList.add("if (chargingFrequency==0 && subject in [1,2] && monthEntCalRule==1 && totalRatio==null){return \"企缴比例(%)+个缴比例（%):收费频率为月,月缴企缴计算规则等于按基数比例，缴纳主体等于企业或者全部时必填\"}");

        // 企缴比例(%)+个缴比例（%):收费频率等于季年 季年缴计算规则等于按基数比例,缴纳主体等于企业或者全部时必填
        ruleList.add("if (chargingFrequency!=0 &&subject in [1,2] && seasonYearBaseCalRule==1 && totalRatio==null){return \"企缴比例(%)+个缴比例（%):收费频率等于季年 季年缴计算规则等于按基数比例,缴纳主体等于企业或者全部时必填\"}");

        // 季年缴纳时候、参保类型只能为不区分
        ruleList.add("if (chargingFrequency!=0 && insuredTypeName!=\"不区分\"){return \"季年缴纳时候、参保类型只能为不区分\"}");

        // 月缴纳缴交额总计最低（元）小于 缴交额总计最高（元）
        ruleList.add("if (chargingFrequency==0 && payMinAmount!=null && payMaxAmount!=null && getAggregation3(payMaxAmount,payMinAmount)){return \"月缴纳缴交额总计最低（元）小于 缴交额总计最高（元）\"}");

        // 期内企缴全额（元） 生效政策包当“季缴年度计算规则=按固定值”“险种缴纳主体包含企业”时必填
        ruleList.add("if (chargingFrequency!=0 && subject in [1,2] && seasonYearBaseCalRule==0 && seasonEntAmount==null){return \"期内企缴全额（元）生效政策包当“季缴年度计算规则=按固定值”“险种缴纳主体包含企业”时必填\"}");

        // 1月企缴费用分摊（元）当“季缴年度计算规则=按固定值”“险种缴纳主体包含企业”“中途参保规则=中途参保收剩余月份”时必填
        ruleList.add("if (chargingFrequency!=0 && subject in [1,2] && seasonYearBaseCalRule==0 && seasonYearMiddleInsuredCalRule==1 && enterpriseJanuaryAmount==null){return \"1月企缴费用分摊（元）当“季缴年度计算规则=按固定值”“险种缴纳主体包含企业”“中途参保规则=中途参保收剩余月份”时必填\"}");

        // 2月企缴费用分摊（元）当“季缴年度计算规则=按固定值”“险种缴纳主体包含企业”“中途参保规则=中途参保收剩余月份”时必填
        ruleList.add("if (chargingFrequency!=0 && subject in [1,2] && seasonYearBaseCalRule==0 && seasonYearMiddleInsuredCalRule==1 && enterpriseFebruaryAmount==null){return \"2月企缴费用分摊（元）当“季缴年度计算规则=按固定值”“险种缴纳主体包含企业”“中途参保规则=中途参保收剩余月份”时必填\"}");

        // 3月企缴费用分摊（元）当“季缴年度计算规则=按固定值”“险种缴纳主体包含企业”“中途参保规则=中途参保收剩余月份”时必填
        ruleList.add("if (chargingFrequency!=0 && subject in [1,2] && seasonYearBaseCalRule==0 && seasonYearMiddleInsuredCalRule==1 && enterpriseMarchAmount==null){return \"3月企缴费用分摊（元）当“季缴年度计算规则=按固定值”“险种缴纳主体包含企业”“中途参保规则=中途参保收剩余月份”时必填\"}");

        // 4月企缴费用分摊（元）当“季缴年度计算规则=按固定值”“险种缴纳主体包含企业”“中途参保规则=中途参保收剩余月份”时必填
        ruleList.add("if (chargingFrequency!=0 && subject in [1,2] && seasonYearBaseCalRule==0 && seasonYearMiddleInsuredCalRule==1 && enterpriseAprilAmount==null){return \"4月企缴费用分摊（元）当“季缴年度计算规则=按固定值”“险种缴纳主体包含企业”“中途参保规则=中途参保收剩余月份”时必填\"}");

        // 5月企缴费用分摊（元）当“季缴年度计算规则=按固定值”“险种缴纳主体包含企业”“中途参保规则=中途参保收剩余月份”时必填
        ruleList.add("if (chargingFrequency!=0 && subject in [1,2] && seasonYearBaseCalRule==0 && seasonYearMiddleInsuredCalRule==1 && enterpriseMayAmount==null){return \"5月企缴费用分摊（元）当“季缴年度计算规则=按固定值”“险种缴纳主体包含企业”“中途参保规则=中途参保收剩余月份”时必填\"}");

        // 6月企缴费用分摊（元）当“季缴年度计算规则=按固定值”“险种缴纳主体包含企业”“中途参保规则=中途参保收剩余月份”时必填
        ruleList.add("if (chargingFrequency!=0 && subject in [1,2] && seasonYearBaseCalRule==0 && seasonYearMiddleInsuredCalRule==1 && enterpriseJuneAmount==null){return \"6月企缴费用分摊（元）当“季缴年度计算规则=按固定值”“险种缴纳主体包含企业”“中途参保规则=中途参保收剩余月份”时必填\"}");

        // 7月企缴费用分摊（元）当“季缴年度计算规则=按固定值”“险种缴纳主体包含企业”“中途参保规则=中途参保收剩余月份”时必填
        ruleList.add("if (chargingFrequency!=0 && subject in [1,2] && seasonYearBaseCalRule==0 && seasonYearMiddleInsuredCalRule==1 && enterpriseJulyAmount==null){return \"7月企缴费用分摊（元）当“季缴年度计算规则=按固定值”“险种缴纳主体包含企业”“中途参保规则=中途参保收剩余月份”时必填\"}");

        // 8月企缴费用分摊（元）当“季缴年度计算规则=按固定值”“险种缴纳主体包含企业”“中途参保规则=中途参保收剩余月份”时必填
        ruleList.add("if (chargingFrequency!=0 && subject in [1,2] && seasonYearBaseCalRule==0 && seasonYearMiddleInsuredCalRule==1 && enterpriseAugustAmount==null){return \"8月企缴费用分摊（元）当“季缴年度计算规则=按固定值”“险种缴纳主体包含企业”“中途参保规则=中途参保收剩余月份”时必填\"}");

        // 9月企缴费用分摊（元）当“季缴年度计算规则=按固定值”“险种缴纳主体包含企业”“中途参保规则=中途参保收剩余月份”时必填
        ruleList.add("if (chargingFrequency!=0 && subject in [1,2] && seasonYearBaseCalRule==0 && seasonYearMiddleInsuredCalRule==1 && enterpriseSeptemberAmount==null){return \"9月企缴费用分摊（元）当“季缴年度计算规则=按固定值”“险种缴纳主体包含企业”“中途参保规则=中途参保收剩余月份”时必填\"}");

        // 10月企缴费用分摊（元）当“季缴年度计算规则=按固定值”“险种缴纳主体包含企业”“中途参保规则=中途参保收剩余月份”时必填
        ruleList.add("if (chargingFrequency!=0 && subject in [1,2] && seasonYearBaseCalRule==0 && seasonYearMiddleInsuredCalRule==1 && enterpriseOctoberAmount==null){return \"10月企缴费用分摊（元）当“季缴年度计算规则=按固定值”“险种缴纳主体包含企业”“中途参保规则=中途参保收剩余月份”时必填\"}");

        // 11月企缴费用分摊（元）当“季缴年度计算规则=按固定值”“险种缴纳主体包含企业”“中途参保规则=中途参保收剩余月份”时必填
        ruleList.add("if (chargingFrequency!=0 && subject in [1,2] && seasonYearBaseCalRule==0 && seasonYearMiddleInsuredCalRule==1 && enterpriseNovemberAmount==null){return \"11月企缴费用分摊（元）当“季缴年度计算规则=按固定值”“险种缴纳主体包含企业”“中途参保规则=中途参保收剩余月份”时必填\"}");

        // 12月企缴费用分摊（元）当“季缴年度计算规则=按固定值”“险种缴纳主体包含企业”“中途参保规则=中途参保收剩余月份”时必填
        ruleList.add("if (chargingFrequency!=0 && subject in [1,2] && seasonYearBaseCalRule==0 && seasonYearMiddleInsuredCalRule==1 && enterpriseDecemberAmount==null){return \"12月企缴费用分摊（元）当“季缴年度计算规则=按固定值”“险种缴纳主体包含企业”“中途参保规则=中途参保收剩余月份”时必填\"}");

        // 期内个人全额(元）当“季缴年度计算规则=按固定值”“险种缴纳主体包含个人”时必填
        ruleList.add("if (chargingFrequency!=0 && (subject==0 || subject==2) && seasonYearBaseCalRule==0 && seasonEntPerAmount==null){return \"期内个人全额(元）当“季缴年度计算规则=按固定值”“险种缴纳主体包含个人”时必填\"}");

        // 1月个缴费用分摊（元）当“季缴年度计算规则=按固定值”“险种缴纳主体包含个人”“中途参保规则=中途参保收剩余月份”时必填
        ruleList.add("if (chargingFrequency!=0 && (subject==0 || subject==2) && seasonYearBaseCalRule==0 && seasonYearMiddleInsuredCalRule==1 && personalJanuaryAmount==null){return \"1月个缴费用分摊（元）当“季缴年度计算规则=按固定值”“险种缴纳主体包含个人”“中途参保规则=中途参保收剩余月份”时必填\"}");

        // 2月个缴费用分摊（元）当“季缴年度计算规则=按固定值”“险种缴纳主体包含个人”“中途参保规则=中途参保收剩余月份”时必填
        ruleList.add("if (chargingFrequency!=0 && (subject==0 || subject==2) && seasonYearBaseCalRule==0 && seasonYearMiddleInsuredCalRule==1 && personalFebruaryAmount==null){return \"2月个缴费用分摊（元）当“季缴年度计算规则=按固定值”“险种缴纳主体包含个人”“中途参保规则=中途参保收剩余月份”时必填\"}");

        // 3月个缴费用分摊（元）当“季缴年度计算规则=按固定值”“险种缴纳主体包含个人”“中途参保规则=中途参保收剩余月份”时必填
        ruleList.add("if (chargingFrequency!=0 && (subject==0 || subject==2) && seasonYearBaseCalRule==0 && seasonYearMiddleInsuredCalRule==1 && personalMarchAmount==null){return \"3月个缴费用分摊（元）当“季缴年度计算规则=按固定值”“险种缴纳主体包含个人”“中途参保规则=中途参保收剩余月份”时必填\"}");

        // 4月个缴费用分摊（元）当“季缴年度计算规则=按固定值”“险种缴纳主体包含个人”“中途参保规则=中途参保收剩余月份”时必填
        ruleList.add("if (chargingFrequency!=0 && (subject==0 || subject==2) && seasonYearBaseCalRule==0 && seasonYearMiddleInsuredCalRule==1 && personalAprilAmount==null){return \"4月个缴费用分摊（元）当“季缴年度计算规则=按固定值”“险种缴纳主体包含个人”“中途参保规则=中途参保收剩余月份”时必填\"}");

        // 5月个缴费用分摊（元）当“季缴年度计算规则=按固定值”“险种缴纳主体包含个人”“中途参保规则=中途参保收剩余月份”时必填
        ruleList.add("if (chargingFrequency!=0 && (subject==0 || subject==2) && seasonYearBaseCalRule==0 && seasonYearMiddleInsuredCalRule==1 && personalMayAmount==null){return \"5月个缴费用分摊（元）当“季缴年度计算规则=按固定值”“险种缴纳主体包含个人”“中途参保规则=中途参保收剩余月份”时必填\"}");

        // 6月个缴费用分摊（元）当“季缴年度计算规则=按固定值”“险种缴纳主体包含个人”“中途参保规则=中途参保收剩余月份”时必填
        ruleList.add("if (chargingFrequency!=0 && (subject==0 || subject==2) && seasonYearBaseCalRule==0 && seasonYearMiddleInsuredCalRule==1 && personalJuneAmount==null){return \"6月个缴费用分摊（元）当“季缴年度计算规则=按固定值”“险种缴纳主体包含个人”“中途参保规则=中途参保收剩余月份”时必填\"}");

        // 7月个缴费用分摊（元）当“季缴年度计算规则=按固定值”“险种缴纳主体包含个人”“中途参保规则=中途参保收剩余月份”时必填
        ruleList.add("if (chargingFrequency!=0 && (subject==0 || subject==2) && seasonYearBaseCalRule==0 && seasonYearMiddleInsuredCalRule==1 && personalJulyAmount==null){return \"7月个缴费用分摊（元）当“季缴年度计算规则=按固定值”“险种缴纳主体包含个人”“中途参保规则=中途参保收剩余月份”时必填\"}");

        // 8月个缴费用分摊（元）当“季缴年度计算规则=按固定值”“险种缴纳主体包含个人”“中途参保规则=中途参保收剩余月份”时必填
        ruleList.add("if (chargingFrequency!=0 && (subject==0 || subject==2) && seasonYearBaseCalRule==0 && seasonYearMiddleInsuredCalRule==1 && personalAugustAmount==null){return \"8月个缴费用分摊（元）当“季缴年度计算规则=按固定值”“险种缴纳主体包含个人”“中途参保规则=中途参保收剩余月份”时必填\"}");

        // 9月个缴费用分摊（元）当“季缴年度计算规则=按固定值”“险种缴纳主体包含个人”“中途参保规则=中途参保收剩余月份”时必填
        ruleList.add("if (chargingFrequency!=0 && (subject==0 || subject==2) && seasonYearBaseCalRule==0 && seasonYearMiddleInsuredCalRule==1 && personalSeptemberAmount==null){return \"9月个缴费用分摊（元）当“季缴年度计算规则=按固定值”“险种缴纳主体包含个人”“中途参保规则=中途参保收剩余月份”时必填\"}");

        // 10月个缴费用分摊（元）当“季缴年度计算规则=按固定值”“险种缴纳主体包含个人”“中途参保规则=中途参保收剩余月份”时必填
        ruleList.add("if (chargingFrequency!=0 && (subject==0 || subject==2) && seasonYearBaseCalRule==0 && seasonYearMiddleInsuredCalRule==1 && personalOctoberAmount==null){return \"10月个缴费用分摊（元）当“季缴年度计算规则=按固定值”“险种缴纳主体包含个人”“中途参保规则=中途参保收剩余月份”时必填\"}");

        // 11月个缴费用分摊（元）当“季缴年度计算规则=按固定值”“险种缴纳主体包含个人”“中途参保规则=中途参保收剩余月份”时必填
        ruleList.add("if (chargingFrequency!=0 && (subject==0 || subject==2) && seasonYearBaseCalRule==0 && seasonYearMiddleInsuredCalRule==1 && personalNovemberAmount==null){return \"11月个缴费用分摊（元）当“季缴年度计算规则=按固定值”“险种缴纳主体包含个人”“中途参保规则=中途参保收剩余月份”时必填\"}");

        // 12月个缴费用分摊（元）当“季缴年度计算规则=按固定值”“险种缴纳主体包含个人”“中途参保规则=中途参保收剩余月份”时必填
        ruleList.add("if (chargingFrequency!=0 && (subject==0 || subject==2) && seasonYearBaseCalRule==0 && seasonYearMiddleInsuredCalRule==1 && personalDecemberAmount==null){return \"12月个缴费用分摊（元）当“季缴年度计算规则=按固定值”“险种缴纳主体包含个人”“中途参保规则=中途参保收剩余月份”时必填\"}");

        // 追溯对象：是否追溯等于是时必填，值为企业和个人，多个时以英文逗号隔开  whetherRetroactive 是否追溯 0-否  1-是
        ruleList.add("if (whetherRetroactive==1 && isPerTrace==null){return \"追溯对象:是否追溯等于是时必填，值为企业和个人，多个时以英文逗号隔开\"}");

        // 追溯方式：是否追溯=是时必填，值为；指定月份在职的员工缴纳月份补收、指定月份在职 的员工追溯月全部补收、追溯期内有缴纳员工的缴纳月份补收、追溯期内有缴纳的员工追溯月全部补收
        ruleList.add("if (whetherRetroactive==1 && socTraceTypeMethod==null){return \"追溯方式:是否追溯等于是时必填\"}");

        // 在职指定月份：追溯方式=指定月份在职的员工缴纳月份补收或指定月份在职 的员工追溯月全部补收时必填，格式为202103
        ruleList.add("if (whetherRetroactive==1 && socTraceType in [1,2] && appointedMonth==null){return \"追溯方式等于指定月份在职的员工缴纳月份补收或指定月份在职 的员工追溯月全部补收时必填\"}");

        // 追溯方式有值 追溯对象为空异常
        ruleList.add("if (isPerTrace==null && socTraceTypeMethod!=null){return \"追溯对象为空的情况下、追溯方式不能有值\"}");

        // 缴纳主体个缴,企缴固定金额导入应该为空
        ruleList.add("if (subject==0 && entAmount != null){return \"当前缴纳主体为个缴,企缴固定金额导入应该为空\"}");

        // 缴纳主体个缴,企业最低基数导入应该为空
        ruleList.add("if (subject==0 && entMinCardinal != null){return \"当前缴纳主体为个缴,企业最低基数导入应该为空\"}");

        // 缴纳主体个缴,企业最高基数导入应该为空
        ruleList.add("if (subject==0 && entMaxCardinal != null){return \"当前缴纳主体为个缴,企业最高基数导入应该为空\"}");

        // 缴纳主体个缴,期内企缴全额（元）导入应该为空
        ruleList.add("if (subject==0 && seasonEntAmount != null){return \"当前缴纳主体为个缴,期内企缴全额（元）导入应该为空\"}");

        // 缴纳主体个缴,1月企缴费用分摊（元）导入应该为空
        ruleList.add("if (subject==0 && enterpriseJanuaryAmount != null){return \"当前缴纳主体为个缴,1月企缴费用分摊（元）导入应该为空\"}");

        // 缴纳主体个缴,2月企缴费用分摊（元）导入应该为空
        ruleList.add("if (subject==0 && enterpriseFebruaryAmount != null){return \"当前缴纳主体为个缴,2月企缴费用分摊（元）导入应该为空\"}");

        // 缴纳主体个缴,3月企缴费用分摊（元）导入应该为空
        ruleList.add("if (subject==0 && enterpriseMarchAmount != null){return \"当前缴纳主体为个缴,3月企缴费用分摊（元）导入应该为空\"}");

        // 缴纳主体个缴,4月企缴费用分摊（元）导入应该为空
        ruleList.add("if (subject==0 && enterpriseAprilAmount != null){return \"当前缴纳主体为个缴,4月企缴费用分摊（元）导入应该为空\"}");

        // 缴纳主体个缴,5月企缴费用分摊（元）导入应该为空
        ruleList.add("if (subject==0 && enterpriseMayAmount != null){return \"当前缴纳主体为个缴,5月企缴费用分摊（元）导入应该为空\"}");

        // 缴纳主体个缴,6月企缴费用分摊（元）导入应该为空
        ruleList.add("if (subject==0 && enterpriseJuneAmount != null){return \"当前缴纳主体为个缴,6月企缴费用分摊（元）导入应该为空\"}");

        // 缴纳主体个缴,7月企缴费用分摊（元）导入应该为空
        ruleList.add("if (subject==0 && enterpriseJulyAmount != null){return \"当前缴纳主体为个缴,7月企缴费用分摊（元）导入应该为空\"}");

        // 缴纳主体个缴,8月企缴费用分摊（元）导入应该为空
        ruleList.add("if (subject==0 && enterpriseAugustAmount != null){return \"当前缴纳主体为个缴,8月企缴费用分摊（元）导入应该为空\"}");

        // 缴纳主体个缴,9月企缴费用分摊（元）导入应该为空
        ruleList.add("if (subject==0 && enterpriseSeptemberAmount != null){return \"当前缴纳主体为个缴,9月企缴费用分摊（元）导入应该为空\"}");

        // 缴纳主体个缴,10月企缴费用分摊（元）导入应该为空
        ruleList.add("if (subject==0 && enterpriseOctoberAmount != null){return \"当前缴纳主体为个缴,10月企缴费用分摊（元）导入应该为空\"}");

        // 缴纳主体个缴,11月企缴费用分摊（元）导入应该为空
        ruleList.add("if (subject==0 && enterpriseNovemberAmount != null){return \"当前缴纳主体为个缴,11月企缴费用分摊（元）导入应该为空\"}");

        // 缴纳主体个缴,12月企缴费用分摊（元）导入应该为空
        ruleList.add("if (subject==0 && enterpriseDecemberAmount != null){return \"当前缴纳主体为个缴,12月企缴费用分摊（元）导入应该为空\"}");

        // 当前缴纳主体为企缴，导入的个缴固定金额应该为空
        ruleList.add("if (subject==1 && perAmount != null){return \"当前缴纳主体为企缴，导入的个缴固定金额应该为空\"}");

        // 当前缴纳主体为企缴，导入的个人最低基数应该为空
        ruleList.add("if (subject==1 && perMinCardinal != null){return \"当前缴纳主体为企缴，导入的个人最低基数应该为空\"}");

        // 当前缴纳主体为企缴，导入的个人最高基数应该为空
        ruleList.add("if (subject==1 && perMaxCardinal != null){return \"当前缴纳主体为企缴，导入的个人最高基数应该为空\"}");

        // 当前缴纳主体为企缴，导入的期内个人全额（元）应该为空
        ruleList.add("if (subject==1 && seasonEntPerAmount != null){return \"当前缴纳主体为企缴，导入的期内个人全额（元）应该为空\"}");

        // 当前缴纳主体为企缴，导入的1月个缴费用分摊（元）应该为空
        ruleList.add("if (subject==1 && personalJanuaryAmount != null){return \"当前缴纳主体为企缴，导入的1月个缴费用分摊（元）应该为空\"}");

        // 当前缴纳主体为企缴，导入的2月个缴费用分摊（元）应该为空
        ruleList.add("if (subject==1 && personalFebruaryAmount != null){return \"当前缴纳主体为企缴，导入的2月个缴费用分摊（元）应该为空\"}");

        // 当前缴纳主体为企缴，导入的3月个缴费用分摊（元）应该为空
        ruleList.add("if (subject==1 && personalMarchAmount != null){return \"当前缴纳主体为企缴，导入的3月个缴费用分摊（元）应该为空\"}");

        // 当前缴纳主体为企缴，导入的4月个缴费用分摊（元）应该为空
        ruleList.add("if (subject==1 && personalAprilAmount != null){return \"当前缴纳主体为企缴，导入的4月个缴费用分摊（元）应该为空\"}");

        // 当前缴纳主体为企缴，导入的5月个缴费用分摊（元）应该为空
        ruleList.add("if (subject==1 && personalMayAmount != null){return \"当前缴纳主体为企缴，导入的5月个缴费用分摊（元）应该为空\"}");

        // 当前缴纳主体为企缴，导入的6月个缴费用分摊（元）应该为空
        ruleList.add("if (subject==1 && personalJuneAmount != null){return \"当前缴纳主体为企缴，导入的6月个缴费用分摊（元）应该为空\"}");

        // 当前缴纳主体为企缴，导入的7月个缴费用分摊（元）应该为空
        ruleList.add("if (subject==1 && personalJulyAmount != null){return \"当前缴纳主体为企缴，导入的7月个缴费用分摊（元）应该为空\"}");

        // 当前缴纳主体为企缴，导入的8月个缴费用分摊（元）应该为空
        ruleList.add("if (subject==1 && personalAugustAmount != null){return \"当前缴纳主体为企缴，导入的8月个缴费用分摊（元）应该为空\"}");

        // 当前缴纳主体为企缴，导入的9月个缴费用分摊（元）应该为空
        ruleList.add("if (subject==1 && personalSeptemberAmount != null){return \"当前缴纳主体为企缴，导入的9月个缴费用分摊（元）应该为空\"}");

        // 当前缴纳主体为企缴，导入的10月个缴费用分摊（元）应该为空
        ruleList.add("if (subject==1 && personalOctoberAmount != null){return \"当前缴纳主体为企缴，导入的10月个缴费用分摊（元）应该为空\"}");

        // 当前缴纳主体为企缴，导入的11月个缴费用分摊（元）应该为空
        ruleList.add("if (subject==1 && personalNovemberAmount != null){return \"当前缴纳主体为企缴，导入的11月个缴费用分摊（元）应该为空\"}");

        // 当前缴纳主体为企缴，导入的12月个缴费用分摊（元）应该为空
        ruleList.add("if (subject==1 && personalDecemberAmount != null){return \"当前缴纳主体为企缴，导入的12月个缴费用分摊（元）应该为空\"}");

        return ruleList;
    }
}

```

### 规则验证

```java
package com.joyowo.smarthr.social.common.excel;

import com.joyowo.smarthr.core.utils.StringUtil;
import com.joyowo.smarthr.social.common.util.SocMonthCalculateUtil;
import com.ql.util.express.DefaultContext;
import com.ql.util.express.ExpressRunner;
import lombok.Getter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.*;

@Slf4j
@Getter
public class SocPolicyChangeApplyCheck {

    private final Map<String, DataCheck> dataCheckMap = new HashMap<>();

    private final DefaultContext<String, Object> ctx = new DefaultContext<>();

    private String errMsg;

    String getErrMsg() {
        return errMsg;
    }

    SocPolicyChangeApplyCheck addCtxValue(String key, Object value) {
        ctx.put(key, value);
        return this;
    }

    /**
     * 先单字段校验，如果不通过，则结束；否则执行多字段校验
     */
    void exec() {
        //多字段
        if (StringUtils.isEmpty(errMsg)) {
            //多字段聚合判断
            try {
                multiFieldAggregationVerification();
            } catch (Exception e) {
                log.error("ql express error", e);
            }
        }
    }

    /**
     * 规则条件匹配.
     *
     * @throws Exception the error
     */
    private void multiFieldAggregationVerification() throws Exception {

        ExpressRunner expressRunner = new ExpressRunner();
        // *开始执行年月 必填，默认险种当前权益月（根据当前有效版本中，险种的增员规则计算） 最多可往前选择12个月
        expressRunner.addFunctionOfClassMethod("getAggregation1", SocPolicyChangeApplyCheck.class.getName(), "equityMonthJudgment", new String[]{"String", "String"}, null);

        expressRunner.addFunctionOfClassMethod("getAggregation2", SocPolicyChangeApplyCheck.class.getName(), "stopExecutionYearAndMonth", new String[]{"String", "String"}, null);

        expressRunner.addFunctionOfClassMethod("getAggregation3", SocPolicyChangeApplyCheck.class.getName(), "comparison", new String[]{"String", "String"}, null);

        expressRunner.addFunctionOfClassMethod("getAggregation4", SocPolicyChangeApplyCheck.class.getName(), "traceableObject", new String[]{"Integer", "Integer", "Integer"}, null);

        // 单例模式获取匹配规则.
        List<String> aggregationList = SocPolicyChangeApplySingleton.getSingleton();

        for (String aggregation : aggregationList) {
            Object execute = null;
            try {
                execute = expressRunner.execute(aggregation, ctx, null, true, false);
                log.debug("执行QlExpress: {} 执行结果：{}", aggregation, execute);
            } catch (Exception e) {
                e.printStackTrace();
                log.error("SocPolicyChangeApplyCheck判断规则出错={}", e.getMessage());
            }

            if (!StringUtils.isEmpty(execute)) {
                errMsg = execute.toString();
                return;
            }

        }
        expressRunner.clearExpressCache();
    }

    /**
     * 开始执行年月不能超过12这个月
     *
     * @param startYearMonthRightsAndInterests 开始执行年月
     * @return the boolean  startYearMonthRightsAndInterests
     */
    public static Boolean equityMonthJudgment(String startYearMonthRightsAndInterests, String startYearMonth) {

        // 得到开始执行年月转换值.
        LocalDate startYearMonthLocalDate = SocMonthCalculateUtil.parseStr(startYearMonth);
        LocalDate startYearMonthLocal = SocMonthCalculateUtil.parseStr(startYearMonthRightsAndInterests);
        LocalDate minDate = startYearMonthLocal.plusMonths(-12);
        if (minDate.compareTo(startYearMonthLocalDate) > 0) {
            return Boolean.TRUE;
        }
        return Boolean.FALSE;
    }

    /**
     * 停止执行年月 需晚于等于执行开始时间
     *
     * @param endYearMonth 停止执行年月.
     * @return the boolean
     */
    public static Boolean stopExecutionYearAndMonth(String startYearMonth, String endYearMonth) {
        if (StringUtil.isNotBlankTrim(startYearMonth) && StringUtil.isNotBlankTrim(endYearMonth)) {
            LocalDate startYearMonthLocalDate = SocMonthCalculateUtil.parseStr(startYearMonth);
            LocalDate endYearMonthLocalDate = SocMonthCalculateUtil.parseStr(endYearMonth);
            if (startYearMonthLocalDate.compareTo(endYearMonthLocalDate) > 0) {
                return Boolean.TRUE;
            }
        }

        return Boolean.FALSE;
    }

    /**
     * 比较两个值的大小
     *
     * @param maxMoney money
     * @param minMoney money
     * @return the boolean
     */
    public static boolean comparison(String maxMoney, String minMoney) {
        if (!StringUtils.isEmpty(maxMoney) && !StringUtils.isEmpty(minMoney)) {
            if (new BigDecimal(minMoney).compareTo(new BigDecimal(maxMoney)) > 0) {
                return Boolean.TRUE;
            }
        }
        return Boolean.FALSE;
    }

    public static boolean traceableObject(Integer whetherRetroactive, Integer perTrace, Integer subject) {

        if (perTrace != null) {
            if (perTrace == 1) {
                perTrace = 0;
            } else if (perTrace == 0) {
                perTrace = 1;
            }
        }

        if (subject == 2) {
            return Boolean.FALSE;
        }

        if (whetherRetroactive == 1 && !perTrace.equals(subject)) {
            return Boolean.TRUE;
        }
        return Boolean.FALSE;
    }

}

```
