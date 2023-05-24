---
title: "Android 硬件信息客户化配置设计"
date: 2023-05-22T13:56:58+08:00
draft: flase
categories: 
- Linux Bsp
tags: 
- Kernel
---

## 前言

Android设备的硬件信息都是可以根据上层TextView来修改的，但是通过内核源码来修改就可以骗过绝大多数的第三方设备监测APP。第三方设备信息监测APP通常是通过读取`/proc/cpuinfo`​、`/sys/devices/system/cpu/cpux`​、`/sys/devices/system/present`​、`/sys/devices/system/online`​来获取CPU数量以及频率。

以下四个是进行效果测试的APP：

{{< figure src="/images/blog/image-20230517201538-vkbai21.png" title="" >}}​​​
其中AIDA64的检测结果为：

{{< figure src="/images/blog/image-20230522105923-gd3hjnw.png" title="" >}}​​​

## 修改`/proc/cpuinfo`​​

通过`cat proc/cpuinfo`​可以获取到CPU的信息如下，有些设备监测APP就是通过读取cpuinfo的信息来获取cpu数量，我们可以通过修改cpuinfo来修改cpu的数量。

```shell
Processor       : AArch64 Processor rev 4 (aarch64)
processor       : 0
BogoMIPS        : 26.00
Features        : fp asimd evtstrm aes pmull sha1 sha2 crc32
CPU implementer : 0x41
CPU architecture: 8
CPU variant     : 0x0
CPU part        : 0xd03
CPU revision    : 4

processor       : 1
BogoMIPS        : 26.00
Features        : fp asimd evtstrm aes pmull sha1 sha2 crc32
CPU implementer : 0x41
CPU architecture: 8
CPU variant     : 0x0
CPU part        : 0xd03
CPU revision    : 4

processor       : 2
BogoMIPS        : 26.00
Features        : fp asimd evtstrm aes pmull sha1 sha2 crc32
CPU implementer : 0x41
CPU architecture: 8
CPU variant     : 0x0
CPU part        : 0xd03
CPU revision    : 4

processor       : 3
BogoMIPS        : 26.00
Features        : fp asimd evtstrm aes pmull sha1 sha2 crc32
CPU implementer : 0x41
CPU architecture: 8
CPU variant     : 0x0
CPU part        : 0xd03
CPU revision    : 4

Hardware        : AC8257V/WAB
```

cpuinfo的修改非常的简单，找到打印cpuinfo的函数，arm64架构在`kerenel/arch/arm64/kernel/cpuinfo.c`​中找到`c_show`​函数，直接修改打印输出的内容即可。

