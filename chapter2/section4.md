
# 线上JVM服务器磁盘IO、CPU占用过高排查

## 前言

> [!note]
>
> 前几天运维反馈社保项目业务线上服务磁盘IO占用比较高，目前是否有占用比较多的服务磁盘IO的操作，不是数据库IO. 如果单纯再从代码功能进行排查感觉点比较多，也没有切实可行证明某个功能确实占用服务器磁盘的IO。当然我们可以通过第三方服务器（腾讯云、阿里云等）自带的监控工具进行排查和合适分析问题，这块目前整体服务架构是比较欠缺的。虽然基于目前开发是没有任何相关运维服务器的账号的。但是从探讨精神上自己的已有的服务器用**JVM**中自带的**jstack**拍个片子将排查过程方法总结梳理分享下。**大部分涉及到一些运维服务的操作，如果没有一些运维服务基础、理解起来可能比较难。我这边尽量把每一步的操作梳理的更加详细，方便阅读理解**

## JDK命令行工具

- jps (JVM Process Status）: 类似 UNIX 的 ps 命令。用于查看所有 Java 进程的启动类、传入参数和 Java 虚拟机参数等信息；
- jstat（JVM Statistics Monitoring Tool）: 用于收集 HotSpot 虚拟机各方面的运行数据;
- jinfo (Configuration Info for Java) : Configuration Info for Java,显示虚拟机配置信息;
- jmap (Memory Map for Java) : 生成堆转储快照;
- jhat (JVM Heap Dump Browser) : 用于分析 heapdump 文件，它会建立一个 HTTP/HTML 服务器，让用户可以在浏览器上查看分析结果;
- jstack (Stack Trace for Java) : 生成虚拟机当前时刻的线程快照，线程快照就是当前虚拟机内每一条线程正在执行的方法堆栈的集合。

## 查询项目进程

### 使用 jps 命令查询项目启动的进程

> **jps**主要用来输出JVM中运行的进程状态信息

```bash
root@social-85d74b896d-bmzsr:/# jps -m -l -v
4806 sun.tools.jmap.JMap -histo:live 7 -Dapplication.home=/opt/java/openjdk -Xms8m -Dsun.jvm.hotspot.debugger.useProcDebugger -Dsun.jvm.hotspot.debugger.useWindbgDebugger
7319 sun.tools.jps.Jps -m -l -v -Dapplication.home=/opt/java/openjdk -Xms8m
7 smarthr-social-app-1.0.0-SNAPSHOT.jar -Xms2048m -Xmx2048m -XX:+HeapDumpOnOutOfMemoryError -XX:HeapDumpPath=/logs
```

- 命令行参数选项说明如下：

```xml
 -q 不输出类名、Jar名和传入main方法的参数
 -m 输出传入main方法的参数
 -l 输出main类或Jar的全限名
 -v 输出传入JVM的参数
```

### 使用 ps -ef | grep java 同样可以查询进程号

```bash
root@social-85d74b896d-bmzsr:/# ps -ef | grep java
root         1     0  0 Sep24 ?        00:00:00 sh -c java  $JAVA_OPTS  -jar *.jar
root         7     1  1 Sep24 ?        06:31:36 java -Xms2048m -Xmx2048m -XX:+HeapDumpOnOutOfMemoryError -XX:HeapDumpPath=/logs -jar smarthr-social-app-1.0.0-SNAPSHOT.jar
root      7389  7291  0 17:12 pts/7    00:00:00 grep --color=auto java
```

## 熟悉使用使用pidstat工具

### pidstat概述

- pidstat是sysstat工具的一个命令，用于监控全部或指定进程的cpu、内存、线程、设备IO等系统资源的占用情况

### pidstat 安装与基础命令总结

#### 在Debian/Ubuntu系统中可以使用下面的命令来安装

- apt-get install sysstat

```bash
root@social-85d74b896d-bmzsr:/# apt-get install sysstat
Reading package lists... Done
Building dependency tree       
Reading state information... Done
sysstat is already the newest version (11.6.1-1ubuntu0.1).
0 upgraded, 0 newly installed, 0 to remove and 51 not upgraded.
root@social-85d74b896d-bmzsr:/# 
```

#### 查看所有进程的 CPU 使用情况（pidstat -u -p ALL）

```bash
root@social-85d74b896d-bmzsr:/# pidstat
Linux 4.4.237-1.el7.elrepo.x86_64 (social-85d74b896d-bmzsr)     10/13/2021      _x86_64_        (8 CPU)

05:19:53 PM   UID       PID    %usr %system  %guest   %wait    %CPU   CPU  Command
05:19:53 PM     0         7    0.09    0.06    0.00    0.00    0.15     6  java
05:19:53 PM     0      4806    0.00    0.00    0.00    0.00    0.00     5  jmap
05:19:53 PM     0      7408    0.00    0.00    0.00    0.00    0.00     2  bash
05:19:53 PM     0     29258    0.00    0.00    0.00    0.00    0.00     6  bash
05:19:53 PM     0     29787    0.00    0.00    0.00    0.00    0.00     3  top
05:19:53 PM     0     30124    0.00    0.00    0.00    0.00    0.00     4  bash
```

#### cpu使用情况统计(-u)

```bash
pidstat -u
```

#### 内存使用情况统计(-r)

```bash
pidstat -r
```

#### 显示各个进程的IO使用情况（-d）

```bash
pidstat -d
```

```bash
root@social-85d74b896d-bmzsr:/# pidstat -d
Linux 4.4.237-1.el7.elrepo.x86_64 (social-85d74b896d-bmzsr)     10/13/2021      _x86_64_        (8 CPU)

05:27:23 PM   UID       PID   kB_rd/s   kB_wr/s kB_ccwr/s iodelay  Command
05:27:23 PM     0         7      0.00      5.41      0.00       0  java
05:27:23 PM     0      4736      0.00      0.00      0.00       0  bash
05:27:23 PM     0      4806      0.00      0.00      0.00       0  jmap
05:27:23 PM     0      4807      0.00      0.00      0.00       2  more
05:27:23 PM     0      7408      0.00      0.00      0.00       0  bash
05:27:23 PM     0     29787      0.00      0.00      0.00       0  top
05:27:23 PM     0     30124      0.00      0.00      0.00       0  bash
05:27:23 PM     0     30575      0.01      0.00      0.00       0  bash
```

- IO现实说明
  - **PID** :进程id
  - **kB_rd/s** :每秒从磁盘读取的KB
  - **kB_wr/s** :每秒写入磁盘KB
  - **kB_ccwr/s** :任务取消的写入磁盘的KB。当任务截断脏的pagecache的时候会发生。
  - **Command** :task的命令名

#### 显示选择任务的线程的统计信息外的额外信息 (-t)

```bash
pidstat -t -p 7
```

```bash
root@social-85d74b896d-bmzsr:/# pidstat -t -p 7
Linux 4.4.237-1.el7.elrepo.x86_64 (social-85d74b896d-bmzsr)     10/13/2021      _x86_64_        (8 CPU)

05:32:56 PM   UID      TGID       TID    %usr %system  %guest   %wait    %CPU   CPU  Command
05:32:56 PM     0         7         -    0.09    0.06    0.00    0.00    0.15     6  java
05:32:56 PM     0         -         7    0.00    0.00    0.00    0.00    0.00     6  |__java
05:32:56 PM     0         -         8    0.00    0.00    0.00    0.00    0.00     4  |__java
05:32:56 PM     0         -         9    0.00    0.00    0.00    0.00    0.00     2  |__VM Thread
05:32:56 PM     0         -        10    0.00    0.00    0.00    0.00    0.00     0  |__Reference Handl
05:32:56 PM     0         -        11    0.00    0.00    0.00    0.00    0.00     5  |__Finalizer
05:32:56 PM     0         -        17    0.00    0.00    0.00    0.00    0.00     7  |__Signal Dispatch
05:32:56 PM     0         -        18    0.00    0.00    0.00    0.00    0.00     4  |__C2 CompilerThre
05:32:56 PM     0         -        19    0.00    0.00    0.00    0.00    0.00     7  |__C1 CompilerThre
05:32:56 PM     0         -        21    0.00    0.00    0.00    0.00    0.00     2  |__Service Thread
05:32:56 PM     0         -        22    0.00    0.00    0.00    0.02    0.00     3  |__VM Periodic Tas
05:32:56 PM     0         -        33    0.00    0.00    0.00    0.00    0.00     0  |__Timer-0
05:32:56 PM     0         -        34    0.00    0.00    0.00    0.00    0.00     7  |__com.alibaba.nac
05:32:56 PM     0         -        35    0.01    0.01    0.00    0.06    0.01     1  |__com.alibaba.nac
05:32:56 PM     0         -        41    0.00    0.00    0.00    0.02    0.01     4  |__logback-appende
05:32:56 PM     0         -        42    0.00    0.00    0.00    0.00    0.00     1  |__logback-appende
05:32:56 PM     0         -        43    0.00    0.00    0.00    0.00    0.00     4  |__logback-appende
05:32:56 PM     0         -        45    0.00    0.00    0.00    0.00    0.00     6  |__GC Daemon
05:32:56 PM     0         -        48    0.00    0.00    0.00    0.00    0.00     2  |__spring.cloud.in
05:32:56 PM     0         -        49    0.00    0.00    0.00    0.00    0.00     7  |__com.alibaba.nac
05:32:56 PM     0         -        50    0.00    0.00    0.00    0.00    0.00     6  |__com.alibaba.nac
05:32:56 PM     0         -        51    0.00    0.00    0.00    0.00    0.00     7  |__com.alibaba.nac
05:32:56 PM     0         -        52    0.00    0.00    0.00    0.00    0.00     6  |__com.alibaba.nac
05:32:56 PM     0         -        53    0.00    0.00    0.00    0.00    0.00     6  |__com.alibaba.nac
05:32:56 PM     0         -        54    0.00    0.00    0.00    0.00    0.00     7  |__Thread-22
05:32:56 PM     0         -        55    0.00    0.00    0.00    0.01    0.00     0  |__SimplePauseDete
05:32:56 PM     0         -        57    0.00    0.00    0.00    0.00    0.00     5  |__commons-pool-ev
05:32:56 PM     0         -        58    0.00    0.00    0.00    0.00    0.00     6  |__Abandoned conne
05:32:56 PM     0         -        59    0.00    0.00    0.00    0.00    0.00     4  |__DatebookHikariC
05:32:56 PM     0         -        60    0.00    0.00    0.00    0.00    0.00     6  |__DatebookHikariC
05:32:56 PM     0         -        63    0.00    0.00    0.00    0.00    0.00     3  |__RxIoScheduler-1
05:32:56 PM     0         -        64    0.00    0.00    0.00    0.00    0.00     5  |__ContainerBackgr
05:32:56 PM     0         -        65    0.00    0.00    0.00    0.00    0.00     5  |__container-0
05:32:56 PM     0         -        66    0.00    0.00    0.00    0.00    0.00     1  |__FeignApacheHttp
05:32:56 PM     0         -        67    0.00    0.00    0.00    0.00    0.00     2  |__redisson-netty-
```

- **TGID**:主线程的表示
- **TID**:线程id
- **%usr**：进程在用户空间占用cpu的百分比
- **%system**：进程在内核空间占用cpu的百分比
- **%guest**：进程在虚拟机占用cpu的百分比
- **%CPU**：进程占用cpu的百分比
- **Command**：当前进程对应的命令


## 使用 pidstat 工具查询Java项目cpu占用情况

```bash
➜  ~ ps -ef|grep java     

##   其中 187857 就是java项目进程
                   
root  187857  185541 99 Oct12 ?  1-03:33:08 /opt/jdk1.8.0_301/bin/java -Xms256m -Xmx256m -Dspring.profiles.active=dev -Dserver.port=9899 -jar /opt/webApp/feetoms1/target/feet-oms-0.0.1-SNAPSHOT.jar
```

```bash
## -p 指定进程号
## 15539 即进程号 紧跟 -p后面
## -t 展示进程下的线程资源占用情况
## 1 每秒刷新1次
## 1 共刷新一次

~ pidstat -p 187857 -t -d 1 1
Linux 5.10.23-5.al8.x86_64 (iZ8vb11w0foe0ne254sjbhZ)    10/13/2021      _x86_64_        (2 CPU)

## 通过查询出的信息可以检测到 线程号：187915   占用了很大的磁盘IO

06:39:15 PM   UID      TGID       TID   kB_rd/s   kB_wr/s kB_ccwr/s iodelay  Command
06:39:16 PM     0    187857         -      0.00    592.00      0.00       0  java
06:39:16 PM     0         -    187857      0.00      0.00      0.00       0  |__java
06:39:16 PM     0         -    187858      0.00      0.00      0.00       0  |__java
06:39:16 PM     0         -    187859      0.00      0.00      0.00       0  |__java
06:39:16 PM     0         -    187860      0.00      0.00      0.00       0  |__java
06:39:16 PM     0         -    187861      0.00      0.00      0.00       0  |__java
06:39:16 PM     0         -    187862      0.00      0.00      0.00       0  |__java
06:39:16 PM     0         -    187863      0.00      0.00      0.00       0  |__java
06:39:16 PM     0         -    187864      0.00      0.00      0.00       0  |__java
06:39:16 PM     0         -    187865      0.00      0.00      0.00       0  |__java
06:39:16 PM     0         -    187866      0.00      0.00      0.00       0  |__java
06:39:16 PM     0         -    187867      0.00      0.00      0.00       0  |__java
06:39:16 PM     0         -    187868      0.00      0.00      0.00       0  |__java
06:39:16 PM     0         -    187884      0.00      0.00      0.00       0  |__java
06:39:16 PM     0         -    187885      0.00      0.00      0.00       0  |__java
06:39:16 PM     0         -    187886      0.00      0.00      0.00       0  |__java
06:39:16 PM     0         -    187887      0.00      0.00      0.00       0  |__java
06:39:16 PM     0         -    187888      0.00      0.00      0.00       0  |__java
06:39:16 PM     0         -    187889      0.00      0.00      0.00       0  |__java
06:39:16 PM     0         -    187896      0.00      0.00      0.00       0  |__java
06:39:16 PM     0         -    187897      0.00      0.00      0.00       0  |__java
06:39:16 PM     0         -    187898      0.00      0.00      0.00       0  |__java
06:39:16 PM     0         -    187900      0.00      0.00      0.00       0  |__java
06:39:16 PM     0         -    187901      0.00      0.00      0.00       0  |__java
06:39:16 PM     0         -    187902      0.00      0.00      0.00       0  |__java
06:39:16 PM     0         -    187903      0.00      0.00      0.00       0  |__java
06:39:16 PM     0         -    187904      0.00      0.00      0.00       0  |__java
06:39:16 PM     0         -    187905      0.00      0.00      0.00       0  |__java
06:39:16 PM     0         -    187906      0.00      0.00      0.00       0  |__java
06:39:16 PM     0         -    187907      0.00      0.00      0.00       0  |__java
06:39:16 PM     0         -    187908      0.00      0.00      0.00       0  |__java
06:39:16 PM     0         -    187909      0.00      0.00      0.00       0  |__java
06:39:16 PM     0         -    187910      0.00      0.00      0.00       0  |__java
06:39:16 PM     0         -    187911      0.00      0.00      0.00       0  |__java
06:39:16 PM     0         -    187912      0.00      0.00      0.00       0  |__java
06:39:16 PM     0         -    187913      0.00      0.00      0.00       0  |__java
06:39:16 PM     0         -    187914      0.00      0.00      0.00       0  |__java
06:39:16 PM     0         -    187915      0.00    592.00      0.00       0  |__java
06:39:16 PM     0         -    187916      0.00      0.00      0.00       0  |__java
06:39:16 PM     0         -    187917      0.00      0.00      0.00       0  |__java
06:39:16 PM     0         -    187918      0.00      0.00      0.00       0  |__java
06:39:16 PM     0         -    187954      0.00      0.00      0.00       0  |__java
06:39:16 PM     0         -    187960      0.00      0.00      0.00       0  |__java
06:39:16 PM     0         -    187961      0.00      0.00      0.00       0  |__java
06:39:16 PM     0         -    187962      0.00      0.00      0.00       0  |__java
06:39:16 PM     0         -    187963      0.00      0.00      0.00       0  |__java
06:39:16 PM     0         -    187964      0.00      0.00      0.00       0  |__java
```

## 使用jstack工具打印堆栈信息

> **jstack**主要用来查看某个Java进程内的线程堆栈信息。 jstack可以定位到线程堆栈，根据堆栈信息我们可以定位到具体代码，所以它在JVM性能调优中使用得非常多.也可以利用该命令打印java线程的堆栈跟踪，可以得知哪些线程被阻塞或正等待，以便于查找如线程死锁等原因

```bash
➜  ~ ps -ef|grep java     

##   其中 187857 就是java项目进程
root      187857  185541 99 Oct12 ?        1-03:35:53 /opt/jdk1.8.0_301/bin/java -Xms256m -Xmx256m -Dspring.profiles.active=dev -Dserver.port=9899 -jar /opt/webApp/feetoms1/target/feet-oms-0.0.1-SNAPSHOT.jar
```

## 根据线程ID(187915)，在jstack查询对应的堆栈信息

- kB_wr/s 就是各个Java线程当时的写入磁盘KB，上面我们已经看到写入磁盘KB最大线程是**187915**

```bash
## 注意 此处根据 pidstat获取的线程号是 十进制。但是 jstack打印的堆栈信息中的nid是十六进制，因此需要做一层进制转换，187915转十六进制为2de0b

➜  ~ printf "%x\n" 187915
2de0b
```

- 可以使用jstack来输出进程187857的堆栈信息，然后根据线程ID的十六进制值grep，如下：

```bash
➜  ~ jstack 187857 | grep 2de0b -A10
"Thread-6" #38 prio=5 os_prio=0 tid=0x00007efe94f12000 nid=0x2de0b runnable [0x00007efe5d0be000]
   java.lang.Thread.State: RUNNABLE
        at java.io.FileInputStream.read0(Native Method)
        at java.io.FileInputStream.read(FileInputStream.java:207)
        at com.crm.oms.component.FullIOTask.run(FullIOTask.java:24)
        at java.lang.Thread.run(Thread.java:748)

"http-nio-9899-Acceptor-0" #36 daemon prio=5 os_prio=0 tid=0x00007efe9436f800 nid=0x2de0a runnable [0x00007efe5d1bf000]
   java.lang.Thread.State: RUNNABLE
        at sun.nio.ch.ServerSocketChannelImpl.accept0(Native Method)
        at sun.nio.ch.ServerSocketChannelImpl.accept(ServerSocketChannelImpl.java:424)
```

- 可以看磁盘IO量最大的在FullIOTask这类下面的run()方法，那我现在找下我写的demo定位到下面的代码

```java
package com.crm.oms.component;

import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.IOException;

/**
 * IO 操作频繁的任务
 *
 * @author lfg
 * @version 1.0
 */
public class FullIOTask implements Runnable {
    @Override
    public void run() {


        while (true) {
            try {
                FileOutputStream fileOutputStream = new FileOutputStream("tempFile.txt");
                for (int i = 0; i < 10000; i++) {
                    fileOutputStream.write(i);
                }
                fileOutputStream.close();

                FileInputStream fileInputStream = new FileInputStream("tempFile.txt");
                while (fileInputStream.read() != -1) {

                }

            } catch (IOException e) {
                e.printStackTrace();
            }
        }
    }
}
```

- 结论:从上面线程的堆栈信息我们可以看到当前这个线程是出于运行状态的，频繁的文件流读取关闭，导致服务器内磁盘IO频繁

## 利用jstack拷贝当前进程下进程的堆栈信息

```bash
## 187857 进程号 
## > jstack.text 将堆栈信息打到 当前目录下的jstack.text文件中
➜  ~ jstack 187857 > jstack.text  
2de0b
```

## Jstack扩展 当前tomcat线程状态的种类

### **线程状态为“waiting on condition”**

- java.lang.Thread.State: WAITING (parking)：一直等那个条件发生；
- java.lang.Thread.State: TIMED_WAITING (parking或sleeping)：定时的，那个条件不到来，也将定时唤醒自己

>如果大量线程在“waiting on condition”：
可能是它们又跑去获取第三方资源，尤其是第三方网络资源，迟迟获取不到Response，导致大量线程进入等待状态。
所以如果发现有大量的线程都处在 Wait on condition，从线程堆栈看，正等待网络读写，这可能是一个网络瓶颈的征兆，因为网络阻塞导致线程无法执行。

### **线程状态为“waiting for monitor entry”**

- java.lang.Thread.State: BLOCKED (on object monitor) : 意味着它 在等待进入一个临界区 ，所以它在”Entry Set“队列中等待。此时线程状态一般都是 Blocked
  
> 如果大量线程在“waiting for monitor entry”,可能是一个全局锁阻塞住了大量线程. rwaiting for monitor entry 的线程越来越多，没有减少的趋势，可能意味着某些线程在临界区里呆的时间太长了，以至于越来越多新线程迟迟无法进入临界区。

## 实例操作说明

```bash
➜  ~ cat jstack.text |grep 'java.lang.Thread.State' |grep 'parking'
   java.lang.Thread.State: WAITING (parking)
   java.lang.Thread.State: WAITING (parking)
   java.lang.Thread.State: WAITING (parking)
   java.lang.Thread.State: WAITING (parking)
   java.lang.Thread.State: WAITING (parking)
   java.lang.Thread.State: WAITING (parking)
   java.lang.Thread.State: WAITING (parking)
   java.lang.Thread.State: WAITING (parking)
   java.lang.Thread.State: WAITING (parking)
   java.lang.Thread.State: WAITING (parking)
   java.lang.Thread.State: WAITING (parking)
   java.lang.Thread.State: WAITING (parking)
   java.lang.Thread.State: WAITING (parking)
   java.lang.Thread.State: WAITING (parking)
   java.lang.Thread.State: WAITING (parking)
   java.lang.Thread.State: TIMED_WAITING (parking)
   java.lang.Thread.State: TIMED_WAITING (parking)
   java.lang.Thread.State: WAITING (parking)
   java.lang.Thread.State: TIMED_WAITING (parking)
   java.lang.Thread.State: WAITING (parking)
   java.lang.Thread.State: WAITING (parking)
```

### 统计当前jstack快照下 线程的状态


```bash
➜  ~ cat jstack.text |grep 'java.lang.Thread.State' |grep 'parking'|wc -l

21
```

## 社保服务磁盘IO过高原因

> 由于**运维权限原因**，目前只有beta环境进行参考。

```bash

root@social-85d74b896d-bmzsr:/# ps -ef|grep java
root         1     0  0 Sep24 ?        00:00:00 sh -c java  $JAVA_OPTS  -jar *.jar
root         7     1  1 Sep24 ?        06:47:33 java -Xms2048m -Xmx2048m -XX:+HeapDumpOnOutOfMemoryError -XX:HeapDumpPath=/logs -jar smarthr-social-app-1.0.0-SNAPSHOT.jar
root     14961 14842  0 10:59 pts/12   00:00:00 grep --color=auto java

root@social-85d74b896d-bmzsr:/# pidstat -p 7 -t -d 1 3
Linux 4.4.237-1.el7.elrepo.x86_64 (social-85d74b896d-bmzsr)     10/14/2021      _x86_64_        (8 CPU)

10:55:21 AM   UID      TGID       TID   kB_rd/s   kB_wr/s kB_ccwr/s iodelay  Command
10:55:22 AM     0         7         -      0.00     44.00      0.00       0  java
10:55:22 AM     0         -       135      0.00     12.00      0.00       1  |__xxl-job, execut
10:55:22 AM     0         -       169      0.00      8.00      0.00       1  |__Thread-35
10:55:22 AM     0         -       170      0.00      8.00      0.00       1  |__Thread-36
10:55:22 AM     0         -       171      0.00      8.00      0.00       0  |__Thread-37
```

- 执行pidstat -p 7 -t -d 1 3  但是  jstack 7 > jstack.text相关读写的操作没有权限进行没有反应，因此只能初步判定为xxl-job执行频率过高和线程池使用不规范（ps:处于队列带执行的线程过多）导致服务器磁盘IO一直处于比较高的状态。