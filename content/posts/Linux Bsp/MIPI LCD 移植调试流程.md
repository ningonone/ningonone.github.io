---
title: "MIPI LCD 移植调试流程"
date: 2023-02-01T18:00:28+08:00
draft: false
categories: 
- Linux-Bsp
tags: 
- MIPI
- Display
---


## 一、提取 datasheet 中的关键信息

首先需要找屏厂索取屏的规格书，提取出关键的信息。

Spec的目录大概如下：

{{< figure src="/images/blog/image-20230201160931-16dmycr.png" title="" >}}​​​

我们重点关注的是：

**General Specification ​**屏幕规格

**Power on/off sequence** 上电下电时序

**Timing** 屏参

‍

### 1.**General Specification ​**

主要找到分辨率、Mipi data 信号线通道数(一般是4 lane)，如果有RGB Bit 位数(6Bit/8Bit)、驱动IC的型号(Driver IC),也可将信息提取出来。

‍

### 2.**Power on/off sequence**

{{< figure src="/images/blog/image-20230201161650-vztdce3.png" title="" >}}​​

如果屏幕点不亮就需要首先看上电下电的时序。

‍

### 3.**Timing**

{{< figure src="/images/blog/image-20230201162731-r92c2cs.png" title="" >}}​​


#### 屏参及其计算

hsync_len 和vsync_len 分别是hsync和vsync 同步信号所需要的时间  
水平分辨率：hactive  垂直分辨率：vactive  
水平前肩：hfront-porch(HFP) 垂直前肩：vfront-porch(VFP)  
水平后肩：hback-porch(HBP) 垂直后肩：vback-porch(VBP)  
水平消隐信号：hsync-len(HS) 垂直消隐信号：vsync-len(VS)

1.**lane-rate = clk(时钟频率) * RGB(3) * BIT(6或8) / lane_num** ，lane_num表示差分时钟通道数，也就是刚刚在 **General Specification**中提取的 Mipi data lane。

2.帧率、屏参和时钟频率的关系： **clock-frequency=(水平分辨率+HS+HBP+HFP)(垂直分辨率+VS+VBP=VFP)fps(帧频率)**；

原理图如下：

{{< figure src="/images/blog/image-20220817161636-gixjxz5.png" title="" >}}​
{{< figure src="/images/blog/image-20220908172036-mfov8t2.png" title="" >}}​

​

#### DE模式和HV模式

DE 模式一般需要：DE和Clock信号来确定点。比如一个800x480分辨率的panel。理论上，在DE有效信号的时候（高或底），就有一个800个clock，来确认行中800个点。每个clock有效的时候，读取一次RGB信号。因为存在（回扫信号）所以DE是个方波，当视频在会扫的时候，DE就拉底。DE一个周期，panel就扫描一行。扫描480行后，又从第一行扫描开始。（这个规律由panel的驱动IC所决定的）。

HV模式，需要行同步，和场同步。来表示扫描的行于列。提供多种接口，有利于视频信号的兼容。  
DE= data enable  
HV = horizontal vertical  
两种不同的同步方式，现在的大尺寸一般都是DE同步模式  
小尺寸的HV同步模式多.

这里面我们再进一步的展开进行说明。

1. HV模式是早期的驱动模式了，现在的液晶屏面板驱动IC基本都是支持HV和DE两种模式的。很多已经直接去掉了HV模式，仅支持DE模式，DE模式的好处就是使用比较简单方便。
2. DE模式下前肩后肩等屏参会被限定，所以调前肩后肩没有明显效果。

‍

## 二、根据屏参和硬件设计填写DTS

创建屏的`dtsi`​文件

我们只需要填写 dts ，驱动会自动解析 dts ，管脚控制部分会自动申请分配操纵 GPIO，屏初始化代码（init cmds）和屏参（timing）将被自动封装成 mipi dsi 命令进行发送。

仿造平台的其他 lcd-*-mipi.dtsi 编写 lcd-xxx-mipi.dtsi 后 需要在 主 dts 文件中包含这个 dtsi。

具体的代码和方法得看项目

可能需要修改的地方：MIPI Host(Mipi初始化配置)、disp_timings(屏参)、init cmd(初始化参数)。

初始化参数：