```c
static int c_show(struct seq_file *m, void *v)
{
    int i, j;
    int cpu_config;
    bool compat = personality(current->personality) == PER_LINUX32;

    /* a hint message to notify that some process reads /proc/cpuinfo */
    pr_debug("Dump cpuinfo\n"); 

    /*
     * backward-compatibility for thrid-party applications:
     * cpu_info->cpu_name is deprecated, print "AArch64 Processor" instead
     * (As the sring in arch/arm64/kernel/cputable.c for legacy kernel)
     */
    seq_printf(m, "Processor\t: AArch64 Processor rev %d (%s)\n",
            read_cpuid_id() & 15, ELF_PLATFORM);

    for_each_online_cpu(i) {
        struct cpuinfo_arm64 *cpuinfo = &per_cpu(cpu_data, i);
        u32 midr = cpuinfo->reg_midr;

        /*
         * glibc reads /proc/cpuinfo to determine the number of
         * online processors, looking for lines beginning with
         * "processor".  Give glibc what it expects.
         */
        seq_printf(m, "processor\t: %d\n", i);
        if (compat)
            seq_printf(m, "model name\t: ARMv8 Processor rev %d (%s)\n",
                   MIDR_REVISION(midr), COMPAT_ELF_PLATFORM);

        seq_printf(m, "BogoMIPS\t: %lu.%02lu\n",
               loops_per_jiffy / (500000UL/HZ),
               loops_per_jiffy / (5000UL/HZ) % 100);

        /*
         * Dump out the common processor features in a single line.
         * Userspace should read the hwcaps with getauxval(AT_HWCAP)
         * rather than attempting to parse this, but there's a body of
         * software which does already (at least for 32-bit).
         */
        seq_puts(m, "Features\t:");
        if (compat) {
#ifdef CONFIG_COMPAT
            for (j = 0; compat_hwcap_str[j]; j++)
                if (compat_elf_hwcap & (1 << j))
                    seq_printf(m, " %s", compat_hwcap_str[j]);

            for (j = 0; compat_hwcap2_str[j]; j++)
                if (compat_elf_hwcap2 & (1 << j))
                    seq_printf(m, " %s", compat_hwcap2_str[j]);
#endif /* CONFIG_COMPAT */
        } else {
            for (j = 0; hwcap_str[j]; j++)
                if (elf_hwcap & (1 << j))
                    seq_printf(m, " %s", hwcap_str[j]);
        }
        seq_puts(m, "\n");

        seq_printf(m, "CPU implementer\t: 0x%02x\n",
               MIDR_IMPLEMENTOR(midr));
        seq_printf(m, "CPU architecture: 8\n");
        seq_printf(m, "CPU variant\t: 0x%x\n", MIDR_VARIANT(midr));
        seq_printf(m, "CPU part\t: 0x%03x\n", MIDR_PARTNUM(midr));
        seq_printf(m, "CPU revision\t: %d\n\n", MIDR_REVISION(midr));
    }

    //modify cpu info to 8 core
    for_each_possible_cpu(i) {
    struct cpuinfo_arm64 *cpuinfo = &per_cpu(cpu_data, i);
    u32 midr = cpuinfo->reg_midr;
    seq_printf(m, "processor\t: %d\n", i+4);
    if (compat)
        seq_printf(m, "model name\t: ARMv8 Processor rev %d (%s)\n",
            MIDR_REVISION(midr), COMPAT_ELF_PLATFORM);

    seq_printf(m, "BogoMIPS\t: %lu.%02lu\n",
        loops_per_jiffy / (500000UL/HZ),
        loops_per_jiffy / (5000UL/HZ) % 100);
    seq_puts(m, "Features\t:");
    if (compat) {
#ifdef CONFIG_COMPAT
        for (j = 0; compat_hwcap_str[j]; j++)
            if (compat_elf_hwcap & (1 << j))
                seq_printf(m, " %s", compat_hwcap_str[j]);

        for (j = 0; compat_hwcap2_str[j]; j++)
            if (compat_elf_hwcap2 & (1 << j))
                seq_printf(m, " %s", compat_hwcap2_str[j]);
#endif /* CONFIG_COMPAT */
    } else {
        for (j = 0; hwcap_str[j]; j++)
            if (elf_hwcap & (1 << j))
                seq_printf(m, " %s", hwcap_str[j]);
    }
    seq_puts(m, "\n");

    seq_printf(m, "CPU implementer\t: 0x%02x\n",
        MIDR_IMPLEMENTOR(midr));
    seq_printf(m, "CPU architecture: 8\n");
    seq_printf(m, "CPU variant\t: 0x%x\n", MIDR_VARIANT(midr));
    seq_printf(m, "CPU part\t: 0x%03x\n", MIDR_PARTNUM(midr));
    seq_printf(m, "CPU revision\t: %d\n\n", MIDR_REVISION(midr));
}

    seq_printf(m, "Hardware\t: %s\n", machine_desc_str);


    return 0;
}
```

arm架构的cpuinfo打印函数可以在`kerenel/arch/arm64/kernel/setup.c`​中找到类似的`c_show`​函数，同理地直接修改打印输出的内容即可，最后得到的效果为如下所示。
```shell
Processor       : AArch64 Processor rev 4 (aarch64)
processor       : 0
BogoMIPS        : 26.00
Features        : fp asimd evtstrm aes pmull sha1 sha2 crc32
CPU implementer : 0x41
CPU architecture: 8
CPU variant     : 0x0
CPU part        : 0xd03
CPU revision    : 4

processor       : 1
BogoMIPS        : 26.00
Features        : fp asimd evtstrm aes pmull sha1 sha2 crc32
CPU implementer : 0x41
CPU architecture: 8
CPU variant     : 0x0
CPU part        : 0xd03
CPU revision    : 4

processor       : 2
BogoMIPS        : 26.00
Features        : fp asimd evtstrm aes pmull sha1 sha2 crc32
CPU implementer : 0x41
CPU architecture: 8
CPU variant     : 0x0
CPU part        : 0xd03
CPU revision    : 4

processor       : 3
BogoMIPS        : 26.00
Features        : fp asimd evtstrm aes pmull sha1 sha2 crc32
CPU implementer : 0x41
CPU architecture: 8
CPU variant     : 0x0
CPU part        : 0xd03
CPU revision    : 4

processor       : 4
BogoMIPS        : 26.00
Features        : fp asimd evtstrm aes pmull sha1 sha2 crc32
CPU implementer : 0x41
CPU architecture: 8
CPU variant     : 0x0
CPU part        : 0xd03
CPU revision    : 4

processor       : 5
BogoMIPS        : 26.00
Features        : fp asimd evtstrm aes pmull sha1 sha2 crc32
CPU implementer : 0x41
CPU architecture: 8
CPU variant     : 0x0
CPU part        : 0xd03
CPU revision    : 4

processor       : 6
BogoMIPS        : 26.00
Features        : fp asimd evtstrm aes pmull sha1 sha2 crc32
CPU implementer : 0x41
CPU architecture: 8
CPU variant     : 0x0
CPU part        : 0xd03
CPU revision    : 4
Hardware        : AC8257V/WAB

processor       : 7
BogoMIPS        : 26.00
Features        : fp asimd evtstrm aes pmull sha1 sha2 crc32
CPU implementer : 0x41
CPU architecture: 8
CPU variant     : 0x0
CPU part        : 0xd03
CPU revision    : 4
```


## 修改cpu.c

通过指令`ls /sys/devices/system/cpu -l`​我们可以得到cpuX的数量以及CPU在线离线、当前可用CPU、CPU频率等信息如下：

```c
drwxr-xr-x 7 root root    0 2010-01-01 08:00 cpu0
drwxr-xr-x 7 root root    0 2010-01-01 08:00 cpu1
drwxr-xr-x 7 root root    0 2010-01-01 08:00 cpu2
drwxr-xr-x 7 root root    0 2010-01-01 08:00 cpu3
drwxr-xr-x 3 root root    0 2010-01-01 08:00 cpufreq
drwxr-xr-x 2 root root    0 2010-01-01 08:00 cpuidle
drwxr-xr-x 2 root root    0 2010-01-01 08:00 cputopo
drwxr-xr-x 2 root root    0 2010-01-01 08:00 eas
drwxr-xr-x 2 root root    0 2010-01-01 08:00 hotplug
-r--r--r-- 1 root root 4096 2023-03-29 20:41 isolated
-r--r--r-- 1 root root 4096 2023-03-29 20:41 kernel_max
-r--r--r-- 1 root root 4096 2023-03-29 20:41 modalias
-r--r--r-- 1 root root 4096 2023-03-29 20:41 offline
-r--r--r-- 1 root root 4096 2010-01-01 08:00 online
-r--r--r-- 1 root root 4096 2010-01-01 08:00 possible
drwxr-xr-x 2 root root    0 2010-01-01 08:00 power
-r--r--r-- 1 root root 4096 2023-03-29 20:41 present
drwxr-xr-x 2 root root    0 2010-01-01 08:00 rq-stats
drwxr-xr-x 2 root root    0 2010-01-01 08:00 sched
-r--r--r-- 1 root root 4096 2023-03-29 20:41 sched_isolated
-rw-r--r-- 1 root root 4096 2010-01-01 08:00 uevent
```

CPUX的修改可以通过注册一个类似`register_cpu`​函数来注册虚假的CPU，通过符号链接的方式链接到CPU0，代码如下:

```c
static DEFINE_PER_CPU(struct cpu, cpu_devices_fake);

int register_cpu_fake(struct cpu *cpu, int num, int  cpu_real_count)
{
    int error;
    int cpu_num = cpu_real_count;

    cpu->node_id = cpu_to_node(num);
    memset(&cpu->dev, 0x00, sizeof(struct device));
    cpu->dev.id = num;
    cpu->dev.bus = &cpu_subsys;
    cpu->dev.release = cpu_device_release;
    cpu->dev.offline_disabled = !cpu->hotpluggable;
    cpu->dev.offline = !cpu_online(num);
    cpu->dev.of_node = of_get_cpu_node(num, NULL);
#ifdef CONFIG_GENERIC_CPU_AUTOPROBE
    cpu->dev.bus->uevent = cpu_uevent;
#endif
    cpu->dev.groups = common_cpu_attr_groups;
    if (cpu->hotpluggable)
        cpu->dev.groups = hotplugable_cpu_attr_groups;
    error = device_register(&cpu->dev);
    if (error)
        return error;

    per_cpu(cpu_sys_devices, num) = &cpu->dev;
    register_cpu_under_node(num, cpu_to_node(num));

    if(cpu_num < 8){
        for(;cpu_num < 8;cpu_num++){
            int ret;
            char buf[16];
            sprintf(buf,"cpu%d",cpu_num);
            ret = sysfs_create_link(&cpu_subsys.dev_root->kobj, &cpu->dev.kobj, buf);
        }
    }
    return 0;
}
```