```gcode
GP_COMMAD_PA(02);SPI_WriteData(0x53);SPI_WriteData(0x24);
GP_COMMAD_PA(03);SPI_WriteData(0xf0);SPI_WriteData(0x5a);SPI_WriteData(0x5a); Delay_ms(30);
GP_COMMAD_PA(01);SPI_WriteData(0x11); Delay_ms(100);
GP_COMMAD_PA(01);SPI_WriteData(0x29); Delay_ms(30);
GP_COMMAD_PA(04);SPI_WriteData(0xc3);SPI_WriteData(0x40);SPI_WriteData(0x00);SPI_WriteData(0x28);
GP_COMMAD_PA(02);SPI_WriteData(0x50);SPI_WriteData(0x77);
GP_COMMAD_PA(02);SPI_WriteData(0xe1);SPI_WriteData(0x66);
GP_COMMAD_PA(02);SPI_WriteData(0xdc);SPI_WriteData(0x67);
GP_COMMAD_PA(02);SPI_WriteData(0xd3);SPI_WriteData(0xc8);
GP_COMMAD_PA(02);SPI_WriteData(0x50);SPI_WriteData(0x00);
GP_COMMAD_PA(02);SPI_WriteData(0xf0);SPI_WriteData(0x5a);
GP_COMMAD_PA(02);SPI_WriteData(0xf5);SPI_WriteData(0x80);
Delay(120);
```

GP_COMMAD_PA 表示 dsi packets 的个数  
SPI_WriteData 接口用来写数据  
Delay_ms 表示延时 xx 毫秒  
所以  
​`GP_COMMAD_PA(02);SPI_WriteData(0x53);SPI_WriteData(0x24);`​  
表示给屏 0x53 指令，有**一个**指令参数，为 0x24`GP_COMMAD_PA(03);SPI_WriteData(0xf0);SPI_WriteData(0x5a);SPI_WriteData(0x5a); Delay_ms(30);`​  
表示给屏 0xf0 指令，有**两个**指令参数 0x5a 和 0x5a ，并且延时 30ms  
​`GP_COMMAD_PA(01);SPI_WriteData(0x11); Delay_ms(100);`​  
表示给屏 0x11 指令，**没有**指令参数，并且延时 100ms  
​`GP_COMMAD_PA(01);SPI_WriteData(0x29); Delay_ms(30);`​  
表示给屏 0x29 指令，**没有**指令参数，并且延时 30ms

这涉及到了 dsi 协议中 dsi 传输的数
根据 《MIPI-DSI-specification.pdf》可以看到，有如下这些数据类型。

{{< figure src="/images/blog/image-20230201173759-30nzoop.png" >}}



## 三、调试流程

### 检查供电

检查原理图上各个供电管脚的电压

AVDD、VCOM、VDD、VGL、VGH是否满足电压要求。
确认电压正常后，关机，上屏，结合开机 Log 看屏部分是否正常初始化。

### 背光是否正常

背光没亮的话确认一下接上屏的时候，量一量 VDD_LCDA 的电压为多少  
没有就去检查背光电路供电电压和 backlight 相关的配置（比如背光功能使能的 GPIO 有没有控制到、PWM通道是否配置正确）。

‍

### 打印 Mipi LCD 相关 Log 信息

看看 log 中是否有异常。譬如probe 函数是否正常;  
如果是RK平台的话可以看是否有调用到 rk32_dsi_enable() 函数,该函数为 lcdc 调用 mipi 的入口函数;  
初始化 mipi 的过程中是否有报错等等

‍

### 上电时序是否正常

确认上电时序是否正常，VCC、RST、MIPI 顺序是否正常。

1. VCC 使能有没有起作用。
2. RST 是否有一个 低-高 的变化，没有则是 rst 设置的触发方式可能反了
3. 在 RST 变高后会开始传输数据，量 lanes 是否有数据输出。抓取数据需要一定规格的示波器和差分探头，我们用普通的示波器大致看看有没有数据输出就够了。

如果到这篇文章中的所有办法都用完了还没有点亮，只能来这里重新测 data 和 clk 波形是否正常。  
如果也正常,那就需要确认 mipi phy 是否把初始化命令正确发送出来。用差分探头在单端模式下抓 mipi phy 的 lane0N 和 lane0P。(这个方法我还未尝试过)  
命令也是正常的，屏依旧还没有点亮，只能进一步分析 mipi 协议了。

后续再写一个问题分析的锦集

‍