当然，同时需要在`cpu_dev_init`​初始化函数中进行调用该`register_cpu_fake`​函数。

```c
void __init cpu_dev_init(void)
{
    int i;
    int cpu_real_count = 0;

    if (subsys_system_register(&cpu_subsys, cpu_root_attr_groups))
        panic("Failed to register CPU subsystem");

    cpu_dev_register_generic();
    cpu_notifier(device_hotplug_notifier, 0);

    for_each_possible_cpu(i) {
    cpu_real_count++;
    }
    register_cpu_fake(&per_cpu(cpu_devices_fake, 0), 0,cpu_real_count);
}
```

效果如下：

```shell
drwxr-xr-x 7 root root    0 2010-01-01 08:00 cpu0
drwxr-xr-x 7 root root    0 2010-01-01 08:00 cpu1
drwxr-xr-x 7 root root    0 2010-01-01 08:00 cpu2
drwxr-xr-x 7 root root    0 2010-01-01 08:00 cpu3
lrwxrwxrwx 1 root root    0 2023-03-29 21:35 cpu4 -> cpu0
lrwxrwxrwx 1 root root    0 2023-03-29 21:35 cpu5 -> cpu0
lrwxrwxrwx 1 root root    0 2023-03-29 21:35 cpu6 -> cpu0
lrwxrwxrwx 1 root root    0 2023-03-29 21:35 cpu7 -> cpu0
drwxr-xr-x 3 root root    0 2010-01-01 08:00 cpufreq
drwxr-xr-x 2 root root    0 2010-01-01 08:00 cpuidle
drwxr-xr-x 2 root root    0 2010-01-01 08:00 cputopo
drwxr-xr-x 2 root root    0 2010-01-01 08:00 eas
drwxr-xr-x 2 root root    0 2010-01-01 08:00 hotplug
-r--r--r-- 1 root root 4096 2023-03-29 21:35 isolated
-r--r--r-- 1 root root 4096 2023-03-29 21:35 kernel_max
-r--r--r-- 1 root root 4096 2023-03-29 21:35 modalias
-r--r--r-- 1 root root 4096 2023-03-29 21:35 offline
-r--r--r-- 1 root root 4096 2010-01-01 08:00 online
-r--r--r-- 1 root root 4096 2010-01-01 08:00 possible
drwxr-xr-x 2 root root    0 2010-01-01 08:00 power
-r--r--r-- 1 root root 4096 2023-03-29 21:35 present
drwxr-xr-x 2 root root    0 2010-01-01 08:00 rq-stats
drwxr-xr-x 2 root root    0 2010-01-01 08:00 sched
-r--r--r-- 1 root root 4096 2023-03-29 21:35 sched_isolated
-rw-r--r-- 1 root root 4096 2010-01-01 08:00 uevent
```

## 修改present&online

有些设备信息监测APP读取CPU数量是通过`cat /sys/devices/system/present`​以及`cat /sys/devices/system/online`​来获取CPU核心数：

```shell
demo:/ $ cat /sys/devices/system/cpu/online
0-3
demo:/ $ cat /sys/devices/system/cpu/present
0-3
```

我们可以在cpu.c中找到`show_cpus_attr`​函数，该函数是用来打印cpu online, possible, present, 和 system maps等信息的。我们可以如法炮制，直接将输出写死就好了。

```c
static ssize_t show_cpus_attr(struct device *dev,
                  struct device_attribute *attr,
                  char *buf)
{
    //struct cpu_attr *ca = container_of(attr, struct cpu_attr, attr);
    //int n = cpulist_scnprintf(buf, PAGE_SIZE-2, *(ca->map));
    int n = sprintf(buf, "0-7\n");
    return n;

    //buf[n++] = '\n';
    //buf[n] = '\0';
    //return n;
}
```

效果如下：

```shell
demo:/ $ cat /sys/devices/system/cpu/online
0-7
demo:/ $ cat /sys/devices/system/cpu/present
0-7
```

## 最终效果

通过修改CPU信息的相关代码我们成功骗过了第三方的设备检测APP，同样的，其他三个APP也变成了8核，这里就不一一展示。

​{{< figure src="/images/blog/image-20230522112130-4joz3ny.png" title="" >}}